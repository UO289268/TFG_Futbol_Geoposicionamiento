import React, { useEffect, useRef } from "react";
import fieldImg from "./field.png";

const Pitch = ({ players, frame, visiblePlayers, selectedPlayer, playerRoles, fieldLimits, showLines, roles, speed, heatmapMode, heatmapData }) => {
    const canvasRef = useRef(null);

    const widthPx = 1050;
    const heightPx = 680;

    const safeLimits = fieldLimits || { maxLat: 1, minLat: 0, minLon: 0, maxLon: 1 };
    const { maxLat, minLat, minLon, maxLon } = safeLimits;

    const latToPx = lat => ((maxLat - lat) / (maxLat - minLat)) * heightPx;
    const lonToPx = lon => ((lon - minLon) / (maxLon - minLon)) * widthPx;

    // --- LÓGICA DEL MAPA DE CALOR (CANVAS - MANCHAS) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, widthPx, heightPx);

        // Si estamos en modo ZONAS, no pintamos manchas
        if (heatmapMode === "zones" || !heatmapData || heatmapData.length === 0) return;

        heatmapData.forEach(pos => {
            const x = lonToPx(pos.lon);
            const y = latToPx(pos.lat);

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 22);
            gradient.addColorStop(0, "rgba(255, 30, 0, 0.03)");
            gradient.addColorStop(1, "rgba(255, 30, 0, 0)");

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.fill();
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [heatmapData, maxLat, minLat, minLon, maxLon, heatmapMode]);

    if (!players || Object.keys(players).length === 0) return <div style={{ color: "white" }}>Loading players...</div>;
    if (!fieldLimits) return <div style={{ color: "white" }}>Cargando dimensiones del campo...</div>;

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const rad = Math.PI / 180;
        const dLat = (lat2 - lat1) * rad;
        const dLon = (lon2 - lon1) * rad;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const transitionStyle = speed === 1 ? "all 0.1s linear" : "none";

    const roleGroups = {};
    if (roles) {
        roles.forEach(r => {
            if (r.id !== "Banquillo") {
                roleGroups[r.id] = { color: r.color, points: [] };
            }
        });
    }

    Object.entries(players).forEach(([dev, positions]) => {
        if (visiblePlayers && !visiblePlayers.includes(dev)) return;
        const pos = positions[frame];
        if (!pos) return;

        const role = playerRoles && playerRoles[dev] ? playerRoles[dev] : "Banquillo";
        if (role === "Banquillo" || !roleGroups[role]) return;

        const pxData = {
            x: lonToPx(pos.lon),
            y: latToPx(pos.lat),
            lat: pos.lat,
            lon: pos.lon
        };
        roleGroups[role].points.push(pxData);
    });

    const createPolyline = (points, color, key) => {
        if (points.length === 0) return null;

        const sumX = points.reduce((acc, p) => acc + p.x, 0);
        const sumY = points.reduce((acc, p) => acc + p.y, 0);
        const centroidX = sumX / points.length;
        const centroidY = sumY / points.length;

        const centroidSvg = (
            <g key={`${key}-centroid`}>
                <circle cx={centroidX} cy={centroidY} r="8" fill="rgba(0,0,0,0.4)" stroke={color} strokeWidth="2" style={{ transition: transitionStyle }} />
                <circle cx={centroidX} cy={centroidY} r="3" fill={color} style={{ transition: transitionStyle }} />
            </g>
        );

        if (points.length < 2) return centroidSvg;

        const sortedPoints = [...points].sort((a, b) => a.y - b.y);
        const pointsString = sortedPoints.map(p => `${p.x},${p.y}`).join(" ");
        const distancesText = [];

        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const p1 = sortedPoints[i];
            const p2 = sortedPoints[i + 1];

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const dist = getDistance(p1.lat, p1.lon, p2.lat, p2.lon);

            distancesText.push(
                <text
                    key={`${key}-dist-${i}`}
                    x={midX}
                    y={midY - 8}
                    fill={color}
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                    style={{
                        textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                        transition: transitionStyle
                    }}
                >
                    {dist.toFixed(1)}m
                </text>
            );
        }

        return (
            <g key={key}>
                <polyline
                    points={pointsString}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeDasharray="8,5"
                    opacity="0.8"
                    style={{ transition: transitionStyle }}
                />
                {distancesText}
                {centroidSvg}
            </g>
        );
    };

    // --- NUEVA LÓGICA: 18 ZONAS (CUADRANTES) ---
    const renderZones = () => {
        if (heatmapMode !== "zones" || !heatmapData || heatmapData.length === 0) return null;

        const cols = 6;
        const rows = 3;
        const colW = widthPx / cols;
        const rowH = heightPx / rows;

        let zoneCounts = Array(18).fill(0);
        let totalPoints = 0;

        // 1. Contamos cuántas coordenadas caen en cada cuadrante
        heatmapData.forEach(pos => {
            const x = lonToPx(pos.lon);
            const y = latToPx(pos.lat);

            // Limitamos con Math.min/max para que no de error si un jugador pisa la línea de cal exacta
            const col = Math.min(cols - 1, Math.max(0, Math.floor(x / colW)));
            const row = Math.min(rows - 1, Math.max(0, Math.floor(y / rowH)));

            // Cálculo del índice (0 a 17). Según tu imagen el orden es Top-Bottom, Left-Right.
            // Col 1: 0, 1, 2 | Col 2: 3, 4, 5...
            const zoneIndex = (col * rows) + row;
            zoneCounts[zoneIndex]++;
            totalPoints++;
        });

        // 2. Dibujamos los rectángulos
        const zonesSvg = [];
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const index = (c * rows) + r;
                const count = zoneCounts[index];
                const percentage = totalPoints > 0 ? (count / totalPoints) * 100 : 0;

                // Color dinámico: Si el % es alto, se vuelve rojo oscuro. Si es 0, es transparente.
                // Ajustamos para que un 20% ya se vea muy rojo (los jugadores no se reparten al 100% igual).
                const opacity = Math.min(0.8, percentage / 25);
                const bgColor = `rgba(231, 76, 60, ${opacity})`;

                zonesSvg.push(
                    <g key={`quadrant-${index}`}>
                        <rect
                            x={c * colW}
                            y={r * rowH}
                            width={colW}
                            height={rowH}
                            fill={bgColor}
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth="1"
                            strokeDasharray="5,5"
                        />
                        {percentage > 0 && (
                            <text
                                x={(c * colW) + (colW / 2)}
                                y={(r * rowH) + (rowH / 2)}
                                fill="white"
                                fontSize="22"
                                fontWeight="bold"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                            >
                                {percentage.toFixed(1)}%
                            </text>
                        )}
                    </g>
                );
            }
        }
        return zonesSvg;
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
            <canvas
                ref={canvasRef}
                width={widthPx}
                height={heightPx}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 2,
                    pointerEvents: "none",
                    display: heatmapMode === "zones" ? "none" : "block" // Ocultamos el canvas si estamos en modo Zonas
                }}
            />

            <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, zIndex: 5, pointerEvents: "none" }}>
                {/* DIBUJO DE LAS 18 ZONAS (Si está activado) */}
                {renderZones()}

                {/* DIBUJO DE LAS LÍNEAS TÁCTICAS */}
                {showLines && Object.keys(roleGroups).map(roleId =>
                    createPolyline(roleGroups[roleId].points, roleGroups[roleId].color, `line-${roleId}`)
                )}
            </svg>

            {Object.entries(players).map(([dev, positions]) => {
                if (visiblePlayers && !visiblePlayers.includes(dev)) return null;

                const pos = positions[frame];
                if (!pos) return null;

                const roleId = playerRoles && playerRoles[dev] ? playerRoles[dev] : "Banquillo";
                const roleObj = roles ? roles.find(r => r.id === roleId) : null;
                const bgColor = roleObj ? roleObj.color : "#000000";

                const isSelected = dev === selectedPlayer;
                const isLightColor = ["#f1c40f", "#ffffff", "#ecf0f1", "#ffff00", "#00ff00"].includes(bgColor.toLowerCase());

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
                            color: isLightColor ? "black" : "white",
                            fontSize: isSelected ? "13px" : "11px",
                            fontWeight: "bold",
                            fontFamily: "Arial, sans-serif",
                            boxShadow: isSelected ? "0px 0px 10px white" : "0px 3px 5px rgba(0,0,0,0.4)",
                            zIndex: 10,
                            transition: `background-color 0.3s ease, left ${speed === 1 ? '0.1s linear' : '0s'}, top ${speed === 1 ? '0.1s linear' : '0s'}`
                        }}
                        title={`Dorsal ${dev} - ${roleObj ? roleObj.name : "Banquillo"}`}
                    >
                        {dev}
                    </div>
                );
            })}
        </div>
    );
};

export default Pitch;