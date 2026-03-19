/**
 * API: POST /api/auth/login
 * 
 * Аутентификация пользователя.
 * 
 * Body: { email, password }
 * Response: { user } + httpOnly JWT cookie
 * 
 * Безопасность: валидация, проверка пароля через bcrypt,
 * одинаковое сообщение об ошибке для несуществующего email
 * и неправильного пароля (защита от enumeration).
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { signToken, getTokenCookieOptions, TOKEN_MAX_AGE } from '@/lib/auth';
import { validateLogin } from '@/lib/validate';

export async function POST(request) {
  try {
    const body = await request.json();

    // --- Серверная валидация ---
    const validation = validateLogin(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await connectDB();

    const { email, password } = body;

    // Находим пользователя (включая passwordHash для проверки)
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');

    // Одинаковое сообщение — защита от user enumeration
    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Проверка пароля
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Обновляем статус
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Генерация JWT
    const token = signToken(user._id.toString());
    const cookieOptions = getTokenCookieOptions();

    const response = NextResponse.json({ user: user.toJSON() });

    response.cookies.set('token', token, {
      ...cookieOptions,
      maxAge: TOKEN_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('[Login Error]:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при входе' },
      { status: 500 }
    );
  }
}
