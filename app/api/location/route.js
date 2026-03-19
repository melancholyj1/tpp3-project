/**
 * API: POST /api/location
 * 
 * Обновление геолокации пользователя.
 * Body: { lat, lng, battery? }
 * 
 * Используется как fallback при отсутствии WebSocket-соединения.
 * Основной механизм обновления — через Socket.IO.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUserId } from '@/lib/auth';
import { validateLocation } from '@/lib/validate';

export async function POST(request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();

    // Валидация координат
    const validation = validateLocation(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await connectDB();

    const updateData = {
      'location.lat': body.lat,
      'location.lng': body.lng,
      'location.updatedAt': new Date(),
    };

    // Обновляем батарею, если передана
    if (typeof body.battery === 'number') {
      updateData.battery = Math.min(100, Math.max(0, body.battery));
    }

    await User.findByIdAndUpdate(userId, updateData);

    return NextResponse.json({ message: 'Локация обновлена' });
  } catch (error) {
    console.error('[Location Error]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
