/**
 * app/login/page.js — Страница входа
 */

import LoginForm from '@/components/Auth/LoginForm';

export const metadata = {
  title: 'Вход — Zenly Clone',
  description: 'Войдите в Zenly Clone, чтобы видеть друзей на карте',
};

export default function LoginPage() {
  return <LoginForm />;
}
