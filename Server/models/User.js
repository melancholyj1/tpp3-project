const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    isOnline: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);