const express = require('express');
const Message = require('../models/Message'); // Модель сообщений, которую мы создали ранее
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Получить историю переписки с конкретным другом
router.get('/:friendId', authMiddleware, async (req, res) => {
    try {
        const myId = req.user.id;
        const friendId = req.params.friendId;

        // Ищем сообщения, где либо я отправитель, а он получатель, либо наоборот
        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: friendId },
                { sender: friendId, receiver: myId }
            ]
        }).sort({ timestamp: 1 }); // Сортируем от старых к новым

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки истории сообщений' });
    }
});

module.exports = router;