/**
 * components/Map/FriendMarker.js — Маркер друга на карте
 * 
 * Кастомный маркер: круглый аватар с первой буквой имени,
 * цветное кольцо-индикатор (🟢 online / ⚫ offline),
 * popup с именем, батареей и временем последнего обновления.
 */

'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import styles from './Map.module.css';

/**
 * Создаёт кастомную Leaflet-иконку для маркера друга.
 * @param {Object} friend - Данные друга
 * @returns {L.DivIcon}
 */
function createFriendIcon(friend) {
  const initial = friend.username ? friend.username[0].toUpperCase() : '?';
  const color = friend.color || '#a855f7';
  const isOnline = friend.isOnline;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
      ">
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          color: white;
          font-family: 'Inter', sans-serif;
          border: 3px solid ${isOnline ? color : '#6b7280'};
          box-shadow: ${isOnline ? `0 0 12px ${color}66` : 'none'};
          transition: all 0.3s ease;
        ">${initial}</div>
        <span style="
          font-size: 0.7rem;
          font-weight: 600;
          color: white;
          background: rgba(0,0,0,0.65);
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
          backdrop-filter: blur(4px);
        ">${friend.username}</span>
      </div>
    `,
    iconSize: [60, 65],
    iconAnchor: [30, 55],
    popupAnchor: [0, -55],
  });
}

/**
 * Определяет уровень заряда для стилизации.
 */
function getBatteryLevel(battery) {
  if (battery === null || battery === undefined) return null;
  if (battery <= 20) return 'low';
  if (battery <= 50) return 'mid';
  return 'high';
}

/**
 * Форматирует время последнего обновления.
 */
function formatLastSeen(date) {
  if (!date) return 'Неизвестно';

  const now = new Date();
  const updated = new Date(date);
  const diffMs = now - updated;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Только что';
  if (diffMin < 60) return `${diffMin} мин назад`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;

  return updated.toLocaleDateString('ru-RU');
}

export default function FriendMarker({ friend }) {
  const position = [friend.location.lat, friend.location.lng];
  const batteryLevel = getBatteryLevel(friend.battery);

  return (
    <Marker position={position} icon={createFriendIcon(friend)}>
      <Popup>
        <div className={styles.popupContent}>
          {/* Аватар в popup */}
          <div
            className="avatar"
            style={{ background: friend.color || '#a855f7' }}
          >
            {friend.username[0].toUpperCase()}
            <span
              className={`status-dot ${friend.isOnline ? 'online' : 'offline'}`}
            />
          </div>

          {/* Информация */}
          <div className={styles.popupInfo}>
            <h4>{friend.username}</h4>

            {/* Батарея */}
            {friend.battery !== null && friend.battery !== undefined && (
              <p>
                <span className={`${styles.batteryIcon} ${styles[batteryLevel]}`}>
                  🔋 {Math.round(friend.battery)}%
                </span>
              </p>
            )}

            {/* Последнее обновление */}
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {friend.isOnline ? '🟢 Онлайн' : `⚫ ${formatLastSeen(friend.lastSeen)}`}
            </p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
