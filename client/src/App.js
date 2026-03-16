import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Auth from './components/Auth';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar'; // НОВОЕ
import Chat from './components/Chat';       // НОВОЕ

import './App.css';
import './mobile.css';

function App() {
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeChatFriend, setActiveChatFriend] = useState(null); // НОВОЕ: С кем сейчас открыт чат

  useEffect(() => {
    const savedToken = localStorage.getItem('zenly_token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    let newSocket;
    if (token) {
      // Передаем токен прямо при подключении сокета для аутентификации на бэкенде
      newSocket = io('http://localhost:5000', {
        auth: { token }
      });
      setSocket(newSocket);
    }
    return () => { if (newSocket) newSocket.disconnect(); };
  }, [token]);

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
          <button onClick={handleLogout} className="logout-btn absolute-btn">Выйти</button>

          {/* Наша новая боковая панель */}
          <Sidebar token={token} onSelectFriend={(friend) => setActiveChatFriend(friend)} />

          {/* Наш плавающий чат. Показываем только если выбран друг */}
          {activeChatFriend && (
            <Chat
              friend={activeChatFriend}
              socket={socket}
              onClose={() => setActiveChatFriend(null)}
            />
          )}

          <div className="map-container">
            <MapComponent socket={socket} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;