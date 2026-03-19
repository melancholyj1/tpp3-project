/**
 * app/page.js — Главная страница (Карта)
 * 
 * Защищённая страница: проверяет JWT -> если не авторизован, 
 * перенаправляет на /login.
 * 
 * Отображает: полноэкранную карту + поиск мест (POI) + навигацию.
 * Загружает список друзей для отображения на карте.
 * 
 * Хранит состояние POI-маркеров и пробрасывает в MapView.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import BottomNav from '@/components/Nav/BottomNav';
import PoiSearch from '@/components/Search/PoiSearch';

// Динамический импорт карты (Leaflet не работает в SSR)
const MapView = dynamic(() => import('@/components/Map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)' }}>Загрузка карты...</p>
    </div>
  ),
});

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [poiMarkers, setPoiMarkers] = useState([]);
  const [userPosition, setUserPosition] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        // Проверяем аутентификацию
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }

        const meData = await meRes.json();
        setUser(meData.user);

        // Загружаем друзей
        const friendsRes = await fetch('/api/friends');
        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          setFriends(friendsData.friends || []);
          setPendingCount(friendsData.pending?.length || 0);
        }
      } catch (err) {
        console.error('Ошибка инициализации:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  /**
   * Отслеживаем позицию пользователя для передачи в PoiSearch.
   */
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        // При ошибке используем сохранённые координаты
        try {
          const saved = localStorage.getItem('zenly_last_location');
          if (saved) {
            const data = JSON.parse(saved);
            if (data?.lat && data?.lng) {
              setUserPosition([data.lat, data.lng]);
            }
          }
        } catch { /* ignore */ }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /**
   * Callback для результатов POI-поиска.
   */
  const handlePoiResults = useCallback((places) => {
    setPoiMarkers(places);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <MapView user={user} friends={friends} poiMarkers={poiMarkers} />
      <PoiSearch userPosition={userPosition} onResults={handlePoiResults} />
      <BottomNav pendingCount={pendingCount} />
    </>
  );
}
