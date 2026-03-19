/**
 * components/Auth/LoginForm.js — Форма входа
 * 
 * Glassmorphism-карточка с полями email/password.
 * Валидация на клиенте + отправка на API.
 * Редирект на главную при успехе.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Auth.module.css';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка входа');
        return;
      }

      // Успешный вход — переходим на карту
      router.push('/');
      router.refresh();
    } catch {
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        {/* Заголовок */}
        <div className={styles.authHeader}>
          <span className={styles.authLogo}>🌍</span>
          <h1 className={styles.authTitle}>Zenly Clone</h1>
          <p className={styles.authSubtitle}>Войдите, чтобы видеть друзей</p>
        </div>

        {/* Форма */}
        <form className={styles.authForm} onSubmit={handleSubmit} id="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="input-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Пароль</label>
            <input
              id="login-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            id="btn-login"
          >
            {loading ? <span className="spinner" /> : 'Войти'}
          </button>
        </form>

        {/* Ссылка на регистрацию */}
        <div className={styles.authFooter}>
          Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
}
