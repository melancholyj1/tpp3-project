require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use('/api/auth', authRoutes);

const io = new Server(server, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Успешно подключились к MongoDB!'))
    .catch((err) => console.error('Ошибка подключения к БД:', err));

// Создаем "кэш" в оперативной памяти для хранения текущих координат
let activeUsers = {};

io.on('connection', (socket) => {
    console.log(`🟢 Пользователь подключился: ${socket.id}`);

    // 1. Слушаем событие 'sendLocation' от клиента (из MapComponent.js)
    socket.on('sendLocation', (location) => {

        // Обновляем координаты конкретного сокета в нашем словаре
        activeUsers[socket.id] = {
            id: socket.id,
            location: location,
            username: 'Брат на радаре' // Позже мы свяжем это с реальным логином из БД
        };

        // 2. Берем всех пользователей, превращаем в массив и рассылаем ВСЕМ клиентам
        io.emit('updateLocations', Object.values(activeUsers));
    });

    // 3. Обрабатываем отключение (пользователь закрыл вкладку или пропал интернет)
    socket.on('disconnect', () => {
        console.log(`🔴 Пользователь отключился: ${socket.id}`);

        // Удаляем его из оперативной памяти
        delete activeUsers[socket.id];

        // Сообщаем остальным, что один маркер нужно убрать с карты
        io.emit('updateLocations', Object.values(activeUsers));
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});