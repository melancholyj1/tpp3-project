/**
 * API: GET /api/auth/me
 * 
 * Получение данных текущего авторизованного пользователя.
 * Используется для проверки аутентификации на клиенте.
 * 
 * Response: { user } или { error: 'Не авторизован' }
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUserId } from '@/lib/auth';

export async function GET(request) {
  try {
    const userId = getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json({ user: user.toJSON() });
  } catch (error) {
    console.error('[Me Error]:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * API: POST /api/auth/me (logout)
 * 
 * Выход из системы — удаление JWT cookie.
 */
export async function POST(request) {
  const response = NextResponse.json({ message: 'Вы вышли из системы' });
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
