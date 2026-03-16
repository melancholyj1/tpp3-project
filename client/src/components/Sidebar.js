import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Sidebar = ({ token, onSelectFriend }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);

    // Настройка axios для автоматической передачи токена
    const authConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    const loadFriendsData = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/friends', authConfig);
            setFriends(res.data.friends || []);
            setRequests(res.data.friendRequests || []);
        } catch (err) {
            console.error("Ошибка загрузки друзей");
        }
    };

    useEffect(() => {
        loadFriendsData();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/friends/search?username=${searchQuery}`, authConfig);
            setSearchResults(res.data);
        } catch (err) {
            console.error("Ошибка поиска");
        }
    };

    const sendRequest = async (id) => {
        try {
            await axios.post('http://localhost:5000/api/friends/request', { targetUserId: id }, authConfig);
            alert('Заявка отправлена!');
            setSearchResults([]);
            setSearchQuery('');
        } catch (err) {
            alert('Ошибка отправки заявки');
        }
    };

    const acceptRequest = async (id) => {
        try {
            await axios.post('http://localhost:5000/api/friends/accept', { requesterId: id }, authConfig);
            loadFriendsData(); // Перезагружаем списки
        } catch (err) {
            alert('Ошибка принятия заявки');
        }
    };

    return (
        <div className="sidebar">
            <h3>Поиск друзей 🔍</h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                <input
                    type="text"
                    placeholder="Никнейм..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '5px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
                <button type="submit">Искать</button>
            </form>

            {/* Результаты поиска */}
            {searchResults.map(user => (
                <div key={user._id} className="friend-item">
                    <span>{user.username}</span>
                    <button onClick={() => sendRequest(user._id)}>Добавить</button>
                </div>
            ))}

            {/* Входящие заявки */}
            {requests.length > 0 && (
                <>
                    <h4 style={{ color: 'red' }}>Новые заявки ({requests.length})</h4>
                    {requests.map(req => (
                        <div key={req._id} className="friend-item">
                            <span>{req.username}</span>
                            <button onClick={() => acceptRequest(req._id)}>Принять</button>
                        </div>
                    ))}
                </>
            )}

            {/* Список друзей */}
            <h4>Мои друзья</h4>
            {friends.length === 0 ? <p>У вас пока нет друзей.</p> : (
                friends.map(friend => (
                    <div key={friend._id} className="friend-item" onClick={() => onSelectFriend(friend)}>
                        <span>🟢 {friend.username}</span>
                        <button style={{ fontSize: '12px' }}>Чат</button>
                    </div>
                ))
            )}
        </div>
    );
};

export default Sidebar;