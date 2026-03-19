/**
 * lib/socket.js — Клиентский Socket.IO синглтон
 * 
 * Обеспечивает единственный экземпляр подключения
 * Socket.IO на всё приложение с авто-реконнектом.
 */

import { io } from 'socket.io-client';

// Единственный экземпляр сокета
let socket = null;

/**
 * Возвращает Socket.IO клиент.
 * При первом вызове создаёт подключение.
 * При последующих — возвращает существующее.
 * 
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      // Автоматически отправляет cookies (нужно для JWT)
      withCredentials: true,
      // Авто-реконнект с экспоненциальной задержкой
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Подключён к серверу');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Отключён:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Ошибка подключения:', err.message);
    });
  }

  return socket;
}

/**
 * Отключает сокет (при выходе из приложения).
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
