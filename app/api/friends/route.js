/**
 * API: Friends endpoints
 * 
 * GET /api/friends — Список друзей и входящих запросов
 * POST /api/friends — Отправка запроса в друзья
 * 
 * Все эндпоинты требуют аутентификации (JWT cookie).
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Friendship from '@/models/Friendship';
import { getAuthUserId } from '@/lib/auth';
import { validateFriendRequest } from '@/lib/validate';

/**
 * GET /api/friends
 * Возвращает список друзей (accepted) и входящие запросы (pending).
 */
export async function GET(request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    await connectDB();

    // Подтверждённые друзья (я отправил, или мне отправили)
    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    }).populate('requester recipient', 'username avatar color location battery isOnline lastSeen');

    // Преобразуем в список друзей (без текущего пользователя)
    const friends = friendships.map((f) => {
      const friend = f.requester._id.toString() === userId ? f.recipient : f.requester;
      return friend.toJSON();
    });

    // Входящие запросы (ожидают моего ответа)
    const pendingRequests = await Friendship.find({
      recipient: userId,
      status: 'pending',
    }).populate('requester', 'username avatar color');

    const pending = pendingRequests.map((f) => ({
      _id: f._id,
      user: f.requester.toJSON(),
      createdAt: f.createdAt,
    }));

    // Исходящие запросы (я отправил, ожидают ответа)
    const outgoingRequests = await Friendship.find({
      requester: userId,
      status: 'pending',
    }).populate('recipient', 'username avatar color');

    const outgoing = outgoingRequests.map((f) => ({
      _id: f._id,
      user: f.recipient.toJSON(),
      createdAt: f.createdAt,
    }));

    return NextResponse.json({ friends, pending, outgoing });
  } catch (error) {
    console.error('[Friends GET Error]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/friends
 * Отправка запроса в друзья по username.
 * Body: { username }
 */
export async function POST(request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();

    // Валидация
    const validation = validateFriendRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await connectDB();

    // Ищем пользователя по username
    const targetUser = await User.findOne({ username: body.username.trim() });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Нельзя добавить самого себя
    if (targetUser._id.toString() === userId) {
      return NextResponse.json(
        { error: 'Нельзя добавить самого себя в друзья' },
        { status: 400 }
      );
    }

    // Проверяем, нет ли уже связи
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: targetUser._id },
        { requester: targetUser._id, recipient: userId },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return NextResponse.json({ error: 'Вы уже друзья' }, { status: 400 });
      }
      if (existingFriendship.status === 'pending') {
        return NextResponse.json({ error: 'Запрос уже отправлен' }, { status: 400 });
      }
      // Если rejected — удаляем старую запись и создаём новую
      await Friendship.deleteOne({ _id: existingFriendship._id });
    }

    // Создаём запрос
    const friendship = await Friendship.create({
      requester: userId,
      recipient: targetUser._id,
      status: 'pending',
    });

    return NextResponse.json(
      { message: 'Запрос отправлен', friendship },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Friends POST Error]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
