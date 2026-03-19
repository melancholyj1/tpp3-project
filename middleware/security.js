/**
 * middleware/security.js — Цепочка middleware безопасности
 * 
 * Защита от: XSS, NoSQL Injection, Brute-force, Clickjacking,
 * MIME-sniffing, HTTP Parameter Pollution.
 * 
 * Подключается в server.js через applySecurity(app).
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');

/**
 * Применяет все security-middleware к Express-приложению.
 * @param {import('express').Application} app - Express-приложение
 */
function applySecurity(app) {
  // --- 1. Helmet: HTTP Security Headers ---
  // Устанавливает Content-Security-Policy, X-Frame-Options, HSTS и др.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://*.basemaps.cartocdn.com', 'https://*.foursquare.com', 'https://fastly.4sqi.net', 'https://ss3.4sqi.net', 'blob:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'https://*.tile.openstreetmap.org', 'https://*.basemaps.cartocdn.com', 'https://api.foursquare.com'],
        },
      },
      // X-Frame-Options: DENY — защита от clickjacking
      frameguard: { action: 'deny' },
      // Скрываем X-Powered-By
      hidePoweredBy: true,
    })
  );

  // --- 2. CORS ---
  // Разрешаем запросы только с нашего домена
  app.use(
    cors({
      origin: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
      credentials: true, // Для отправки cookies
    })
  );

  // --- 3. Rate Limiting: общий лимит ---
  // Максимум 100 запросов за 15 минут с одного IP
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100,
    message: { error: 'Слишком много запросов. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', generalLimiter);

  // --- 4. Rate Limiting: строгий лимит для auth ---
  // ВРЕМЕННО ОТКЛЮЧЕНО по запросу пользователя
  // const authLimiter = rateLimit({
  //   windowMs: 15 * 60 * 1000,
  //   max: 5,
  //   message: { error: 'Слишком много попыток. Подождите 15 минут.' },
  //   standardHeaders: true,
  //   legacyHeaders: false,
  // });
  // app.use('/api/auth/', authLimiter);

  // --- 5. NoSQL Injection Protection ---
  // Удаляет символы $ и . из req.body, req.query, req.params
  app.use(mongoSanitize());

  // --- 6. HTTP Parameter Pollution ---
  // Предотвращает атаки через дублирование GET-параметров
  app.use(hpp());

  console.log('[Security] Все middleware безопасности подключены ✓');
}

module.exports = { applySecurity };
