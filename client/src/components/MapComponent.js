import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Обязательный импорт стилей Leaflet

// --- Фикс для отображения стандартных иконок в React ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// --------------------------------------------------------

// Вспомогательный компонент, чтобы карта двигалась за тобой
const UpdateMapCenter = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo([position.lat, position.lng], map.getZoom());
        }
    }, [position, map]);
    return null;
};

const MapComponent = ({ socket }) => {
    const [myPosition, setMyPosition] = useState(null);
    const [friendsLocations, setFriendsLocations] = useState([]);

    // 1. Отслеживаем свои координаты и отправляем на сервер
    useEffect(() => {
        if (!navigator.geolocation) {
            console.error("Геолокация не поддерживается вашим браузером");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                setMyPosition(newLocation);

                if (socket) {
                    socket.emit('sendLocation', newLocation);
                }
            },
            (error) => console.error("Ошибка GPS:", error),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [socket]);

    // 2. Слушаем координаты других пользователей
    useEffect(() => {
        if (socket) {
            socket.on('updateLocations', (users) => {
                setFriendsLocations(users);
            });
        }
    }, [socket]);

    // Пока не получим первую координату, не рисуем карту, иначе Leaflet выдаст ошибку
    if (!myPosition) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
                <h3>Ищем спутники... Разрешите доступ к геопозиции в браузере. 🛰️</h3>
            </div>
        );
    }

    return (
        <MapContainer
            center={[myPosition.lat, myPosition.lng]}
            zoom={16}
            style={{ width: '100%', height: '100vh' }}
            zoomControl={false} // Отключаем кнопки +/-, как в Zenly
        >
            {/* Подключаем бесплатные тайлы (картинки карты) от OpenStreetMap */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Центрируем карту при движении */}
            <UpdateMapCenter position={myPosition} />

            {/* Твой маркер */}
            <Marker position={[myPosition.lat, myPosition.lng]}>
                <Tooltip permanent direction="top" offset={[0, -30]}>
                    Я
                </Tooltip>
            </Marker>

            {/* Маркеры остальных пользователей */}
            {friendsLocations.map((user) => (
                user.location && user.location.lat && user.id !== socket?.id ? (
                    <Marker
                        key={user.id}
                        position={[user.location.lat, user.location.lng]}
                    >
                        <Tooltip permanent direction="top" offset={[0, -30]}>
                            {user.username || "Пользователь"}
                        </Tooltip>
                    </Marker>
                ) : null
            ))}
        </MapContainer>
    );
};

export default MapComponent;