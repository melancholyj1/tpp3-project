/**
 * components/Nav/BottomNav.js — Главная навигация
 * 
 * Нижняя панель на мобильных, боковая на десктопе.
 * Glassmorphism-фон, микро-анимации при нажатии.
 * Показывает бейдж с количеством входящих запросов.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Nav.module.css';

// Элементы навигации
const NAV_ITEMS = [
  { href: '/', icon: '🗺️', label: 'Карта' },
  { href: '/friends', icon: '👥', label: 'Друзья' },
  { href: '/profile', icon: '👤', label: 'Профиль' },
];

export default function BottomNav({ pendingCount = 0 }) {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav} role="navigation" aria-label="Главная навигация">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            id={`nav-${item.label.toLowerCase()}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>

            {/* Бейдж для вкладки "Друзья" */}
            {item.href === '/friends' && pendingCount > 0 && (
              <span className={styles.badge}>{pendingCount > 9 ? '9+' : pendingCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
