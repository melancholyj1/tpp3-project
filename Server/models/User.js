const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    // Массив ID подтвержденных друзей
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Массив ID тех, кто отправил заявку в друзья
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // --- НОВОЕ: Сохраненные места (Избранное) ---
    savedPlaces: [{
        name: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String },
        category: { type: String }
    }],
    // Недавние поиски и места
    recentSearches: [{
        name: String,
        lat: Number,
        lng: Number,
        address: String,
        date: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('User', userSchema);