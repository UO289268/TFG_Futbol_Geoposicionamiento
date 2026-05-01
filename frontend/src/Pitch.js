import React from "react";
import fieldImg from "./field.png";

const Pitch = ({ players, frame, visiblePlayers, selectedPlayer, playerRoles, fieldLimits }) => {
    if (!players || Object.keys(players).length === 0) return <div style={{ color: "white" }}>Loading players...</div>;

    // Si todavía no han llegado los límites fijos desde el servidor, mostramos un aviso
    if (!fieldLimits) return <div style={{ color: "white" }}>Cargando dimensiones del campo...</div>;

    const widthPx = 1050;
    const heightPx = 680;

    // 📍 USAMOS LOS LÍMITES FIJOS DEL CAMPO SELECCIONADO EN GOOGLE MAPS
    const { maxLat, minLat, minLon, maxLon } = fieldLimits;

    // Ahora la conversión a píxeles es perfecta y no se deforma nunca
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
                // MUY IMPORTANTE: Esto oculta a los jugadores si se salen de los límites (ej. van al vestuario)
                overflow: "hidden"
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
                            transition: "background-color 0.3s ease, left 0.1s linear, top 0.1s linear" // Transición más fluida para el movimiento
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