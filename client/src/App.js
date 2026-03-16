import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Auth from './components/Auth';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import MapSearch from './components/MapSearch';

import './App.css';
import './mobile.css';

function App() {
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [isFriendsMenuOpen, setIsFriendsMenuOpen] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);

  // НОВОЕ: Состояние для всплывающего уведомления
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('zenly_token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    let newSocket;
    if (token) {
      newSocket = io('http://localhost:5000', { auth: { token } });
      setSocket(newSocket);
    }
    return () => { if (newSocket) newSocket.disconnect(); };
  }, [token]);

  // НОВОЕ: Глобальный слушатель входящих сообщений
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msgData) => {
      // Если чат с этим отправителем СЕЙЧАС НЕ ОТКРЫТ — показываем пуш-уведомление
      if (!activeChatFriend || activeChatFriend._id !== msgData.senderId) {
        setNotification(`Новое сообщение от: ${msgData.senderName}`);

        // Прячем уведомление через 4 секунды
        setTimeout(() => setNotification(null), 4000);
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, activeChatFriend]); // Зависит от activeChatFriend, чтобы знать, кто сейчас открыт

  const handleLogout = () => {
    localStorage.removeItem('zenly_token');
    setToken(null);
    if (socket) socket.disconnect();
  };

  return (
    <div className="App">
      {!token ? (
        <Auth setToken={setToken} />
      ) : (
        <div className="main-app">

          {/* НОВОЕ: Рендер всплывающего уведомления */}
          {notification && (
            <div className="toast-notification">
              🔔 {notification}
            </div>
          )}

          <div className="nav-sidebar">
            <button className="nav-btn" style={{ marginTop: '10px' }} title="Меню">☰</button>
            <button className="nav-btn" title="Сохранено">🔖<span>Сохранено</span></button>
            <button className="nav-btn active-icon" onClick={() => setIsFriendsMenuOpen(!isFriendsMenuOpen)} title="Друзья">👥<span>Друзья</span></button>
            <button className="nav-btn" title="Недавнее">🕒<span>Недавнее</span></button>
            <button className="nav-btn" onClick={handleLogout} style={{ marginTop: 'auto', marginBottom: '20px' }} title="Выход">🚪<span>Выйти</span></button>
          </div>

          <div className="top-search-bar-parent">
            <MapSearch onLocationFound={(coords) => setSearchedLocation(coords)} />
            <div className="top-bar-placeholders">
              <button className="directions-btn-placeholder" title="Маршруты">⤴️</button>
              <div className="language-dropdown-placeholder" title="Выбор языка">Pу <span className="dropdown-arrow">▼</span></div>
            </div>
          </div>

          <div className={`sidebar ${isFriendsMenuOpen ? 'open' : ''}`}>
            <Sidebar token={token} onSelectFriend={(friend) => setActiveChatFriend(friend)} isOpen={isFriendsMenuOpen} />
          </div>

          {activeChatFriend && (
            <Chat 
              friend={activeChatFriend} 
              socket={socket} 
              token={token} /* <--- ДОБАВИЛИ ТОКЕН СЮДА */
              onClose={() => setActiveChatFriend(null)} 
            />
          )}

          <div className="map-container" style={{ marginLeft: '70px' }}>
            <MapComponent socket={socket} searchedLocation={searchedLocation} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;