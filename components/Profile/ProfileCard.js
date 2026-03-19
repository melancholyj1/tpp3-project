/**
 * components/Profile/ProfileCard.js — Профиль пользователя
 * 
 * Отображает: аватар с инициалом, username, email,
 * статистику (друзья), кнопку выхода.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Profile.module.css';

export default function ProfileCard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  /**
   * Загрузка данных профиля.
   */
  useEffect(() => {
    async function fetchData() {
      try {
        // Параллельно загружаем профиль и друзей
        const [meRes, friendsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/friends'),
        ]);

        if (!meRes.ok) {
          router.push('/login');
          return;
        }

        const meData = await meRes.json();
        setUser(meData.user);

        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          setFriendsCount(friendsData.friends?.length || 0);
        }
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  /**
   * Выход из системы.
   */
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Ошибка выхода:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  const initial = user.username[0].toUpperCase();
  const color = user.color || '#a855f7';

  // Дата регистрации
  const joinDate = new Date(user.createdAt).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className={styles.profilePage}>
      {/* Главная карточка */}
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          {/* Аватар */}
          <div className={styles.profileAvatar} style={{ background: color }}>
            {initial}
          </div>

          {/* Имя и email */}
          <h1 className={styles.profileName}>{user.username}</h1>
          <p className={styles.profileEmail}>{user.email}</p>

          {/* Статистика */}
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{friendsCount}</div>
              <div className={styles.statLabel}>Друзей</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{joinDate}</div>
              <div className={styles.statLabel}>С нами с</div>
            </div>
          </div>
        </div>

        {/* Настройки */}
        <div className={styles.settingsSection}>
          <button className={styles.settingsItem} id="btn-my-id">
            <span className={styles.icon}>🆔</span>
            <span>Мой ID: {user.username}</span>
          </button>

          <button className={styles.settingsItem} id="btn-share-profile">
            <span className={styles.icon}>📤</span>
            <span>Поделиться профилем</span>
          </button>

          <button
            className={`${styles.settingsItem} ${styles.danger}`}
            onClick={handleLogout}
            id="btn-logout"
          >
            <span className={styles.icon}>🚪</span>
            <span>Выйти из аккаунта</span>
          </button>
        </div>
      </div>
    </div>
  );
}
