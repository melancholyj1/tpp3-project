import React, { useState } from 'react';
import axios from 'axios';

const MapSearch = ({ onSearchResults, token, mapCenter }) => {
    const [query, setQuery] = useState('');

    const executeSearch = async (searchQuery, category = 'search') => {
        if (!searchQuery.trim()) return;
        try {
            // Если есть центр карты, просим Nominatim искать ПРИОРИТЕТНО вокруг него
            const locationParams = mapCenter ? `&lat=${mapCenter.lat}&lon=${mapCenter.lng}` : '';
            const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}${locationParams}&limit=15`);

            if (response.data && response.data.length > 0) {
                // Преобразуем результаты
                const results = response.data.map(item => ({
                    id: item.place_id,
                    name: item.name || item.display_name.split(',')[0],
                    address: item.display_name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                    category: category
                }));
                onSearchResults(results);
            } else {
                alert('Места не найдены. Попробуйте уточнить город.');
            }
        } catch (err) {
            console.error('Ошибка поиска:', err);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        executeSearch(query);
    };

    const searchCategory = (categoryWord, label) => {
        // Добавляем текущий город в запрос, если он введен, или просто ищем по слову
        const fullQuery = query ? `${categoryWord} ${query}` : categoryWord;
        executeSearch(fullQuery, label);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <form className="map-search-container" onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Город или место..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                    🔍
                </button>
            </form>
            <div className="search-categories" style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                <button onClick={() => searchCategory('бар', 'bar')} style={btnStyle}>🍺 Бары</button>
                <button onClick={() => searchCategory('ресторан', 'restaurant')} style={btnStyle}>🍽️ Рестораны</button>
                <button onClick={() => searchCategory('театр', 'theater')} style={btnStyle}>🎭 Театры</button>
                <button onClick={() => searchCategory('кино', 'cinema')} style={btnStyle}>🍿 Кино</button>
            </div>
        </div>
    );
};

const btnStyle = {
    background: '#fff', border: '1px solid #ccc', borderRadius: '15px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

export default MapSearch;