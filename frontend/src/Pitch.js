import React from "react";
import fieldImg from "./field.png";

const Pitch = ({ players, frame }) => {
    if (!players || Object.keys(players).length === 0) return <div>Loading players...</div>;

    const widthPx = 1050;
    const heightPx = 680;

    // Asignar un color único a cada dorsal
    const colorPalette = ["red", "blue", "green", "orange", "purple", "cyan", "yellow", "pink"];
    const colors = {};
    Object.keys(players).forEach((dev, i) => {
        colors[dev] = colorPalette[i % colorPalette.length];
    });

    // Calcular límites globales
    // Calcular límites globales de forma eficiente
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
                const pos = positions[frame] || positions[positions.length - 1];
                if (!pos) return null; // protección extra

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
                        }}
                        title={`Jugador ${dev}`}
                    />
                );
            })}
        </div>
    );
};

export default Pitch;