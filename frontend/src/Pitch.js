import React, { useEffect, useMemo, useRef } from "react";
import fieldImg from "./field.png";
import { getDistance } from "./tactica";

// Mapa de calor por densidad: las posiciones se acumulan en una rejilla de celdas de
// CELDA px, se suavizan con un desenfoque y la densidad se colorea con un gradiente.
const CELDA = 5;
const RADIO_SUAVIZADO = 3; // celdas por pasada (3 pasadas ~ gaussiana de ~17 px)

// Paleta de 256 colores: azul -> cian -> verde -> amarillo -> rojo.
const PALETA = (() => {
    const paradas = [[0, [0, 0, 255]], [0.25, [0, 200, 255]], [0.5, [0, 220, 0]], [0.75, [255, 230, 0]], [1, [255, 0, 0]]];
    const tabla = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let k = 0;
        while (k < paradas.length - 2 && t > paradas[k + 1][0]) k++;
        const [t0, c0] = paradas[k], [t1, c1] = paradas[k + 1];
        const u = (t - t0) / (t1 - t0);
        for (let c = 0; c < 3; c++) tabla[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * u;
    }
    return tabla;
})();

// Desenfoque de caja separable (horizontal y vertical) sobre la rejilla de densidad.
const desenfocar = (datos, ancho, alto, r) => {
    const tmp = new Float32Array(datos.length);
    for (let y = 0; y < alto; y++) {
        let acc = 0;
        for (let x = -r; x <= r; x++) acc += datos[y * ancho + Math.min(ancho - 1, Math.max(0, x))];
        for (let x = 0; x < ancho; x++) {
            tmp[y * ancho + x] = acc / (2 * r + 1);
            acc += datos[y * ancho + Math.min(ancho - 1, x + r + 1)] - datos[y * ancho + Math.max(0, x - r)];
        }
    }
    for (let x = 0; x < ancho; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += tmp[Math.min(alto - 1, Math.max(0, y)) * ancho + x];
        for (let y = 0; y < alto; y++) {
            datos[y * ancho + x] = acc / (2 * r + 1);
            acc += tmp[Math.min(alto - 1, y + r + 1) * ancho + x] - tmp[Math.max(0, y - r) * ancho + x];
        }
    }
};

const Pitch = ({ players, frame, visiblePlayers, selectedPlayer, playerRoles, fieldLimits, showLines, lineMode = "players", roles, speed, heatmapMode, heatmapData, activeAlerts = [] }) => {
    const canvasRef = useRef(null);

    const widthPx = 1050;
    const heightPx = 680;

    const safeLimits = fieldLimits || { maxLat: 1, minLat: 0, minLon: 0, maxLon: 1 };
    const { maxLat, minLat, minLon, maxLon } = safeLimits;

    const latToPx = lat => ((maxLat - lat) / (maxLat - minLat)) * heightPx;
    const lonToPx = lon => ((lon - minLon) / (maxLon - minLon)) * widthPx;

    // Lienzo auxiliar del tamaño de la rejilla; se crea una vez y se reutiliza.
    const gridW = Math.ceil(widthPx / CELDA), gridH = Math.ceil(heightPx / CELDA);
    const gridCanvas = useMemo(() => {
        const c = document.createElement("canvas");
        c.width = gridW;
        c.height = gridH;
        return c;
    }, [gridW, gridH]);

    // --- LÓGICA DEL MAPA DE CALOR (gradiente por densidad) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, widthPx, heightPx);

        if (heatmapMode === "zones" || !heatmapData || heatmapData.length === 0) return;

        // 1. Contar las posiciones que caen en cada celda
        const densidad = new Float32Array(gridW * gridH);
        heatmapData.forEach(pos => {
            const gx = Math.floor(lonToPx(pos.lon) / CELDA);
            const gy = Math.floor(latToPx(pos.lat) / CELDA);
            if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) densidad[gy * gridW + gx] += 1;
        });

        // 2. Suavizar (tres pasadas de caja ~ gaussiana) y normalizar por el máximo
        for (let i = 0; i < 3; i++) desenfocar(densidad, gridW, gridH, RADIO_SUAVIZADO);
        let max = 0;
        for (let i = 0; i < densidad.length; i++) if (densidad[i] > max) max = densidad[i];
        if (max <= 0) return;

        // 3. Colorear cada celda según su densidad relativa (raíz para realzar zonas poco frecuentadas)
        const gctx = gridCanvas.getContext("2d");
        const img = gctx.createImageData(gridW, gridH);
        for (let i = 0; i < densidad.length; i++) {
            const t = Math.sqrt(densidad[i] / max);
            if (t < 0.08) continue; // fondo transparente
            const idx = Math.min(255, Math.round(t * 255)) * 3;
            img.data[i * 4] = PALETA[idx];
            img.data[i * 4 + 1] = PALETA[idx + 1];
            img.data[i * 4 + 2] = PALETA[idx + 2];
            img.data[i * 4 + 3] = Math.round(Math.min(1, 0.35 + 0.5 * t) * 255);
        }
        gctx.putImageData(img, 0, 0);

        // 4. Escalar la rejilla al tamaño del campo con interpolación
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(gridCanvas, 0, 0, widthPx, heightPx);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [heatmapData, maxLat, minLat, minLon, maxLon, heatmapMode, gridCanvas]);

    if (!players || Object.keys(players).length === 0) return <div style={{ color: "white" }}>Loading players...</div>;
    if (!fieldLimits) return <div style={{ color: "white" }}>Cargando dimensiones del campo...</div>;

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

    const createPolyline = (points, color, key, drawPolyline = true) => {
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

        if (points.length < 2 || !drawPolyline) return centroidSvg;

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

    // Centroide de cada línea con jugadoras en el campo, en píxeles y en coordenadas.
    const centroideDeLinea = (roleId) => {
        const g = roleGroups[roleId];
        if (!g || g.points.length === 0) return null;
        const n = g.points.length;
        return {
            x: g.points.reduce((acc, p) => acc + p.x, 0) / n,
            y: g.points.reduce((acc, p) => acc + p.y, 0) / n,
            lat: g.points.reduce((acc, p) => acc + p.lat, 0) / n,
            lon: g.points.reduce((acc, p) => acc + p.lon, 0) / n,
            color: g.color
        };
    };

    const etiquetaDistancia = (key, x, y, texto, color) => (
        <text key={key} x={x} y={y} fill={color} fontSize="14" fontWeight="bold" textAnchor="middle"
            style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000", transition: transitionStyle }}>
            {texto}
        </text>
    );

    // Distancia entre los centroides de líneas consecutivas. Los centroides se ordenan por su
    // posición a lo largo del campo (eje horizontal), de modo que cada línea se une con la que
    // tiene delante y detrás, sea cual sea el orden en que se crearon las posiciones.
    const renderCentroidLinks = () => {
        const centros = (roles || []).filter(r => r.id !== "Banquillo").map(r => centroideDeLinea(r.id)).filter(Boolean)
            .sort((c1, c2) => c1.x - c2.x);
        const elementos = [];
        for (let i = 0; i < centros.length - 1; i++) {
            const c1 = centros[i], c2 = centros[i + 1];
            const d = getDistance(c1.lat, c1.lon, c2.lat, c2.lon);
            elementos.push(
                <g key={`clink-${i}`}>
                    <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke="white" strokeWidth="3" opacity="0.9" style={{ transition: transitionStyle }} />
                    {etiquetaDistancia(`clink-t-${i}`, (c1.x + c2.x) / 2 + 22, (c1.y + c2.y) / 2, `${d.toFixed(1)}m`, "white")}
                </g>
            );
        }
        return elementos;
    };

    // Resalta en el campo las alertas activas en el fotograma actual.
    const renderAlerts = () => activeAlerts.map((al, i) => {
        const rojo = al.color || "#ff1744";
        if (al.tipo === "pareja") {
            const p1 = players[al.devs[0]] ? players[al.devs[0]][frame] : null;
            const p2 = players[al.devs[1]] ? players[al.devs[1]][frame] : null;
            if (!p1 || !p2) return null;
            const x1 = lonToPx(p1.lon), y1 = latToPx(p1.lat), x2 = lonToPx(p2.lon), y2 = latToPx(p2.lat);
            const d = getDistance(p1.lat, p1.lon, p2.lat, p2.lon);
            return (
                <g key={`alert-${i}`}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={rojo} strokeWidth="4" strokeDasharray="10,6" />
                    {etiquetaDistancia(`alert-t-${i}`, (x1 + x2) / 2, (y1 + y2) / 2 - 10, `⚠ ${d.toFixed(1)}m`, rojo)}
                </g>
            );
        }
        if (al.tipo === "centroides") {
            const c1 = centroideDeLinea(al.lineas[0]), c2 = centroideDeLinea(al.lineas[1]);
            if (!c1 || !c2) return null;
            const d = getDistance(c1.lat, c1.lon, c2.lat, c2.lon);
            return (
                <g key={`alert-${i}`}>
                    <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke={rojo} strokeWidth="5" strokeDasharray="10,6" />
                    <circle cx={c1.x} cy={c1.y} r="12" fill="none" stroke={rojo} strokeWidth="3" />
                    <circle cx={c2.x} cy={c2.y} r="12" fill="none" stroke={rojo} strokeWidth="3" />
                    {etiquetaDistancia(`alert-t-${i}`, (c1.x + c2.x) / 2 - 30, (c1.y + c2.y) / 2, `⚠ ${d.toFixed(1)}m`, rojo)}
                </g>
            );
        }
        if (al.tipo === "aislada") {
            const p = players[al.devs[0]] ? players[al.devs[0]][frame] : null;
            if (!p) return null;
            return <circle key={`alert-${i}`} cx={lonToPx(p.lon)} cy={latToPx(p.lat)} r="22" fill="rgba(255,23,68,0.15)" stroke={rojo} strokeWidth="4" />;
        }
        return null;
    });

    // --- LÓGICA DE 18 ZONAS (CUADRANTES) ---
    const renderZones = () => {
        if (heatmapMode !== "zones" || !heatmapData || heatmapData.length === 0) return null;

        const cols = 6;
        const rows = 3;
        const colW = widthPx / cols;
        const rowH = heightPx / rows;

        let zoneCounts = Array(18).fill(0);
        let totalPoints = 0;

        heatmapData.forEach(pos => {
            const x = lonToPx(pos.lon);
            const y = latToPx(pos.lat);

            const col = Math.min(cols - 1, Math.max(0, Math.floor(x / colW)));
            const row = Math.min(rows - 1, Math.max(0, Math.floor(y / rowH)));

            const zoneIndex = (col * rows) + row;
            zoneCounts[zoneIndex]++;
            totalPoints++;
        });

        const zonesSvg = [];
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const index = (c * rows) + r;
                const count = zoneCounts[index];
                const percentage = totalPoints > 0 ? (count / totalPoints) * 100 : 0;

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
                    display: heatmapMode === "zones" ? "none" : "block"
                }}
            />

            {(heatmapMode === "role" || heatmapMode === "player") && heatmapData && heatmapData.length > 0 && (
                <div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 6, background: "rgba(0,0,0,0.6)", color: "white", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", fontFamily: "Arial, sans-serif", pointerEvents: "none" }}>
                    <div style={{ marginBottom: "4px" }}>Tiempo en la zona</div>
                    <div style={{ width: "140px", height: "10px", borderRadius: "3px", background: "linear-gradient(to right, #0000ff, #00c8ff, #00dc00, #ffe600, #ff0000)" }} />
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Poco</span><span>Mucho</span></div>
                </div>
            )}

            <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, zIndex: 5, pointerEvents: "none" }}>
                {renderZones()}

                {showLines && Object.keys(roleGroups).map(roleId =>
                    createPolyline(roleGroups[roleId].points, roleGroups[roleId].color, `line-${roleId}`, lineMode !== "centroids")
                )}
                {showLines && lineMode !== "players" && renderCentroidLinks()}
                {renderAlerts()}
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