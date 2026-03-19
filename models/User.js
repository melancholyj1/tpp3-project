/**
 * models/User.js — Модель пользователя
 * 
 * Хранит данные профиля, геолокацию и статус.
 * Поле passwordHash НИКОГДА не возвращается клиенту
 * благодаря transform в toJSON.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Уникальное имя пользователя (3-20 символов)
    username: {
      type: String,
      required: [true, 'Имя пользователя обязательно'],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },

    // Email для аутентификации
    email: {
      type: String,
      required: [true, 'Email обязателен'],
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Хэш пароля (bcrypt)
    passwordHash: {
      type: String,
      required: true,
    },

    // URL/путь к аватару
    avatar: {
      type: String,
      default: '',
    },

    // Цвет профиля (для маркера на карте)
    color: {
      type: String,
      default: function () {
        const colors = ['#00D2FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#F472B6', '#34D399', '#FB923C'];
        return colors[Math.floor(Math.random() * colors.length)];
      },
    },

    // Геолокация пользователя
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },

    // Уровень заряда батареи (0-100)
    battery: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    // Онлайн-статус
    isOnline: {
      type: Boolean,
      default: false,
    },

    // Последняя активность
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt

    // БЕЗОПАСНОСТЬ: удаляем passwordHash при сериализации
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Индекс для геозапросов
userSchema.index({ 'location.lat': 1, 'location.lng': 1 });

// Индекс для быстрого поиска по email
userSchema.index({ email: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
