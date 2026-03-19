const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth'); // ИСПОЛЬЗУЕМ СТАНДАРТНЫЙ MIDDLEWARE

router.use(authMiddleware);

// ========================
// СОХРАНЕННЫЕ МЕСТА (SAVED)
// ========================

// Получить сохраненные места
router.get('/saved', async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ savedPlaces: user.savedPlaces || [] });
    } catch (err) {
        console.error("Ошибка при получении сохраненных мест:", err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить или удалить место (Toggle)
router.post('/saved', async (req, res) => {
    const { name, lat, lng, address, category } = req.body;
    try {
        const user = await User.findById(req.user.id);
        
        // Проверяем, есть ли уже такое место (сравниваем координаты с небольшой погрешностью или просто по имени/координатам)
        // Для простоты сравниваем точные координаты
        const existingIndex = user.savedPlaces.findIndex(p => p.lat === lat && p.lng === lng);
        
        if (existingIndex !== -1) {
            // Удаляем
            user.savedPlaces.splice(existingIndex, 1);
            await user.save();
            return res.status(200).json({ message: 'Место удалено из сохраненных', savedPlaces: user.savedPlaces });
        } else {
            // Добавляем
            user.savedPlaces.push({ name, lat, lng, address, category });
            await user.save();
            return res.status(200).json({ message: 'Место сохранено', savedPlaces: user.savedPlaces });
        }
    } catch (err) {
        console.error("Ошибка при сохранении места:", err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// ========================
// НЕДАВНИЕ ПОИСКИ (RECENT)
// ========================

// Получить недавние поиски
router.get('/recent', async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        // Сортируем по дате (новые сверху)
        const recent = (user.recentSearches || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        res.status(200).json({ recentSearches: recent });
    } catch (err) {
        console.error("Ошибка при получении недавних мест:", err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить в недавние
router.post('/recent', async (req, res) => {
    const { name, lat, lng, address, category } = req.body;
    try {
        const user = await User.findById(req.user.id);
        
        // Удаляем дубликат, если он уже есть (чтобы переместить наверх)
        user.recentSearches = user.recentSearches.filter(p => !(p.lat === lat && p.lng === lng));
        
        // Добавляем в начало
        user.recentSearches.unshift({ name, lat, lng, address, category, date: new Date() });
        
        // Ограничиваем список (например, 15 элементов)
        if (user.recentSearches.length > 15) {
            user.recentSearches = user.recentSearches.slice(0, 15);
        }
        
        await user.save();
        res.status(200).json({ recentSearches: user.recentSearches });
    } catch (err) {
        console.error("Ошибка при добавлении в недавние:", err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
