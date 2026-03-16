import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

// Стили для контейнера карты (на весь экран)
const containerStyle = {
    width: '100%',
    height: '100vh'
};

// Координаты по умолчанию (например, центр Москвы), если пользователь не дал доступ к GPS
const defaultCenter = {
    lat: 55.7558,
    lng: 37.6173
};

const MapComponent = () => {
    // Подключаем API Google Maps, используя наш скрытый ключ
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
    });

    const [currentPosition, setCurrentPosition] = useState(defaultCenter);

    useEffect(() => {
        // Запрашиваем геолокацию у браузера при загрузке компонента
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentPosition({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Ошибка получения геолокации. Разрешите доступ в браузере.", error);
                },
                { enableHighAccuracy: true } // Просим максимально точные координаты
            );
        }
    }, []);

    // Если скрипт Google Maps еще грузится, показываем текст
    if (!isLoaded) return <div>Загрузка карты...</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={currentPosition}
            zoom={16}
            options={{
                disableDefaultUI: true, // Убираем лишние кнопки Google для чистого "Zenly" дизайна
                zoomControl: false
            }}
        >
            {/* Ставим маркер на твои текущие координаты */}
            <Marker position={currentPosition} />
        </GoogleMap>
    );
};

export default MapComponent;