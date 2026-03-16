require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // НОВОЕ: для проверки токенов
const User = require('./models/User'); // НОВОЕ: для запроса друзей из БД

const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);

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

    // --- ОБРАБОТКА КООРДИНАТ (РАДАР) ---
    socket.on('sendLocation', (location) => {
        if (activeUsers[socket.user.id]) {
            activeUsers[socket.user.id].location = location;
        }

        // Собираем тех, кого должен видеть текущий пользователь на своей карте
        const myRadar = Object.values(activeUsers).filter(u => friendsList.includes(u.id) && u.location);
        socket.emit('updateLocations', myRadar);

        // Рассылаем наши новые координаты ТОЛЬКО тем друзьям, кто сейчас онлайн
        friendsList.forEach(friendId => {
            if (activeUsers[friendId]) {
                const friendOfFriendList = activeUsers[friendId].friends;
                const hisRadar = Object.values(activeUsers).filter(u => friendOfFriendList.includes(u.id) && u.location);
                // Отправляем в личную комнату друга
                socket.to(friendId).emit('updateLocations', hisRadar);
            }
        });
    });

    // --- ОБРАБОТКА ЧАТА ---
    socket.on('sendMessage', (data) => {
        // data содержит { receiverId, text }
        // Отправляем сообщение строго в личную комнату получателя
        socket.to(data.receiverId).emit('receiveMessage', {
            senderId: socket.user.id,
            text: data.text,
            timestamp: new Date()
        });
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