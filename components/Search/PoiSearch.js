/**
 * components/Search/PoiSearch.js — Поиск мест (POI)
 * 
 * Верхняя панель поиска поверх карты с frosted glass эффектом.
 * Включает:
 * - Строку поиска (как в Google Maps)
 * - Быстрые фильтры-чипсы (Бары, Рестораны, Кафе, Театры, ...)
 * - Список результатов с фотографиями
 * 
 * При клике на результат — карта перемещается к месту,
 * а на карте появляется маркер с popup.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './Search.module.css';

// Быстрые категории
const CATEGORIES = [
  { id: 'restaurant', emoji: '🍽️', label: 'Рестораны' },
  { id: 'bar', emoji: '🍻', label: 'Бары' },
  { id: 'cafe', emoji: '☕', label: 'Кафе' },
  { id: 'theater', emoji: '🎭', label: 'Театры' },
  { id: 'cinema', emoji: '🎬', label: 'Кинотеатры' },
  { id: 'museum', emoji: '🏛️', label: 'Музеи' },
  { id: 'park', emoji: '🌳', label: 'Парки' },
  { id: 'pharmacy', emoji: '💊', label: 'Аптеки' },
  { id: 'gym', emoji: '💪', label: 'Спортзалы' },
  { id: 'shopping', emoji: '🛍️', label: 'Магазины' },
];

export default function PoiSearch({ userPosition, onResults }) {
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef(null);

  /**
   * Выполняет поиск по запросу или категории.
   */
  const doSearch = async (searchQuery) => {
    if (!userPosition) return;

    setLoading(true);
    setShowResults(true);

    try {
      const params = new URLSearchParams({
        query: searchQuery,
        lat: userPosition[0].toString(),
        lng: userPosition[1].toString(),
        limit: '15',
      });

      const res = await fetch(`/api/places?${params}`);
      if (!res.ok) {
        console.error('Search error:', res.status);
        setResults([]);
        return;
      }

      const data = await res.json();
      const places = data.places || [];
      setResults(places);

      // Передаём маркеры наверх для отрисовки на карте
      if (onResults) {
        onResults(places);
      }
    } catch (err) {
      console.error('Search fetch error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Обработчик поисковой строки (с debounce 500ms).
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setActiveChip(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        doSearch(value.trim());
      }, 500);
    } else if (value.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      if (onResults) onResults([]);
    }
  };

  /**
   * Клик по чипсу категории.
   */
  const handleChipClick = (category) => {
    if (activeChip === category.id) {
      // Повторный клик — снимаем фильтр
      setActiveChip(null);
      setResults([]);
      setShowResults(false);
      if (onResults) onResults([]);
      return;
    }

    setActiveChip(category.id);
    setQuery('');
    doSearch(category.label);
  };

  /**
   * Клик по результату — перемещаем карту.
   */
  const handleResultClick = (place) => {
    if (!place.geocodes?.main) return;
    // Передаём только этот один маркер (выделяем его)
    if (onResults) {
      onResults([place]);
    }
    setShowResults(false);
  };

  /**
   * Отправка формы поиска.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      doSearch(query.trim());
    }
  };

  /**
   * Очистка поиска.
   */
  const handleClear = () => {
    setQuery('');
    setActiveChip(null);
    setResults([]);
    setShowResults(false);
    if (onResults) onResults([]);
  };

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  return (
    <div className={styles.searchOverlay}>
      {/* Строка поиска */}
      <form className={styles.searchBar} onSubmit={handleSubmit} id="poi-search-form">
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Поиск мест рядом..."
          value={query}
          onChange={handleInputChange}
          id="poi-search-input"
        />
        {(query || activeChip) && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            title="Очистить"
          >
            ✕
          </button>
        )}
        <button type="submit" className={styles.searchBtn} id="poi-search-btn">
          →
        </button>
      </form>

      {/* Чипсы категорий */}
      <div className={styles.chips}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.chip} ${activeChip === cat.id ? styles.active : ''}`}
            onClick={() => handleChipClick(cat)}
            id={`chip-${cat.id}`}
          >
            <span className={styles.chipEmoji}>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Список результатов */}
      {showResults && (
        <div className={styles.results}>
          {loading ? (
            <div className={styles.loadingResults}>
              <div className="spinner" />
            </div>
          ) : results.length > 0 ? (
            results.map((place) => (
              <div
                key={place.fsq_id}
                className={styles.resultItem}
                onClick={() => handleResultClick(place)}
              >
                {/* Фото */}
                {place.photoUrl ? (
                  <img
                    src={place.photoUrl}
                    alt={place.name}
                    className={styles.resultPhoto}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={styles.resultNoPhoto}>📍</div>
                )}

                {/* Информация */}
                <div className={styles.resultInfo}>
                  <div className={styles.resultName}>{place.name}</div>
                  {place.categories?.[0]?.name && (
                    <div className={styles.resultCategory}>{place.categories[0].name}</div>
                  )}
                  {place.location?.formatted_address && (
                    <div className={styles.resultAddress}>{place.location.formatted_address}</div>
                  )}
                  {place.distance !== undefined && (
                    <div className={styles.resultDistance}>
                      {place.distance < 1000
                        ? `${place.distance} м`
                        : `${(place.distance / 1000).toFixed(1)} км`}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.noResults}>Ничего не найдено 😕</div>
          )}
        </div>
      )}
    </div>
  );
}
