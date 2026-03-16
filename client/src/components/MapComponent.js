// client/src/components/MapComponent.js
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Фикс иконок Leaflet ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow,
    iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// ----------------------------

// Координаты по умолчанию (например, центр Москвы)
const defaultCenter = { lat: 55.7558, lng: 37.6173 };

// Вспомогательный компонент для полета камеры при ПОИСКЕ
const SearchMapCenter = ({ searchedLocation }) => {
    const map = useMap();
    useEffect(() => {
        // Если мы искали город, летим туда один раз
        if (searchedLocation) {
            map.flyTo([searchedLocation.lat, searchedLocation.lng], 12);
        }
    }, [searchedLocation, map]);
    return null;
};

const MapComponent = ({ socket, searchedLocation }) => {
    const [myPosition, setMyPosition] = useState(null);
    const [friendsLocations, setFriendsLocations] = useState([]);
    const [hasAcquiredInitialPosition, setHasAcquiredInitialPosition] = useState(false);
    const [initialMapPosition, setInitialMapPosition] = useState(null);

    // --- 1. ПЕРВОНАЧАЛЬНОЕ ЦЕНТРИРОВАНИЕ КАРТЫ (Acquire Once) ---
    // Получаем координаты один раз, чтобы карта на старте показала твой город
    useEffect(() => {
        if (!navigator.geolocation || hasAcquiredInitialPosition) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                setInitialMapPosition(pos); // Это для центра MapContainer
                setHasAcquiredInitialPosition(true); // Больше не запускаем этот useEffect

                // Обновляем continuous позицию тоже
                setMyPosition(pos);
                if (socket) {
                    socket.emit('sendLocation', pos);
                }
            },
            (error) => console.error("Initial GPS error:", error),
            { enableHighAccuracy: true }
        );
    }, [hasAcquiredInitialPosition]);

    // --- 2. НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ ПОЗИЦИИ (Panning only) ---
    // Только для движения маркеров на карте, БЕЗ flyTo
    useEffect(() => {
        if (!navigator.geolocation || !hasAcquiredInitialPosition) return;

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                setMyPosition(newLocation); // Только двигаем свой маркер

                // Отправляем на сервер для трансляции друзьям
                if (socket) {
                    socket.emit('sendLocation', newLocation);
                }
                // map.flyTo(...) НЕТ! Пользователь может свободно панорамировать карту
            },
            (error) => console.error("GPS watch error:", error),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, [hasAcquiredInitialPosition, socket]); // Зависит от первоначального получения

    // 3. Слушаем координаты других пользователей (ОПТИМИЗИРОВАНО)
    useEffect(() => {
        if (!socket) return;

        // Выносим функцию отдельно
        const handleUpdateLocations = (users) => {
            setFriendsLocations(users);
        };

        socket.on('updateLocations', handleUpdateLocations);

        // КРИТИЧЕСКИ ВАЖНО: Функция очистки. Удаляем слушателя перед новым рендером.
        // Именно отсутствие этой строчки сжирало твою оперативку!
        return () => {
            socket.off('updateLocations', handleUpdateLocations);
        };
    }, [socket]);

    // Пока не получим первую координату, не рисуем карту, иначе Leaflet выдаст ошибку
    if (!hasAcquiredInitialPosition) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
                <h3>Ищем спутники... Разрешите доступ к геопозиции в браузере. 🛰️</h3>
            </div>
        );
    }

    return (
        <MapContainer
            center={initialMapPosition || defaultCenter} // Карта центрируется ОДИН РАЗ на initialMapPosition при загрузке
            zoom={16}
            style={{ width: '100%', height: '100vh' }}
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Только для полета камеры при поиске по всей планете */}
            <SearchMapCenter searchedLocation={searchedLocation} />

            {/* Твой маркер, только он движется, а карта нет */}
            {myPosition && (
                <Marker position={[myPosition.lat, myPosition.lng]}>
                    <Tooltip permanent direction="top" offset={[0, -30]}>
                        Я
                    </Tooltip>
                </Marker>
            )}

            {/* Маркеры остальных пользователей */}
            {friendsLocations.map((user) => (
                user.location && user.location.lat ? ( // Убрали кривую проверку socket.id
                    <Marker
                        key={user.id}
                        position={[user.location.lat, user.location.lng]}
                    >
                        <Tooltip permanent direction="top" offset={[0, -30]}>
                            {user.username || "Брат на радаре"}
                        </Tooltip>
                    </Marker>
                ) : null
            ))}
        </MapContainer>
    );
};

export default MapComponent;