/**
 * components/Friends/FriendsList.js — Полный список друзей
 * 
 * Включает: добавление друга по username,
 * входящие запросы с кнопками (принять/отклонить),
 * исходящие запросы, список подтверждённых друзей.
 */

'use client';

import { useState, useEffect } from 'react';
import FriendCard from './FriendCard';
import styles from './Friends.module.css';

export default function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [addUsername, setAddUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  /**
   * Загрузка списка друзей с API.
   */
  const fetchFriends = async () => {
    try {
      const res = await fetch('/api/friends');
      if (!res.ok) return;
      const data = await res.json();
      setFriends(data.friends || []);
      setPending(data.pending || []);
      setOutgoing(data.outgoing || []);
    } catch (err) {
      console.error('Ошибка загрузки друзей:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  /**
   * Отправка запроса в друзья.
   */
  const handleAddFriend = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!addUsername.trim()) return;

    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: addUsername.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setMessage('Запрос отправлен! ✓');
      setAddUsername('');
      fetchFriends(); // Обновляем список
    } catch {
      setError('Ошибка сети');
    }
  };

  /**
   * Принять запрос в друзья.
   */
  const handleAccept = async (friendshipId) => {
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      });

      if (res.ok) {
        fetchFriends();
      }
    } catch (err) {
      console.error('Ошибка принятия:', err);
    }
  };

  /**
   * Отклонить запрос.
   */
  const handleReject = async (friendshipId) => {
    try {
      const res = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      });

      if (res.ok) {
        fetchFriends();
      }
    } catch (err) {
      console.error('Ошибка отклонения:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.friendsPage}>
      {/* Заголовок */}
      <div className={styles.header}>
        <h1>👥 Друзья</h1>
        <p>Управляйте списком друзей</p>
      </div>

      {/* Добавление друга */}
      <form className={styles.addFriend} onSubmit={handleAddFriend} id="add-friend-form">
        <input
          type="text"
          className="input"
          placeholder="Введите username друга..."
          value={addUsername}
          onChange={(e) => setAddUsername(e.target.value)}
          id="input-add-friend"
        />
        <button type="submit" className="btn btn-primary" id="btn-add-friend">
          Добавить
        </button>
      </form>

      {/* Сообщения */}
      {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}
      {message && <div className="success-message" style={{ marginBottom: 16 }}>{message}</div>}

      {/* Входящие запросы */}
      {pending.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            📬 Входящие запросы
            <span className={styles.sectionCount}>{pending.length}</span>
          </div>
          {pending.map((req) => (
            <FriendCard
              key={req._id}
              friend={req.user}
              type="pending"
              onAccept={() => handleAccept(req._id)}
              onReject={() => handleReject(req._id)}
            />
          ))}
        </div>
      )}

      {/* Исходящие запросы */}
      {outgoing.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            📤 Отправленные запросы
            <span className={styles.sectionCount}>{outgoing.length}</span>
          </div>
          {outgoing.map((req) => (
            <FriendCard key={req._id} friend={req.user} type="outgoing" />
          ))}
        </div>
      )}

      {/* Подтверждённые друзья */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          ✨ Друзья
          <span className={styles.sectionCount}>{friends.length}</span>
        </div>

        {friends.length > 0 ? (
          friends.map((friend) => (
            <FriendCard key={friend._id} friend={friend} type="accepted" />
          ))
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🤝</span>
            <p>Пока нет друзей.<br />Добавьте кого-нибудь по username!</p>
          </div>
        )}
      </div>
    </div>
  );
}
