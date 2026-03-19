/**
 * lib/auth.js — JWT утилиты для аутентификации
 * 
 * Обеспечивает: создание токенов, верификацию,
 * извлечение текущего пользователя из cookies запроса.
 * 
 * Безопасность: httpOnly cookies, SameSite=Strict, Secure в production.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 дней в секундах

/**
 * Создаёт JWT-токен для пользователя.
 * @param {string} userId - ID пользователя из MongoDB
 * @returns {string} JWT-токен
 */
function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: TOKEN_MAX_AGE,
  });
}

/**
 * Верифицирует JWT-токен.
 * @param {string} token - JWT-токен
 * @returns {{ userId: string } | null} Декодированные данные или null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Извлекает ID текущего пользователя из cookies запроса.
 * Используется в API routes для проверки аутентификации.
 * 
 * @param {Request} request - Next.js Request объект
 * @returns {string | null} userId или null если не авторизован
 */
function getAuthUserId(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/token=([^;]+)/);

  if (!tokenMatch) return null;

  const decoded = verifyToken(tokenMatch[1]);
  return decoded ? decoded.userId : null;
}

/**
 * Параметры cookie для установки JWT-токена.
 * httpOnly: недоступен из JavaScript (защита от XSS)
 * sameSite: strict — защита от CSRF
 * secure: true в production (только HTTPS)
 */
function getTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  };
}

module.exports = { signToken, verifyToken, getAuthUserId, getTokenCookieOptions, TOKEN_MAX_AGE };
