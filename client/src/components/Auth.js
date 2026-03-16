import React, { useState } from 'react';
import axios from 'axios';

const Auth = ({ setToken }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Очищаем старые ошибки перед новым запросом

        // Базовая клиентская валидация (снижает лишнюю нагрузку на сервер)
        if (username.trim().length < 3) {
            return setError('Логин должен содержать минимум 3 символа.');
        }
        if (password.length < 6) {
            return setError('Пароль должен быть не короче 6 символов.');
        }

        setIsLoading(true);
        const endpoint = isLogin ? '/login' : '/register';

        try {
            // Отправляем данные на наш Node.js бэкенд
            const response = await axios.post(`http://localhost:5000/api/auth${endpoint}`, {
                username: username.trim(), // Убираем случайные пробелы по краям
                password
            });

            if (!isLogin) {
                // Успешная регистрация
                setIsLogin(true); // Переключаем пользователя на форму входа
                setPassword(''); // В целях безопасности очищаем поле пароля
                alert('Регистрация прошла успешно! Теперь вы можете войти.');
            } else {
                // Успешный вход
                const token = response.data.token;
                localStorage.setItem('zenly_token', token); // Прячем токен в память браузера
                setToken(token); // Передаем токен в App.js, чтобы открыть карту
            }
        } catch (err) {
            // Перехватываем ошибки от сервера (например, "Неверный пароль" или "Имя занято")
            setError(err.response?.data?.error || 'Произошла ошибка связи с сервером.');
        } finally {
            setIsLoading(false); // Разблокируем кнопку в любом случае (успех или ошибка)
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError(''); // Очищаем ошибки при переключении режима
    };

    return (
        <div className="auth-container" style={styles.container}>
            <div style={styles.card}>
                <h2>{isLogin ? 'Вход в систему' : 'Регистрация'}</h2>

                {/* Блок вывода ошибок */}
                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        type="text"
                        placeholder="Имя пользователя"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                        style={styles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        style={styles.input}
                        required
                    />
                    <button type="submit" disabled={isLoading} style={styles.button}>
                        {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                    </button>
                </form>

                <p onClick={toggleMode} style={styles.toggleText}>
                    {isLogin ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
                </p>
            </div>
        </div>
    );
};

// Простые встроенные стили, чтобы форма выглядела аккуратно по центру экрана.
// Позже их можно будет вынести в App.css или mobile.css
const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f2f5',
        fontFamily: 'sans-serif'
    },
    card: {
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        marginTop: '20px'
    },
    input: {
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: '16px',
        outline: 'none'
    },
    button: {
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#007bff',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.3s'
    },
    error: {
        color: '#d93025',
        backgroundColor: '#fce8e6',
        padding: '10px',
        borderRadius: '8px',
        marginTop: '15px',
        fontSize: '14px'
    },
    toggleText: {
        marginTop: '20px',
        color: '#007bff',
        cursor: 'pointer',
        fontSize: '14px'
    }
};

export default Auth;