/**
 * API: POST /api/friends/accept
 * 
 * Принятие входящего запроса в друзья.
 * Body: { friendshipId }
 * 
 * Только получатель запроса может его принять.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Friendship from '@/models/Friendship';
import { getAuthUserId } from '@/lib/auth';

export async function POST(request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { friendshipId } = await request.json();

    if (!friendshipId) {
      return NextResponse.json({ error: 'ID запроса обязателен' }, { status: 400 });
    }

    await connectDB();

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return NextResponse.json({ error: 'Запрос не найден' }, { status: 404 });
    }

    // Только получатель может принять запрос
    if (friendship.recipient.toString() !== userId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    if (friendship.status !== 'pending') {
      return NextResponse.json({ error: 'Запрос уже обработан' }, { status: 400 });
    }

    friendship.status = 'accepted';
    await friendship.save();

    return NextResponse.json({ message: 'Запрос принят', friendship });
  } catch (error) {
    console.error('[Accept Error]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
