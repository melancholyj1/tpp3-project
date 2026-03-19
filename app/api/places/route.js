/**
 * app/api/places/route.js — Прокси для Foursquare Places API
 * 
 * Ищет ближайшие POI (Points of Interest) по координатам
 * и текстовому запросу. Возвращает список мест с названием,
 * категорией, адресом, расстоянием и фото.
 * 
 * Безопасность: API-ключ Foursquare хранится на сервере,
 * клиент не имеет к нему доступа.
 * 
 * GET /api/places?query=бары&lat=55.75&lng=37.61&limit=10
 */

import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY;
const FSQ_BASE = 'https://api.foursquare.com/v3';

export async function GET(request) {
  try {
    // Проверяем аутентификацию
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const limit = Math.min(parseInt(searchParams.get('limit')) || 10, 20);
    const radius = Math.min(parseInt(searchParams.get('radius')) || 5000, 50000);

    // Валидация координат
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Некорректные координаты' }, { status: 400 });
    }

    if (!FSQ_API_KEY) {
      return NextResponse.json({ error: 'Foursquare API key не настроен' }, { status: 500 });
    }

    // --- 1. Поиск мест ---
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      radius: radius.toString(),
      limit: limit.toString(),
      sort: 'DISTANCE',
      fields: 'fsq_id,name,categories,geocodes,location,distance',
    });

    if (query.trim()) {
      params.set('query', query.trim());
    }

    const searchRes = await fetch(`${FSQ_BASE}/places/search?${params}`, {
      headers: {
        Authorization: FSQ_API_KEY,
        Accept: 'application/json',
      },
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error('[Foursquare] Search error:', searchRes.status, errText);
      return NextResponse.json(
        { error: 'Ошибка поиска мест' },
        { status: searchRes.status }
      );
    }

    const searchData = await searchRes.json();
    const places = searchData.results || [];

    // --- 2. Загружаем фото для каждого места (параллельно) ---
    const placesWithPhotos = await Promise.all(
      places.map(async (place) => {
        try {
          const photoRes = await fetch(
            `${FSQ_BASE}/places/${place.fsq_id}/photos?limit=1`,
            {
              headers: {
                Authorization: FSQ_API_KEY,
                Accept: 'application/json',
              },
            }
          );

          if (photoRes.ok) {
            const photos = await photoRes.json();
            if (photos.length > 0) {
              // Foursquare возвращает prefix + suffix, собираем URL
              const photo = photos[0];
              place.photoUrl = `${photo.prefix}300x200${photo.suffix}`;
            }
          }
        } catch {
          // Фото необязательно — если не загрузилось, просто пропускаем
        }

        return place;
      })
    );

    return NextResponse.json({ places: placesWithPhotos });
  } catch (error) {
    console.error('[Places Error]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
