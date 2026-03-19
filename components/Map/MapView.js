/**
 * components/Map/MapView.js — Полноэкранная интерактивная карта
 * 
 * Отображает: текущего пользователя (синий пульсирующий маркер с направлением),
 * маркеры друзей (с аватарами и статус-кольцами),
 * маркеры POI (результаты поиска мест).
 * 
 * Подписывается на Socket.IO для обновления позиций в реалтайме.
 * Использует Geolocation API (watchPosition) для отслеживания:
 * - координат
 * - скорости (coords.speed → км/ч)
 * - направления (coords.heading)
 * 
 * При обрыве геолокации — показывает последнее известное положение
 * из localStorage.
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSocket } from '@/lib/socket';
import FriendMarker from './FriendMarker';
import styles from './Map.module.css';

// Дефолтный центр карты (Москва)
const DEFAULT_CENTER = [55.7558, 37.6173];
const DEFAULT_ZOOM = 13;
const STORAGE_KEY = 'zenly_last_location';

/**
 * Компонент-хелпер: плавно перемещает карту к координатам.
 */
function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
}

/**
 * Определяет тип активности по скорости (км/ч).
 */
function getActivityLabel(speedKmh) {
  if (speedKmh === null || speedKmh === undefined || speedKmh < 0) return null;
  if (speedKmh < 1) return { emoji: '🧍', text: 'Стоит' };
  if (speedKmh < 7) return { emoji: '🚶', text: `Пешком, ${Math.round(speedKmh)} км/ч` };
  if (speedKmh < 25) return { emoji: '🚴', text: `Велосипед, ${Math.round(speedKmh)} км/ч` };
  return { emoji: '🚗', text: `В авто, ${Math.round(speedKmh)} км/ч` };
}

/**
 * Создаёт иконку маркера текущего пользователя.
 * При наличии heading — показывает стрелку направления.
 */
function createMyMarkerIcon(heading) {
  const hasHeading = heading !== null && heading !== undefined && !isNaN(heading);
  const arrowHtml = hasHeading
    ? `<div style="
        position: absolute;
        top: -8px; left: 50%;
        transform: translateX(-50%) rotate(${heading}deg);
        width: 0; height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 10px solid #00d4ff;
        filter: drop-shadow(0 0 4px rgba(0,212,255,0.8));
      "></div>`
    : '';

  return L.divIcon({
    className: '',
    html: `<div style="position: relative; width: 24px; height: 24px;">
      ${arrowHtml}
      <div style="
        width: 20px; height: 20px;
        margin: 2px;
        background: #00d4ff;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 15px rgba(0, 212, 255, 0.6);
      "></div>
    </div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 17],
  });
}

/**
 * Сохраняет координаты в localStorage.
 */
function persistLocation(lat, lng, speed, heading) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, speed, heading, ts: Date.now() }));
  } catch { /* ignore quota */ }
}

/**
 * Восстанавливает последние координаты из localStorage.
 */
function loadPersistedLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.lat && data?.lng) return data;
  } catch { /* ignore */ }
  return null;
}

export default function MapView({ user, friends: initialFriends = [], poiMarkers = [], onMapReady }) {
  const [myPosition, setMyPosition] = useState(null);
  const [mySpeed, setMySpeed] = useState(null);       // км/ч
  const [myHeading, setMyHeading] = useState(null);    // градусы
  const [geoError, setGeoError] = useState(false);     // флаг обрыва GPS
  const [friends, setFriends] = useState(initialFriends);
  const [flyTo, setFlyTo] = useState(null);
  const watchIdRef = useRef(null);
  const socketRef = useRef(null);
  const mapRef = useRef(null);

  /**
   * Восстановление последней позиции при первой загрузке.
   */
  useEffect(() => {
    const saved = loadPersistedLocation();
    if (saved) {
      setMyPosition([saved.lat, saved.lng]);
      if (saved.speed !== undefined) setMySpeed(saved.speed);
      if (saved.heading !== undefined) setMyHeading(saved.heading);
    }
  }, []);

  /**
   * Отслеживание собственной геолокации.
   * Извлекает speed (м/с → км/ч) и heading (градусы).
   * При обрыве GPS — сохраняет последние координаты в localStorage.
   */
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('[Geo] Geolocation не поддерживается');
      setGeoError(true);
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newPos = [lat, lng];
        setMyPosition(newPos);
        setGeoError(false);

        // Конвертация скорости: м/с → км/ч
        const speedMs = pos.coords.speed;
        const speedKmh = (speedMs !== null && speedMs >= 0) ? speedMs * 3.6 : null;
        setMySpeed(speedKmh);

        // Направление движения (градусы)
        const heading = pos.coords.heading;
        setMyHeading((heading !== null && !isNaN(heading)) ? heading : null);

        // Сохраняем в localStorage
        persistLocation(lat, lng, speedKmh, heading);

        // Отправляем через Socket.IO
        if (socketRef.current) {
          socketRef.current.emit('location:update', {
            lat,
            lng,
            speed: speedKmh,
            heading,
            battery: null,
          });
        }
      },
      (err) => {
        console.warn('[Geo] Ошибка:', err.message);
        setGeoError(true);
        // Позиция из localStorage уже загружена при монтировании
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  /**
   * Socket.IO: обновления позиций друзей.
   */
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('friend:location', (data) => {
      setFriends((prev) =>
        prev.map((f) =>
          f._id === data.userId
            ? {
                ...f,
                location: { lat: data.lat, lng: data.lng, updatedAt: data.updatedAt },
                battery: data.battery,
                speed: data.speed,
                isOnline: true,
              }
            : f
        )
      );
    });

    socket.on('friend:online', ({ userId }) => {
      setFriends((prev) =>
        prev.map((f) => (f._id === userId ? { ...f, isOnline: true } : f))
      );
    });

    socket.on('friend:offline', ({ userId }) => {
      setFriends((prev) =>
        prev.map((f) => (f._id === userId ? { ...f, isOnline: false } : f))
      );
    });

    return () => {
      socket.off('friend:location');
      socket.off('friend:online');
      socket.off('friend:offline');
    };
  }, []);

  // Обновляем друзей при изменении пропсов
  useEffect(() => {
    setFriends(initialFriends);
  }, [initialFriends]);

  // Отдаём mapRef наверх
  useEffect(() => {
    if (onMapReady && mapRef.current) {
      onMapReady(mapRef.current);
    }
  }, [onMapReady]);

  /**
   * Центрирование на своей позиции.
   */
  const handleCenterOnMe = useCallback(() => {
    if (myPosition) {
      setFlyTo(myPosition);
      setTimeout(() => setFlyTo(null), 2000);
    }
  }, [myPosition]);

  // Метка скорости для UI
  const activity = getActivityLabel(mySpeed);

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={myPosition || DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={true}
        ref={mapRef}
      >
        {/* Тёмный тайловый слой (CartoDB Dark Matter) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Мой маркер */}
        {myPosition && (
          <Marker position={myPosition} icon={createMyMarkerIcon(myHeading)}>
            <Popup>
              <div className={styles.popupContent}>
                <div className={styles.popupInfo}>
                  <h4>📍 Вы здесь</h4>
                  <p>{user?.username || 'Я'}</p>
                  {activity && <p>{activity.emoji} {activity.text}</p>}
                  {geoError && <p style={{ color: '#fbbf24', fontSize: '0.75rem' }}>⚠️ GPS потерян, показано последнее</p>}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Маркеры друзей */}
        {friends
          .filter((f) => f.location?.lat && f.location?.lng)
          .map((friend) => (
            <FriendMarker key={friend._id} friend={friend} />
          ))}

        {/* POI маркеры (результаты поиска мест) */}
        {poiMarkers.map((poi) => (
          <Marker
            key={poi.fsq_id}
            position={[poi.geocodes.main.latitude, poi.geocodes.main.longitude]}
            icon={L.divIcon({
              className: '',
              html: `<div style="
                width: 32px; height: 32px;
                background: rgba(168,85,247,0.9);
                border: 2px solid white;
                border-radius: 8px;
                display: flex; align-items: center; justify-content: center;
                font-size: 16px;
                box-shadow: 0 2px 10px rgba(168,85,247,0.5);
              ">${poi.categories?.[0]?.icon ? '📍' : '📍'}</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32],
            })}
          >
            <Popup maxWidth={280}>
              <div className={styles.poiPopup}>
                {poi.photoUrl && (
                  <img
                    src={poi.photoUrl}
                    alt={poi.name}
                    className={styles.poiPhoto}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className={styles.poiInfo}>
                  <h4>{poi.name}</h4>
                  {poi.categories?.[0]?.name && (
                    <p className={styles.poiCategory}>{poi.categories[0].name}</p>
                  )}
                  {poi.location?.formatted_address && (
                    <p className={styles.poiAddress}>{poi.location.formatted_address}</p>
                  )}
                  {poi.distance !== undefined && (
                    <p className={styles.poiDistance}>
                      📏 {poi.distance < 1000
                        ? `${poi.distance} м`
                        : `${(poi.distance / 1000).toFixed(1)} км`}
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Плавное перемещение */}
        {flyTo && <FlyToLocation position={flyTo} />}
      </MapContainer>

      {/* Индикатор скорости */}
      {activity && (
        <div className={styles.speedBadge} id="speed-badge">
          <span>{activity.emoji}</span>
          <span>{activity.text}</span>
        </div>
      )}

      {/* Предупреждение об обрыве GPS */}
      {geoError && myPosition && (
        <div className={styles.gpsBanner}>
          ⚠️ GPS потерян — показано последнее местоположение
        </div>
      )}

      {/* Кнопка центрирования на себе */}
      <button
        className={styles.myLocationBtn}
        onClick={handleCenterOnMe}
        title="Моя позиция"
        id="btn-my-location"
      >
        📍
      </button>
    </div>
  );
}
