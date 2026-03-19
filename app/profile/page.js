/**
 * app/profile/page.js — Страница профиля
 * 
 * Защищённая страница с навигацией.
 * Отображает ProfileCard (аватар, статистика, выход).
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileCard from '@/components/Profile/ProfileCard';
import BottomNav from '@/components/Nav/BottomNav';

export default function ProfilePage() {
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
      <ProfileCard />
      <BottomNav />
    </>
  );
}
