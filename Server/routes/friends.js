const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 1. Поиск пользователей по никнейму (чтобы добавить в друзья)
router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { username } = req.query;
        // Ищем совпадения (без учета регистра), исключая самого себя
        const users = await User.find({
            username: { $regex: username, $options: 'i' },
            _id: { $ne: req.user.id }
        }).select('username _id'); // Возвращаем только имя и ID, скрывая пароли и координаты

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка поиска' });
    }
});

// 2. Отправка заявки в друзья
router.post('/request', authMiddleware, async (req, res) => {
    try {
        const { targetUserId } = req.body;

        // Находим того, кому отправляем заявку, и добавляем наш ID ему в friendRequests
        await User.findByIdAndUpdate(targetUserId, {
            $addToSet: { friendRequests: req.user.id } // $addToSet предотвращает дубликаты
        });

        res.json({ message: 'Заявка отправлена!' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка при отправке заявки' });
    }
});

// 3. Принятие заявки
router.post('/accept', authMiddleware, async (req, res) => {
    try {
        const { requesterId } = req.body;
        const myId = req.user.id;

        // Обоюдно добавляем друг друга в массив friends
        await User.findByIdAndUpdate(myId, {
            $pull: { friendRequests: requesterId }, // Удаляем из заявок
            $addToSet: { friends: requesterId }     // Добавляем в друзья
        });

        await User.findByIdAndUpdate(requesterId, {
            $addToSet: { friends: myId }
        });

        res.json({ message: 'Заявка принята! Теперь вы друзья.' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка при принятии заявки' });
    }
});

// 4. Получение списка своих друзей и входящих заявок
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Используем .populate(), чтобы вместо голых ID получить имена пользователей
        const me = await User.findById(req.user.id)
            .populate('friends', 'username')
            .populate('friendRequests', 'username');

        res.json({
            friends: me.friends,
            friendRequests: me.friendRequests
        });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка получения списка друзей' });
    }
});
// 5. Удаление из друзей
router.post('/remove', authMiddleware, async (req, res) => {
    try {
        const { friendId } = req.body;
        const myId = req.user.id;

        // $pull удаляет указанный ID из массива
        await User.findByIdAndUpdate(myId, {
            $pull: { friends: friendId }
        });

        await User.findByIdAndUpdate(friendId, {
            $pull: { friends: myId }
        });

        res.json({ message: 'Пользователь удален из друзей' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка при удалении из друзей' });
    }
});
module.exports = router;