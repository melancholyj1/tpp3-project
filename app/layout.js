/**
 * app/layout.js — Корневой layout приложения
 * 
 * Подключает глобальные стили, шрифты,
 * устанавливает SEO-метаданные и viewport для мобильных.
 */

import './globals.css';

export const metadata = {
  title: 'Zenly Clone — Социальная карта',
  description: 'Отслеживай друзей в реальном времени на интерактивной карте. Клон Zenly.',
  themeColor: '#0a0a0f',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        {/* Предзагрузка шрифта для скорости */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
