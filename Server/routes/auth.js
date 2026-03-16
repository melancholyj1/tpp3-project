const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Хешируем пароль для кибербезопасности
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'Пользователь успешно создан!' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка регистрации (возможно, имя уже занято)' });
    }
});

// Авторизация (Вход)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        // Сравниваем введенный пароль с хешем в БД
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Неверный пароль' });

        // Выдаем токен доступа
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, username: user.username, id: user._id });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

module.exports = router;