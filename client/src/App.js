import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Auth from './components/Auth';
import MapComponent from './components/MapComponent';

// Подключаем стили
import './App.css';
import './mobile.css'; // Тот самый отдельный файл для адаптации под телефоны!

function App() {
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);

  // 1. Проверяем, авторизован ли пользователь при загрузке страницы
  useEffect(() => {
    const savedToken = localStorage.getItem('zenly_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // 2. Управляем WebSocket-соединением
  useEffect(() => {
    let newSocket;

    // Подключаемся к сокетам ТОЛЬКО если есть токен (пользователь вошел)
    if (token) {
      newSocket = io('http://localhost:5000'); // Адрес нашего бэкенда
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('✅ Успешно подключились к серверу по WebSocket! ID:', newSocket.id);
      });
    }

    // Функция очистки: если пользователь выходит или закрывает вкладку, убиваем соединение
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token]);

  // Логика выхода из аккаунта
  const handleLogout = () => {
    localStorage.removeItem('zenly_token'); // Удаляем токен из памяти
    setToken(null); // Сбрасываем состояние
    if (socket) {
      socket.disconnect(); // Принудительно отключаем сокет
    }
  };

  return (
    <div className="App">
      {/* Маршрутизация: если нет токена — форма, если есть — карта */}
      {!token ? (
        <Auth setToken={setToken} />
      ) : (
        <div className="main-app">
          {/* Плавающая кнопка выхода поверх карты */}
          <button onClick={handleLogout} className="logout-btn absolute-btn">
            Выйти
          </button>

          <div className="map-container">
            {/* Передаем сокет в карту, чтобы она могла отправлять координаты на сервер */}
            <MapComponent socket={socket} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;