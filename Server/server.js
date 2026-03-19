const messagesRoutes = require('./routes/messages');
const Message = require('./models/Message'); // Модель базы данных
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // НОВОЕ: для проверки токенов
const User = require('./models/User'); // НОВОЕ: для запроса друзей из БД

// --- КИБЕРБЕЗОПАСНОСТЬ: Подключаем новые модули ---
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const placesRoutes = require('./routes/places'); // НОВОЕ: Маршруты для Мест

const app = express();
const server = http.createServer(app);

// КИБЕРБЕЗОПАСНОСТЬ: Базовые заголовки безопасности
app.use(helmet()); 
// Разрешаем картинкам грузиться для карт Leaflet и OSM (иначе helmet их заблокирует)
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use(cors({ origin: 'http://localhost:3000' }));
app.use('/api/messages', messagesRoutes);
app.use(express.json());

// КИБЕРБЕЗОПАСНОСТЬ: Защита базы данных от NoSQL инъекций
app.use(mongoSanitize());

// КИБЕРБЕЗОПАСНОСТЬ: Лимит запросов на авторизацию (защита от брутфорса)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 20, // Ограничиваем до 20 запросов с одного IP
    message: { error: 'Слишком много попыток входа, пожалуйста, попробуйте позже.' }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/places', placesRoutes); // НОВОЕ: Подключаем роуты для мест

const io = new Server(server, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

// --- КИБЕРБЕЗОПАСНОСТЬ: Проверка токена на входе (Middleware для сокетов) ---
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Отказано в доступе. Нет токена.'));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // Цепляем ID пользователя к его сокету
        next();
    } catch (err) {
        next(new Error('Недействительный токен.'));
    }
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Успешно подключились к MongoDB!'))
    .catch((err) => console.error('Ошибка подключения к БД:', err));

// Оперативная память сервера для координат и списков друзей
let activeUsers = {};

io.on('connection', async (socket) => {
    console.log(`🟢 Подключился: ${socket.user.username}`);

    // 1. Создаем личную защищенную "комнату" для пользователя
    socket.join(socket.user.id);

    // 2. Загружаем из БД его список друзей один раз при подключении
    const userDoc = await User.findById(socket.user.id);
    const friendsList = userDoc ? userDoc.friends.map(id => id.toString()) : [];

    // 3. Сохраняем пользователя в оперативную память
activeUsers[socket.user.id] = {
    id: socket.user.id,
    username: socket.user.username,
    location: null,
    friends: friendsList
  };

  // [ИСПРАВЛЕНИЕ КАРТЫ]: Моментально отправляем новичку координаты его друзей, которые УЖЕ онлайн и стоят на карте
  const myRadar = Object.values(activeUsers).filter(u => friendsList.includes(u.id) && u.location);
  socket.emit('updateLocations', myRadar);

  // --- ОБРАБОТКА КООРДИНАТ (РАДАР) ---
  socket.on('sendLocation', (location) => {
    if (activeUsers[socket.user.id]) {
      activeUsers[socket.user.id].location = location;
    }
    const myRadar = Object.values(activeUsers).filter(u => friendsList.includes(u.id) && u.location);
    socket.emit('updateLocations', myRadar);

    friendsList.forEach(friendId => {
      if (activeUsers[friendId]) {
        const friendOfFriendList = activeUsers[friendId].friends;
        const hisRadar = Object.values(activeUsers).filter(u => friendOfFriendList.includes(u.id) && u.location);
        socket.to(friendId).emit('updateLocations', hisRadar);
      }
    });
  });

  // --- ОБРАБОТКА ЧАТА ---
  socket.on('sendMessage', async (data) => {
    try {
      // 1. Сохраняем сообщение навсегда в базу данных (MongoDB)
      const newMsg = new Message({
        sender: socket.user.id,
        receiver: data.receiverId,
        text: data.text
      });
      await newMsg.save();

      // 2. Отправляем сообщение получателю в реальном времени
      socket.to(data.receiverId).emit('receiveMessage', {
        senderId: socket.user.id,
        senderName: socket.user.username,
        text: data.text,
        timestamp: newMsg.timestamp
      });
    } catch (err) {
      console.error("Ошибка сохранения сообщения:", err);
    }
  });

    // --- ОТКЛЮЧЕНИЕ ---
    socket.on('disconnect', () => {
        console.log(`🔴 Отключился: ${socket.user.username}`);
        delete activeUsers[socket.user.id];
        // Здесь можно было бы еще разослать друзьям событие, что мы ушли в оффлайн,
        // но при следующем их шаге функция фильтрации сама уберет нас с их карты.
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});