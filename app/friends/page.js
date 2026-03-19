/**
 * app/friends/page.js — Страница друзей
 * 
 * Защищённая страница с навигацией.
 * Отображает FriendsList (добавление, pending, accepted).
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FriendsList from '@/components/Friends/FriendsList';
import BottomNav from '@/components/Nav/BottomNav';

export default function FriendsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
        } else {
          setAuthed(true);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  if (!authed) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <FriendsList />
      <BottomNav />
    </>
  );
}
