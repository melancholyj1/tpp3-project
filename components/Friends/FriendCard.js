/**
 * components/Friends/FriendCard.js — Карточка друга
 * 
 * Отображает аватар, имя, статус (online/offline),
 * батарею и действия (принять/отклонить для pending).
 */

'use client';

import styles from './Friends.module.css';

/**
 * Форматирует время последней активности.
 */
function formatLastSeen(date) {
  if (!date) return '';
  const now = new Date();
  const seen = new Date(date);
  const diffMin = Math.floor((now - seen) / 60000);

  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours} ч назад`;
  return seen.toLocaleDateString('ru-RU');
}

export default function FriendCard({ friend, type = 'accepted', onAccept, onReject }) {
  const initial = friend.username ? friend.username[0].toUpperCase() : '?';
  const color = friend.color || '#a855f7';

  return (
    <div className={styles.friendCard}>
      {/* Аватар */}
      <div className="avatar" style={{ background: color }}>
        {initial}
        {type === 'accepted' && (
          <span className={`status-dot ${friend.isOnline ? 'online' : 'offline'}`} />
        )}
      </div>

      {/* Информация */}
      <div className={styles.friendInfo}>
        <div className={styles.friendName}>{friend.username}</div>
        <div className={styles.friendStatus}>
          {type === 'accepted' ? (
            <>
              {friend.isOnline ? (
                <span style={{ color: 'var(--neon-green)' }}>● Онлайн</span>
              ) : (
                <span>● {formatLastSeen(friend.lastSeen)}</span>
              )}
              {friend.battery !== null && friend.battery !== undefined && (
                <span style={{ marginLeft: 8 }}>🔋{Math.round(friend.battery)}%</span>
              )}
            </>
          ) : type === 'pending' ? (
            <span style={{ color: 'var(--neon-yellow)' }}>Хочет добавить вас</span>
          ) : (
            <span>Ожидает ответа</span>
          )}
        </div>
      </div>

      {/* Действия для входящих запросов */}
      {type === 'pending' && (
        <div className={styles.friendActions}>
          <button
            className="btn btn-primary btn-sm"
            onClick={onAccept}
            id={`btn-accept-${friend._id}`}
          >
            ✓
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onReject}
            id={`btn-reject-${friend._id}`}
          >
            ✗
          </button>
        </div>
      )}
    </div>
  );
}
