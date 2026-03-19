/**
 * models/Friendship.js — Модель дружбы
 * 
 * Хранит связи между пользователями:
 * - pending: запрос отправлен, ожидает подтверждения
 * - accepted: дружба подтверждена
 * - rejected: запрос отклонён
 * 
 * Составной индекс (requester, recipient) предотвращает
 * дублирование запросов.
 */

const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema(
  {
    // Кто отправил запрос
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Кому отправлен запрос
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Статус дружбы
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Уникальный составной индекс — нельзя отправить два запроса одному человеку
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Индекс для быстрого поиска входящих запросов
friendshipSchema.index({ recipient: 1, status: 1 });

module.exports = mongoose.models.Friendship || mongoose.model('Friendship', friendshipSchema);
