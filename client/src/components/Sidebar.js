import React, { useState, useEffect } from 'react';
import axios from 'axios';

// НОВОЕ: Добавляем пропс isOpen, чтобы знать, когда панель открыта
const Sidebar = ({ token, onSelectFriend, isOpen }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // НОВОЕ: Храним ID тех, кому мы уже отправили заявку в этой сессии
    const [sentRequests, setSentRequests] = useState([]);

    const authConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    const loadFriendsData = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/friends', authConfig);
            setFriends(res.data.friends || []);
            setRequests(res.data.friendRequests || []);
        } catch (err) {
            console.error("Ошибка загрузки друзей:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // 1. Загружаем данные каждый раз, когда пользователь ОТКРЫВАЕТ панель
    useEffect(() => {
        if (isOpen) {
            loadFriendsData();
        }
    }, [isOpen]);

    // 2. Тихий поллинг: проверяем новые заявки каждые 10 секунд в фоне
    useEffect(() => {
        const interval = setInterval(() => {
            loadFriendsData();
        }, 10000);
        return () => clearInterval(interval); // Очистка при закрытии
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/friends/search?username=${searchQuery}`, authConfig);
            setSearchResults(res.data);
        } catch (err) {
            console.error("Ошибка поиска:", err);
        }
    };

    const sendRequest = async (id) => {
        try {
            await axios.post('http://localhost:5000/api/friends/request', { targetUserId: id }, authConfig);

            // Убрали alert! Просто добавляем ID пользователя в массив отправленных
            setSentRequests(prev => [...prev, id]);

        } catch (err) {
            console.error('Ошибка отправки заявки', err);
        }
    };

    const acceptRequest = async (id) => {
        try {
            await axios.post('http://localhost:5000/api/friends/accept', { requesterId: id }, authConfig);
            loadFriendsData();
        } catch (err) {
            console.error('Ошибка принятия заявки', err);
        }
    };

    const removeFriend = async (id, e) => {
        e.stopPropagation(); // Чтобы при клике на удаление не открывался чат

        // Запрашиваем подтверждение, чтобы не удалить случайно
        if (!window.confirm('Точно удалить этого пользователя из друзей?')) return;

        try {
            await axios.post('http://localhost:5000/api/friends/remove', { friendId: id }, authConfig);
            loadFriendsData(); // Сразу обновляем список (друг исчезнет)
        } catch (err) {
            console.error('Ошибка удаления из друзей', err);
        }
    };

    return (
        <div className="sidebar-internal-content">
            <h3>Поиск друзей 👥</h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                <input
                    type="text"
                    placeholder="Никнейм..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.6)', outline: 'none' }}
                />
                <button type="submit" style={{ padding: '0 15px', borderRadius: '12px', border: 'none', background: '#007bff', color: 'white', cursor: 'pointer' }}>
                    Искать
                </button>
            </form>

            {/* Результаты поиска с умной кнопкой */}
            {searchResults.map(user => (
                <div key={user._id} className="friend-item">
                    <span>{user.username}</span>
                    <button
                        onClick={() => sendRequest(user._id)}
                        disabled={sentRequests.includes(user._id)} // Выключаем кнопку, если заявка отправлена
                        style={{
                            backgroundColor: sentRequests.includes(user._id) ? '#28a745' : '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: sentRequests.includes(user._id) ? 'default' : 'pointer',
                            transition: '0.3s'
                        }}
                    >
                        {/* Меняем текст кнопки */}
                        {sentRequests.includes(user._id) ? 'Отправлено ✓' : 'Добавить'}
                    </button>
                </div>
            ))}

            {requests.length > 0 && (
                <>
                    <h4 style={{ color: '#d93025', marginTop: '15px' }}>Новые заявки ({requests.length})</h4>
                    {requests.map(req => (
                        <div key={req._id} className="friend-item" style={{ borderLeft: '4px solid #d93025' }}>
                            <span>{req.username}</span>
                            <button
                                onClick={() => acceptRequest(req._id)}
                                style={{ background: '#28a745', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Принять
                            </button>
                        </div>
                    ))}
                </>
            )}

            {/* Список друзей */}
      <h4 style={{marginTop: '15px'}}>Мои друзья</h4>
      {isLoading ? (
        <p style={{textAlign: 'center', fontSize: '14px'}}>Загрузка... 🛰️</p>
      ) : (
        friends.length === 0 ? <p style={{textAlign: 'center', color: '#666', fontSize: '14px'}}>У вас пока нет друзей.</p> : (
          friends.map(friend => (
            <div key={friend._id} className="friend-item" onClick={() => onSelectFriend(friend)}>
              <span>🟢 {friend.username}</span>
              
              {/* Обертка для кнопок, чтобы они стояли рядом */}
              <div style={{ display: 'flex', gap: '5px' }}>
                <button style={{fontSize: '12px', background: 'transparent', border: '1px solid #007bff', color: '#007bff', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer'}}>
                  Чат
                </button>
                
                {/* НОВАЯ КНОПКА УДАЛЕНИЯ */}
                <button 
                  onClick={(e) => removeFriend(friend._id, e)}
                  style={{fontSize: '12px', background: 'transparent', border: '1px solid #d93025', color: '#d93025', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer'}}
                  title="Удалить из друзей"
                >
                  ✖
                </button>
              </div>
            </div>
          ))
        )
      )}
        </div>
    );
};

export default Sidebar;