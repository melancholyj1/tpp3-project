/**
 * components/Auth/RegisterForm.js — Форма регистрации
 * 
 * Glassmorphism-карточка с полями username/email/password.
 * Валидация на клиенте + отправка на API.
 * Редирект на главную при успехе.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Auth.module.css';

export default function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Клиентская валидация
    if (username.trim().length < 3) {
      setError('Имя пользователя: минимум 3 символа');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Пароль: минимум 6 символов');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации');
        return;
      }

      // Успешная регистрация — переходим на карту
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
          <h1 className={styles.authTitle}>Создать аккаунт</h1>
          <p className={styles.authSubtitle}>Присоединяйтесь к Zenly Clone</p>
        </div>

        {/* Форма */}
        <form className={styles.authForm} onSubmit={handleSubmit} id="register-form">
          {error && <div className="error-message">{error}</div>}

          <div className="input-group">
            <label htmlFor="reg-username">Имя пользователя</label>
            <input
              id="reg-username"
              type="text"
              className="input"
              placeholder="cooluser123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              maxLength={20}
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
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
            <label htmlFor="reg-password">Пароль</label>
            <input
              id="reg-password"
              type="password"
              className="input"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            id="btn-register"
          >
            {loading ? <span className="spinner" /> : 'Зарегистрироваться'}
          </button>
        </form>

        {/* Ссылка на логин */}
        <div className={styles.authFooter}>
          Уже есть аккаунт? <Link href="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
}
