/**
 * app/register/page.js — Страница регистрации
 */

import RegisterForm from '@/components/Auth/RegisterForm';

export const metadata = {
  title: 'Регистрация — Zenly Clone',
  description: 'Создайте аккаунт в Zenly Clone и начните отслеживать друзей',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
