// client/src/components/MapComponent.js
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Фикс иконок Leaflet ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow,
    iconSize: [25, 41], iconAnchor: [12, 41]
});

// Иконка для СОХРАНЕННЫХ мест (желтая)
let SavedIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41], iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
// ----------------------------

// Координаты по умолчанию (например, центр Москвы)
const defaultCenter = { lat: 55.7558, lng: 37.6173 };

// Вспомогательный компонент для полета камеры при ПОИСКЕ ГРУППЫ МЕСТ
const SearchMapCenter = ({ searchResults, onCenterChange }) => {
    const map = useMap();
    useEffect(() => {
        if (searchResults && searchResults.length > 0) {
            if (searchResults.length === 1) {
                map.flyTo([searchResults[0].lat, searchResults[0].lng], 14);
            } else {
                const bounds = L.latLngBounds(searchResults.map(res => [res.lat, res.lng]));
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [searchResults, map]);

    // Непрерывно передаем центр карты наверх (для поиска POI)
    useEffect(() => {
        const handleMoveEnd = () => {
            const center = map.getCenter();
            if (onCenterChange) {
                onCenterChange({ lat: center.lat, lng: center.lng });
            }
        };
        map.on('moveend', handleMoveEnd);
        // Отправляем первоначальный центр
        handleMoveEnd();
        
        return () => {
            map.off('moveend', handleMoveEnd);
        };
    }, [map, onCenterChange]);

    return null;
};

const MapComponent = ({ socket, searchResults, savedPlaces = [], onSavePlace, onPlaceClick, onCenterChange }) => {
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

            {/* Только для полета камеры при поиске по всей планете и трекинга центра */}
            <SearchMapCenter searchResults={searchResults} onCenterChange={onCenterChange} />

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
                user.location && user.location.lat ? (
                    <Marker
                        key={`friend-${user.id}`}
                        position={[user.location.lat, user.location.lng]}
                    >
                        <Tooltip permanent direction="top" offset={[0, -30]}>
                            {user.username || "Брат на радаре"}
                        </Tooltip>
                    </Marker>
                ) : null
            ))}

            {/* Маркеры результатов поиска (Бары, Театры и т.д.) */}
            {searchResults && searchResults.map((place, idx) => {
                // Ищем по координатам, сохранен ли он
                const isSaved = savedPlaces.some(p => Math.abs(p.lat - place.lat) < 0.0001 && Math.abs(p.lng - place.lng) < 0.0001);
                return (
                    <Marker 
                        key={`search-${idx}`} 
                        position={[place.lat, place.lng]}
                        eventHandlers={{
                            click: () => {
                                if (onPlaceClick) onPlaceClick(place);
                            }
                        }}
                    >
                        <Popup>
                            <div style={{ textAlign: 'center' }}>
                                <strong>{place.name}</strong><br/>
                                <span style={{ fontSize: '11px', color: '#666' }}>{place.address}</span><br/>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation(); // Предотвращаем двойные клики
                                        onSavePlace(place);
                                    }}
                                    style={{ marginTop: '10px', cursor: 'pointer', background: isSaved ? '#ffdd57' : '#eee', border: '1px solid #ccc', borderRadius: '5px', padding: '5px 10px' }}
                                >
                                    {isSaved ? '⭐ Сохранено' : '⭐ Сохранить'}
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            {/* Маркеры сохраненных мест (Отображаются всегда) */}
            {savedPlaces && savedPlaces.map((place, idx) => (
                <Marker 
                    key={`saved-${idx}`} 
                    position={[place.lat, place.lng]} 
                    icon={SavedIcon}
                    eventHandlers={{
                        click: () => {
                            if (onPlaceClick) onPlaceClick(place);
                        }
                    }}
                >
                    <Tooltip direction="top" offset={[0, -30]}>
                        ⭐ {place.name}
                    </Tooltip>
                    <Popup>
                        <div style={{ textAlign: 'center' }}>
                            <strong>⭐ {place.name}</strong><br/>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSavePlace(place);
                                }}
                                style={{ marginTop: '5px', cursor: 'pointer', background: '#ffdd57', border: '1px solid #ccc', borderRadius: '5px' }}
                            >
                                Удалить из сохраненных
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default MapComponent;