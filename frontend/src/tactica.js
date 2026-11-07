// Utilidades de análisis táctico: distancias, centroides de línea y detección de alertas.

// Distancia en metros entre dos coordenadas (fórmula de Haversine).
export const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Centroide (media de latitud y longitud) de las jugadoras indicadas en un fotograma.
// Devuelve null si ninguna tiene posición en ese instante.
export const centroidAt = (players, devs, frame) => {
    let sLat = 0, sLon = 0, n = 0;
    for (const dev of devs) {
        const p = players[dev] ? players[dev][frame] : null;
        if (p) { sLat += p.lat; sLon += p.lon; n++; }
    }
    return n > 0 ? { lat: sLat / n, lon: sLon / n, n } : null;
};

// Jugadoras en el campo (visibles y con una línea distinta de Banquillo), agrupadas por línea.
export const devsPorLinea = (playerRoles, visiblePlayers) => {
    const grupos = {};
    (visiblePlayers || []).forEach(dev => {
        const rol = playerRoles[dev];
        if (!rol || rol === "Banquillo") return;
        (grupos[rol] = grupos[rol] || []).push(dev);
    });
    return grupos;
};

export const TIPOS_ALERTA = {
    pareja: "Distancia entre dos jugadoras",
    centroides: "Distancia entre centroides de dos líneas",
    aislada: "Jugadora alejada de su compañera más cercana",
};

// Agrupa en episodios los fotogramas en los que se cumple una condición.
// valorEn(f) devuelve el valor medido si se cumple la condición en el fotograma f, o null si no.
// Se unen huecos de hasta `huecoMax` fotogramas, nunca se une a través del descanso y se
// descartan los episodios más cortos que `minFrames`.
const detectarEpisodios = (nFrames, h1Frames, valorEn, minFrames, huecoMax) => {
    const episodios = [];
    let actual = null;
    const mismaParte = (a, b) => (a < h1Frames) === (b < h1Frames);
    for (let f = 0; f < nFrames; f++) {
        const v = valorEn(f);
        if (v === null) continue;
        if (actual && f - actual.end <= huecoMax + 1 && mismaParte(actual.start, f)) {
            actual.end = f;
            if (v > actual.max) { actual.max = v; actual.frameMax = f; }
        } else {
            if (actual) episodios.push(actual);
            actual = { start: f, end: f, max: v, frameMax: f };
        }
    }
    if (actual) episodios.push(actual);
    return episodios.filter(e => e.end - e.start + 1 >= minFrames);
};

// Calcula los episodios de todas las reglas sobre el partido completo.
// Cada regla: { id, tipo, a, b, umbral (m), duracion (s) }.
export const calcularEpisodios = (reglas, players, playerRoles, visiblePlayers, nFrames, h1Frames) => {
    if (!reglas || reglas.length === 0 || !players || nFrames === 0) return [];
    const lineas = devsPorLinea(playerRoles, visiblePlayers);
    const enCampo = Object.values(lineas).flat();
    const huecoMax = 5; // 0,5 s: evita partir un episodio por una oscilación breve
    const resultado = [];

    reglas.forEach(regla => {
        const umbral = Number(regla.umbral);
        const minFrames = Math.max(1, Math.round(Number(regla.duracion) * 10));
        if (!(umbral > 0)) return;

        if (regla.tipo === "pareja") {
            const pa = players[regla.a], pb = players[regla.b];
            if (!pa || !pb || regla.a === regla.b) return;
            const valorEn = f => {
                const p1 = pa[f], p2 = pb[f];
                if (!p1 || !p2) return null;
                const d = getDistance(p1.lat, p1.lon, p2.lat, p2.lon);
                return d > umbral ? d : null;
            };
            detectarEpisodios(nFrames, h1Frames, valorEn, minFrames, huecoMax)
                .forEach(e => resultado.push({ ...e, reglaId: regla.id, tipo: "pareja", devs: [regla.a, regla.b] }));
        }

        if (regla.tipo === "centroides") {
            const da = lineas[regla.a] || [], db = lineas[regla.b] || [];
            if (da.length === 0 || db.length === 0 || regla.a === regla.b) return;
            const valorEn = f => {
                const c1 = centroidAt(players, da, f), c2 = centroidAt(players, db, f);
                if (!c1 || !c2) return null;
                const d = getDistance(c1.lat, c1.lon, c2.lat, c2.lon);
                return d > umbral ? d : null;
            };
            detectarEpisodios(nFrames, h1Frames, valorEn, minFrames, huecoMax)
                .forEach(e => resultado.push({ ...e, reglaId: regla.id, tipo: "centroides", lineas: [regla.a, regla.b] }));
        }

        if (regla.tipo === "aislada") {
            if (enCampo.length < 2) return;
            // Distancia de cada jugadora a su compañera más cercana, fotograma a fotograma.
            const cercana = {};
            enCampo.forEach(dev => { cercana[dev] = new Float64Array(nFrames).fill(NaN); });
            for (let f = 0; f < nFrames; f++) {
                const pos = [];
                enCampo.forEach(dev => { const p = players[dev] ? players[dev][f] : null; if (p) pos.push([dev, p]); });
                if (pos.length < 2) continue;
                for (let i = 0; i < pos.length; i++) {
                    let min = Infinity;
                    for (let j = 0; j < pos.length; j++) {
                        if (i === j) continue;
                        const d = getDistance(pos[i][1].lat, pos[i][1].lon, pos[j][1].lat, pos[j][1].lon);
                        if (d < min) min = d;
                    }
                    cercana[pos[i][0]][f] = min;
                }
            }
            enCampo.forEach(dev => {
                const serie = cercana[dev];
                const valorEn = f => (serie[f] > umbral ? serie[f] : null);
                detectarEpisodios(nFrames, h1Frames, valorEn, minFrames, huecoMax)
                    .forEach(e => resultado.push({ ...e, reglaId: regla.id, tipo: "aislada", devs: [dev] }));
            });
        }
    });

    return resultado.sort((x, y) => x.start - y.start);
};
