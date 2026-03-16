require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// ПОДКЛЮЧАЕМ РОУТЫ (НОВОЕ)
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ИСПОЛЬЗУЕМ РОУТЫ (НОВОЕ)
app.use('/api/auth', authRoutes);

const io = new Server(server, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
    console.log(`Пользователь подключился: ${socket.id}`);
    socket.on('disconnect', () => console.log(`Пользователь отключился: ${socket.id}`));
});

// ПОДКЛЮЧЕНИЕ К БД (РАСКОММЕНТИРОВАНО)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Успешно подключились к MongoDB!'))
    .catch((err) => console.error('Ошибка подключения к БД:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});