/**
 * lib/mongodb.js — Подключение к MongoDB Atlas
 * 
 * Использует паттерн кэширования для Next.js:
 * в dev-режиме сохраняет соединение в global,
 * чтобы HMR не создавал множественные подключения.
 */

const mongoose = require('mongoose');

// URI берётся из переменных окружения
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Необходимо определить переменную MONGODB_URI в .env.local');
}

/**
 * Кэшируем подключение в global объекте.
 * В production это не нужно, но в dev-режиме Next.js
 * перезагружает модули при каждом изменении файлов.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Возвращает подключение к MongoDB.
 * При первом вызове — создаёт подключение.
 * При последующих — возвращает кэшированное.
 * 
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('[MongoDB] Подключение установлено ✓');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = connectDB;
