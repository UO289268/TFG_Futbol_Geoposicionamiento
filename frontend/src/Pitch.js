import React from "react";
import fieldImg from "./field.png";

const Pitch = ({ players, frame, visiblePlayers }) => {
    if (!players || Object.keys(players).length === 0) return <div>Loading players...</div>;

    const widthPx = 1050;
    const heightPx = 680;

    // Asignar un color único a cada dorsal
    const colorPalette = ["red", "blue", "green", "orange", "purple", "cyan", "yellow", "pink"];
    const colors = {};
    Object.keys(players).forEach((dev, i) => {
        colors[dev] = colorPalette[i % colorPalette.length];
    });

    // Calcular límites globales de forma eficiente (usando SIEMPRE todos los jugadores)
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    Object.values(players).forEach(positions => {
        positions.forEach(pos => {
            if (pos.lat < minLat) minLat = pos.lat;
            if (pos.lat > maxLat) maxLat = pos.lat;
            if (pos.lon < minLon) minLon = pos.lon;
            if (pos.lon > maxLon) maxLon = pos.lon;
        });
    });

    const latToPx = lat => ((maxLat - lat) / (maxLat - minLat)) * heightPx;
    const lonToPx = lon => ((lon - minLon) / (maxLon - minLon)) * widthPx;

    return (
        <div
            style={{
                width: widthPx,
                height: heightPx,
                position: "relative",
                backgroundImage: `url(${fieldImg})`,
                backgroundSize: "cover",
                border: "2px solid #333",
            }}
        >
            {Object.entries(players).map(([dev, positions]) => {
                // 🛑 FILTRO VISUAL: Si el jugador no está en la lista de visibles, no lo dibujamos
                if (visiblePlayers && !visiblePlayers.includes(dev)) return null;

                const pos = positions[frame] || positions[positions.length - 1];
                if (!pos) return null;

                return (
                    <div
                        key={dev}
                        style={{
                            position: "absolute",
                            left: `${lonToPx(pos.lon)}px`,
                            top: `${latToPx(pos.lat)}px`,
                            width: "12px",
                            height: "12px",
                            backgroundColor: colors[dev],
                            borderRadius: "50%",
                            border: "1px solid white",
                            transform: "translate(-50%, -50%)", // Centra el punto en la coordenada exacta
                        }}
                        title={`Jugador ${dev}`}
                    />
                );
            })}
        </div>
    );
};

export default Pitch;