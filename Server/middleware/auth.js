const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Ищем токен в заголовках запроса
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ error: 'Нет доступа. Отсутствует токен.' });
    }

    try {
        // Убираем слово "Bearer ", если оно есть, и расшифровываем токен
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded; // Добавляем данные пользователя (его ID) в объект запроса
        next(); // Пропускаем запрос дальше к роутам
    } catch (err) {
        res.status(401).json({ error: 'Недействительный токен.' });
    }
};