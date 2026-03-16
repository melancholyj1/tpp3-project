import React, { useState } from 'react';
import axios from 'axios';

const MapSearch = ({ onLocationFound }) => {
    const [query, setQuery] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        try {
            // Запрос к бесплатному геокодеру OSM
            const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);

            if (response.data && response.data.length > 0) {
                // Берем первый результат
                const { lat, lon } = response.data[0];
                onLocationFound({ lat: parseFloat(lat), lng: parseFloat(lon) });
            } else {
                alert('Место не найдено');
            }
        } catch (err) {
            console.error('Ошибка поиска:', err);
        }
    };

    return (
        <form className="map-search-container" onSubmit={handleSearch}>
            <input
                type="text"
                placeholder="Поиск на Карте..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                🔍
            </button>
        </form>
    );
};

export default MapSearch;