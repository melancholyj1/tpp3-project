import React, { useState, useEffect } from 'react';

const Chat = ({ friend, onClose, socket }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);

    useEffect(() => {
        if (!socket) return;

        // Слушаем входящие сообщения от сервера
        const receiveMessageHandler = (msgData) => {
            // Если сообщение от текущего друга или от нас самих (чтобы отобразить отправленное)
            if (msgData.senderId === friend._id || msgData.receiverId === friend._id) {
                setChatHistory(prev => [...prev, msgData]);
            }
        };

        socket.on('receiveMessage', receiveMessageHandler);

        // Очистка слушателя при закрытии чата
        return () => {
            socket.off('receiveMessage', receiveMessageHandler);
        };
    }, [socket, friend]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket) return;

        const msgData = {
            receiverId: friend._id,
            text: message,
            // React автоматически защитит нас от XSS при выводе msgData.text в DOM
        };

        // Отправляем на сервер
        socket.emit('sendMessage', msgData);

        // Сразу добавляем в свой UI
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
                        {/* Вот здесь React делает магию: любой XSS код превратится в обычный текст */}
                        {msg.text}
                    </div>
                ))}
            </div>

            <form onSubmit={sendMessage} className="chat-input-area">
                <input
                    type="text"
                    placeholder="Напишите сообщение..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit">Отправить</button>
            </form>
        </div>
    );
};

export default Chat;