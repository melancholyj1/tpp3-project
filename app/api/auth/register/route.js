/**
 * API: POST /api/auth/register
 * 
 * Регистрация нового пользователя.
 * 
 * Body: { username, email, password }
 * Response: { user } + httpOnly JWT cookie
 * 
 * Безопасность: валидация, хеширование пароля (bcrypt, 12 раундов),
 * проверка уникальности username и email.
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { signToken, getTokenCookieOptions, TOKEN_MAX_AGE } from '@/lib/auth';
import { validateRegister } from '@/lib/validate';

export async function POST(request) {
  try {
    const body = await request.json();

    // --- Серверная валидация ---
    const validation = validateRegister(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await connectDB();

    const { username, email, password } = body;
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Проверка уникальности
    const existing = await User.findOne({
      $or: [{ username: trimmedUsername }, { email: trimmedEmail }],
    });

    if (existing) {
      const field = existing.username === trimmedUsername ? 'имя пользователя' : 'email';
      return NextResponse.json(
        { error: `Этот ${field} уже занят` },
        { status: 409 }
      );
    }

    // Хеширование пароля (12 раундов bcrypt)
    const passwordHash = await bcrypt.hash(password, 12);

    // Создание пользователя
    const user = await User.create({
      username: trimmedUsername,
      email: trimmedEmail,
      passwordHash,
    });

    // Генерация JWT и установка cookie
    const token = signToken(user._id.toString());
    const cookieOptions = getTokenCookieOptions();

    const response = NextResponse.json(
      { user: user.toJSON() },
      { status: 201 }
    );

    response.cookies.set('token', token, {
      ...cookieOptions,
      maxAge: TOKEN_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('[Register Error]:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при регистрации' },
      { status: 500 }
    );
  }
}
