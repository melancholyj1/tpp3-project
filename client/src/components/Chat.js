import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const Chat = ({ friend, onClose, socket, token }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);

    // Якорь для автоскролла в самый низ
    const messagesEndRef = useRef(null);

    // Функция автоматической прокрутки вниз
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Скроллим вниз при каждом изменении истории чата
    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    // 1. ЗАГРУЗКА ИСТОРИИ ИЗ БАЗЫ ДАННЫХ
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/messages/${friend._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Преобразуем формат базы данных в формат нашего UI
                const formattedHistory = res.data.map(msg => ({
                    senderId: msg.sender === friend._id ? friend._id : 'me',
                    text: msg.text
                }));

                setChatHistory(formattedHistory);
            } catch (err) {
                console.error('Ошибка загрузки истории чата', err);
            }
        };

        fetchHistory();
    }, [friend._id, token]);

    // 2. СЛУШАЕМ НОВЫЕ СООБЩЕНИЯ В РЕАЛЬНОМ ВРЕМЕНИ
    useEffect(() => {
        if (!socket) return;

        const receiveMessageHandler = (msgData) => {
            if (msgData.senderId === friend._id) {
                setChatHistory(prev => [...prev, msgData]);
            }
        };

        socket.on('receiveMessage', receiveMessageHandler);

        return () => {
            socket.off('receiveMessage', receiveMessageHandler);
        };
    }, [socket, friend]);

    // 3. ОТПРАВКА СООБЩЕНИЯ
    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket) return;

        const msgData = {
            receiverId: friend._id,
            text: message,
        };

        // Отправляем на сервер (а он уже запишет в БД)
        socket.emit('sendMessage', msgData);

        // Сразу добавляем в свой интерфейс
        setChatHistory(prev => [...prev, { ...msgData, senderId: 'me', text: message }]);
        setMessage('');
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <span>Чат с {friend.username}</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            </div>

            <div className="chat-messages">
                {chatHistory.map((msg, index) => (
                    <div key={index} style={{
                        alignSelf: msg.senderId === 'me' ? 'flex-end' : 'flex-start',
                        background: msg.senderId === 'me' ? '#dcf8c6' : '#fff',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        maxWidth: '80%',
                        wordWrap: 'break-word',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                        {msg.text}
                    </div>
                ))}
                {/* Невидимый элемент, к которому мы скроллим */}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="chat-input-area">
                <input
                    type="text"
                    placeholder="Написать сообщение..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#007bff', color: 'white', cursor: 'pointer' }}>
                    Отправить
                </button>
            </form>
        </div>
    );
};

export default Chat;