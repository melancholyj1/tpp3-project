import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Auth from './components/Auth';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import MapSearch from './components/MapSearch';
import axios from 'axios';

import './App.css';
import './mobile.css';

function App() {
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [activePanel, setActivePanel] = useState('none'); // 'none', 'friends', 'saved', 'recent'
  const [searchResults, setSearchResults] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [recentPlaces, setRecentPlaces] = useState([]);
  const [mapCenter, setMapCenter] = useState(null);

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

      const authConfig = { headers: { Authorization: `Bearer ${token}` } };

      // Загружаем сохраненные и недавние места
      axios.get('http://localhost:5000/api/places/saved', authConfig)
        .then(res => setSavedPlaces(res.data.savedPlaces || []))
        .catch(err => console.error(err));

      axios.get('http://localhost:5000/api/places/recent', authConfig)
        .then(res => setRecentPlaces(res.data.recentSearches || []))
        .catch(err => console.error(err));
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

  const togglePanel = (panelName) => {
    setActivePanel(prev => prev === panelName ? 'none' : panelName);
  };

  const handleSavePlace = async (place) => {
    try {
      const res = await axios.post('http://localhost:5000/api/places/saved', place, { headers: { Authorization: `Bearer ${token}` } });
      setSavedPlaces(res.data.savedPlaces);
    } catch (err) {
      console.error('Ошибка сохранения места:', err);
    }
  };

  const handlePlaceClick = async (place) => {
    if (token) {
      try {
        const res = await axios.post('http://localhost:5000/api/places/recent', place, { headers: { Authorization: `Bearer ${token}` } });
        setRecentPlaces(res.data.recentSearches || []);
      } catch (err) {
        console.error('Ошибка добавления в недавние:', err);
      }
    }
  };

  const flyToPlace = (place) => {
    setSearchResults([place]); // Это заставит камеру полететь к этому месту
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
            <button className="nav-btn" style={{ marginTop: '25px' }} title="Меню">☰</button>
            <button className={`nav-btn ${activePanel === 'saved' ? 'active-icon' : ''}`} onClick={() => togglePanel('saved')} title="Сохранено">🔖<span>Сохранено</span></button>
            <button className={`nav-btn ${activePanel === 'friends' ? 'active-icon' : ''}`} onClick={() => togglePanel('friends')} title="Друзья">👥<span>Друзья</span></button>
            <button className={`nav-btn ${activePanel === 'recent' ? 'active-icon' : ''}`} onClick={() => togglePanel('recent')} title="Недавнее">🕒<span>Недавнее</span></button>
            <button className="nav-btn" onClick={handleLogout} style={{ marginTop: 'auto', marginBottom: '20px' }} title="Выход">🚪<span>Выйти</span></button>
          </div>

          <div className="top-search-bar-parent">
            <MapSearch onSearchResults={setSearchResults} token={token} mapCenter={mapCenter} />
            <div className="top-bar-placeholders">
              <button className="directions-btn-placeholder" title="Маршруты">⤴️</button>
              <div className="language-dropdown-placeholder" title="Выбор языка">Pу <span className="dropdown-arrow">▼</span></div>
            </div>
          </div>

          <div className={`sidebar ${activePanel !== 'none' ? 'open' : ''}`}>
            {activePanel === 'friends' && (
              <Sidebar token={token} onSelectFriend={(friend) => setActiveChatFriend(friend)} isOpen={true} />
            )}
            {activePanel === 'saved' && (
              <div style={{ padding: '20px', color: '#333' }}>
                <h3>Сохраненные места</h3>
                {savedPlaces.length === 0 ? <p>Нет сохраненных мест.</p> : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {savedPlaces.map((place, idx) => (
                      <li key={idx} style={{ padding: '10px', borderBottom: '1px solid #ccc', cursor: 'pointer' }} onClick={() => flyToPlace(place)}>
                        <strong>{place.name}</strong><br/>
                        <span style={{ fontSize: '12px', color: '#666' }}>{place.address}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {activePanel === 'recent' && (
              <div style={{ padding: '20px', color: '#333' }}>
                <h3>Недавние</h3>
                {recentPlaces.length === 0 ? <p>История пуста.</p> : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {recentPlaces.map((place, idx) => (
                      <li key={idx} style={{ padding: '10px', borderBottom: '1px solid #ccc', cursor: 'pointer' }} onClick={() => flyToPlace(place)}>
                        <strong>{place.name}</strong><br/>
                        <span style={{ fontSize: '12px', color: '#666' }}>{place.address}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
            <MapComponent 
              socket={socket} 
              searchResults={searchResults} 
              savedPlaces={savedPlaces} 
              onSavePlace={handleSavePlace}
              onPlaceClick={handlePlaceClick}
              onCenterChange={setMapCenter}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;