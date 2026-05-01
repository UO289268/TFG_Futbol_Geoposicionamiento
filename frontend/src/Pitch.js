import React from "react";
import fieldImg from "./field.png";

const Pitch = ({ players, frame, visiblePlayers, selectedPlayer, playerRoles, fieldLimits, showLines }) => {
    if (!players || Object.keys(players).length === 0) return <div style={{ color: "white" }}>Loading players...</div>;
    if (!fieldLimits) return <div style={{ color: "white" }}>Cargando dimensiones del campo...</div>;

    const widthPx = 1050;
    const heightPx = 680;

    const { maxLat, minLat, minLon, maxLon } = fieldLimits;

    const latToPx = lat => ((maxLat - lat) / (maxLat - minLat)) * heightPx;
    const lonToPx = lon => ((lon - minLon) / (maxLon - minLon)) * widthPx;

    // --- LÓGICA PARA LÍNEAS TÁCTICAS ---
    const defensas = [];
    const medios = [];
    const delanteros = [];

    // Agrupamos las coordenadas de los jugadores visibles según su rol
    Object.entries(players).forEach(([dev, positions]) => {
        if (visiblePlayers && !visiblePlayers.includes(dev)) return;
        const pos = positions[frame];
        if (!pos) return;

        const role = playerRoles && playerRoles[dev] ? playerRoles[dev] : "Banquillo";
        if (role === "Banquillo") return;

        const pxData = { x: lonToPx(pos.lon), y: latToPx(pos.lat) };

        if (role === "Defensa") defensas.push(pxData);
        if (role === "Medio") medios.push(pxData);
        if (role === "Delantero") delanteros.push(pxData);
    });

    // Ordenamos por el eje Y (ancho del campo) para que la línea no haga zig-zags raros
    defensas.sort((a, b) => a.y - b.y);
    medios.sort((a, b) => a.y - b.y);
    delanteros.sort((a, b) => a.y - b.y);

    // Función para crear el trazado de la línea SVG
    const createPolyline = (points, color) => {
        if (points.length < 2) return null; // Necesitamos al menos 2 jugadores para hacer una línea
        const pointsString = points.map(p => `${p.x},${p.y}`).join(" ");
        return (
            <polyline
                points={pointsString}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeDasharray="8,5" // Línea punteada táctica
                opacity="0.8"
                style={{ transition: "all 0.1s linear" }}
            />
        );
    };

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
                overflow: "hidden"
            }}
        >
            {/* CAPA SVG PARA LÍNEAS TÁCTICAS (Se pone por debajo de los jugadores) */}
            {showLines && (
                <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, zIndex: 5, pointerEvents: "none" }}>
                    {createPolyline(defensas, "#3498db")}   {/* Azul */}
                    {createPolyline(medios, "#f1c40f")}     {/* Amarillo */}
                    {createPolyline(delanteros, "#e74c3c")} {/* Rojo */}
                </svg>
            )}

            {/* DIBUJO DE LOS JUGADORES */}
            {Object.entries(players).map(([dev, positions]) => {
                if (visiblePlayers && !visiblePlayers.includes(dev)) return null;

                const pos = positions[frame];
                if (!pos) return null;

                const role = playerRoles && playerRoles[dev] ? playerRoles[dev] : "Banquillo";
                let bgColor = "#000000";

                if (role === "Defensa") bgColor = "#3498db";
                if (role === "Medio") bgColor = "#f1c40f";
                if (role === "Delantero") bgColor = "#e74c3c";

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
                            color: role === "Medio" ? "black" : "white",
                            fontSize: isSelected ? "13px" : "11px",
                            fontWeight: "bold",
                            fontFamily: "Arial, sans-serif",
                            boxShadow: isSelected ? "0px 0px 10px white" : "0px 3px 5px rgba(0,0,0,0.4)",
                            zIndex: 10, // Por encima de las líneas SVG
                            transition: "background-color 0.3s ease, left 0.1s linear, top 0.1s linear"
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