import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Auth from './components/Auth';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import MapSearch from './components/MapSearch'; // НОВОЕ

import './App.css';
import './mobile.css';

function App() {
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeChatFriend, setActiveChatFriend] = useState(null);

  // НОВЫЕ СОСТОЯНИЯ
  const [isFriendsMenuOpen, setIsFriendsMenuOpen] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);

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

          {/* НОВАЯ УЗКАЯ ПАНЕЛЬ НАВИГАЦИИ */}
          <div className="nav-sidebar">
            <button className="nav-btn" style={{ marginTop: '10px' }}>
              ☰
            </button>

            <button
              className="nav-btn"
              onClick={() => setIsFriendsMenuOpen(!isFriendsMenuOpen)}
              title="Друзья"
            >
              👥
              <span>Друзья</span>
            </button>

            <button className="nav-btn" onClick={handleLogout} style={{ marginTop: 'auto', marginBottom: '20px' }} title="Выход">
              🚪
              <span>Выйти</span>
            </button>
          </div>

          {/* СТРОКА ПОИСКА */}
          <MapSearch onLocationFound={(coords) => setSearchedLocation(coords)} />

          {/* ПАНЕЛЬ ДРУЗЕЙ (Обернута в div для управления анимацией) */}
          <div className={`sidebar ${isFriendsMenuOpen ? 'open' : ''}`}>
            <Sidebar token={token} onSelectFriend={(friend) => setActiveChatFriend(friend)} />
          </div>

          {activeChatFriend && (
            <Chat friend={activeChatFriend} socket={socket} onClose={() => setActiveChatFriend(null)} />
          )}

          <div className="map-container" style={{ marginLeft: '70px' }}> {/* Сдвигаем карту от панели */}
            <MapComponent socket={socket} searchedLocation={searchedLocation} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;