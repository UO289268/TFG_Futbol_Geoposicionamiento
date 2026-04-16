import React from "react";
import fieldImg from "./field.png";

const Pitch = ({ players, frame, visiblePlayers, selectedPlayer }) => {
    if (!players || Object.keys(players).length === 0) return <div>Loading players...</div>;

    const widthPx = 1050;
    const heightPx = 680;

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

                // Color uniforme oscuro, pero resaltamos en rojo al jugador seleccionado
                const isSelected = dev === selectedPlayer;
                const backgroundColor = isSelected ? "#e74c3c" : "#2c3e50";

                return (
                    <div
                        key={dev}
                        style={{
                            position: "absolute",
                            left: `${lonToPx(pos.lon)}px`,
                            top: `${latToPx(pos.lat)}px`,
                            width: "24px",   // Ampliado para que quepa el dorsal
                            height: "24px",  // Ampliado para que quepa el dorsal
                            backgroundColor: backgroundColor,
                            borderRadius: "50%",
                            border: isSelected ? "2px solid #f1c40f" : "2px solid white",
                            transform: "translate(-50%, -50%)", // Centra el punto en la coordenada exacta

                            // Propiedades Flexbox para centrar el número dentro del círculo
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: "bold",
                            fontFamily: "Arial, sans-serif",
                            boxShadow: "0px 3px 5px rgba(0,0,0,0.4)", // Sombra para dar relieve
                            zIndex: isSelected ? 10 : 1, // El seleccionado siempre se dibuja por encima
                        }}
                        title={`Jugador ${dev}`}
                    >
                        {/* El número del dorsal renderizado dentro del punto */}
                        {dev}
                    </div>
                );
            })}
        </div>
    );
};

export default Pitch;