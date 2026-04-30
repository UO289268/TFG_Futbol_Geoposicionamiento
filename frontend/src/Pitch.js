import React from "react";
import fieldImg from "./field.png";

const Pitch = ({ players, frame, visiblePlayers, selectedPlayer, playerRoles }) => {
    if (!players || Object.keys(players).length === 0) return <div style={{ color: "white" }}>Loading players...</div>;

    const widthPx = 1050;
    const heightPx = 680;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    Object.values(players).forEach(positions => {
        positions.forEach(pos => {
            if (!pos) return;
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
                boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
            }}
        >
            {Object.entries(players).map(([dev, positions]) => {
                // Si está en el banquillo (o no visible), no lo dibujamos
                if (visiblePlayers && !visiblePlayers.includes(dev)) return null;

                const pos = positions[frame];
                if (!pos) return null;

                // --- LÓGICA DE COLORES SEGÚN POSICIÓN ---
                const role = playerRoles && playerRoles[dev] ? playerRoles[dev] : "Banquillo";
                let bgColor = "#000000"; // Negro para Banquillo por defecto

                if (role === "Defensa") bgColor = "#3498db";   // Azul
                if (role === "Medio") bgColor = "#f1c40f";     // Amarillo
                if (role === "Delantero") bgColor = "#e74c3c"; // Rojo

                const isSelected = dev === selectedPlayer;

                return (
                    <div
                        key={dev}
                        style={{
                            position: "absolute",
                            left: `${lonToPx(pos.lon)}px`,
                            top: `${latToPx(pos.lat)}px`,
                            width: isSelected ? "28px" : "24px",
                            height: isSelected ? "28px" : "24px",
                            backgroundColor: bgColor,
                            borderRadius: "50%",
                            border: isSelected ? "3px solid white" : "2px solid rgba(255,255,255,0.7)",
                            transform: "translate(-50%, -50%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: role === "Medio" ? "black" : "white", // Para que el texto se lea bien en amarillo
                            fontSize: isSelected ? "13px" : "11px",
                            fontWeight: "bold",
                            fontFamily: "Arial, sans-serif",
                            boxShadow: isSelected ? "0px 0px 10px white" : "0px 3px 5px rgba(0,0,0,0.4)",
                            zIndex: isSelected ? 10 : 1,
                            transition: "background-color 0.3s ease, width 0.2s, height 0.2s" // Suaviza el cambio
                        }}
                        title={`Dorsal ${dev} - ${role}`}
                    >
                        {dev}
                    </div>
                );
            })}
        </div>
    );
};

export default Pitch;