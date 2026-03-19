/**
 * lib/validate.js — Серверная валидация входных данных
 * 
 * Все данные от клиента проходят через эти функции
 * ПЕРЕД записью в БД. Защита от невалидных данных
 * и потенциальных инъекций.
 */

/**
 * Валидация данных регистрации.
 * @param {{ username: string, email: string, password: string }} data
 * @returns {{ valid: boolean, error?: string }}
 */
function validateRegister(data) {
  const { username, email, password } = data;

  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Имя пользователя обязательно' };
  }

  // Имя: 3-20 символов, только буквы, цифры, подчёркивания
  if (!/^[a-zA-Z0-9_а-яА-ЯёЁ]{3,20}$/.test(username.trim())) {
    return { valid: false, error: 'Имя пользователя: 3-20 символов (буквы, цифры, _)' };
  }

  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email обязателен' };
  }

  // Простая проверка формата email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { valid: false, error: 'Некорректный формат email' };
  }

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Пароль обязателен' };
  }

  if (password.length < 6 || password.length > 128) {
    return { valid: false, error: 'Пароль: от 6 до 128 символов' };
  }

  return { valid: true };
}

/**
 * Валидация данных логина.
 * @param {{ email: string, password: string }} data
 * @returns {{ valid: boolean, error?: string }}
 */
function validateLogin(data) {
  const { email, password } = data;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return { valid: false, error: 'Email обязателен' };
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    return { valid: false, error: 'Пароль обязателен' };
  }

  return { valid: true };
}

/**
 * Валидация данных геолокации.
 * @param {{ lat: number, lng: number, battery?: number }} data
 * @returns {{ valid: boolean, error?: string }}
 */
function validateLocation(data) {
  const { lat, lng } = data;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { valid: false, error: 'Координаты должны быть числами' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Широта: от -90 до 90' };
  }

  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Долгота: от -180 до 180' };
  }

  if (data.battery !== undefined) {
    if (typeof data.battery !== 'number' || data.battery < 0 || data.battery > 100) {
      return { valid: false, error: 'Батарея: от 0 до 100' };
    }
  }

  return { valid: true };
}

/**
 * Валидация данных при отправке запроса в друзья.
 * @param {{ username: string }} data
 * @returns {{ valid: boolean, error?: string }}
 */
function validateFriendRequest(data) {
  const { username } = data;

  if (!username || typeof username !== 'string' || !username.trim()) {
    return { valid: false, error: 'Имя пользователя обязательно' };
  }

  return { valid: true };
}

module.exports = { validateRegister, validateLogin, validateLocation, validateFriendRequest };
