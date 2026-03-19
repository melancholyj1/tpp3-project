/**
 * server.js — Custom Express + Socket.IO сервер
 * 
 * Интегрирует Next.js с Express и Socket.IO для поддержки
 * реалтайм-обмена геолокацией между пользователями.
 * 
 * Безопасность: Helmet, rate-limit, mongo-sanitize, hpp, CORS
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const { applySecurity } = require('./middleware/security');

// --- Конфигурация ---
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// --- Инициализация Next.js ---
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);

  // --- Подключаем middleware безопасности ---
  applySecurity(server);

  // --- Socket.IO ---
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SOCKET_URL || `http://${hostname}:${port}`,
      credentials: true,
    },
  });

  /**
   * Аутентификация WebSocket-соединений через JWT.
   * Токен извлекается из cookies при handshake.
   * Без валидного токена — соединение отклоняется.
   */
  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies.token;

      if (!token) {
        return next(new Error('Аутентификация required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Невалидный токен'));
    }
  });

  // Хранилище онлайн-пользователей: userId → socketId
  const onlineUsers = new Map();

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] Подключён: ${userId}`);

    // Регистрируем пользователя как онлайн
    onlineUsers.set(userId, socket.id);
    socket.join(userId);

    // Уведомляем друзей о подключении
    socket.broadcast.emit('friend:online', { userId });

    /**
     * Обновление геолокации.
     * Клиент отправляет { lat, lng, battery }.
     * Сервер рассылает всем друзьям обновлённую позицию.
     */
    socket.on('location:update', async (data) => {
      try {
        const { lat, lng, battery } = data;

        // Валидация координат
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

        // Рассылаем всем подключённым (кроме отправителя)
        socket.broadcast.emit('friend:location', {
          userId,
          lat,
          lng,
          battery: typeof battery === 'number' ? Math.min(100, Math.max(0, battery)) : null,
          updatedAt: new Date(),
        });
      } catch (err) {
        console.error('[Socket] Ошибка location:update:', err.message);
      }
    });

    /**
     * Отключение пользователя.
     * Уведомляем друзей и удаляем из списка онлайн.
     */
    socket.on('disconnect', () => {
      console.log(`[Socket] Отключён: ${userId}`);
      onlineUsers.delete(userId);
      socket.broadcast.emit('friend:offline', { userId });
    });
  });

  // --- Передаём все HTTP-запросы в Next.js ---
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // --- Запуск ---
  httpServer.listen(port, () => {
    console.log(`\n🚀 Zenly Clone запущен: http://${hostname}:${port}\n`);
  });
});
