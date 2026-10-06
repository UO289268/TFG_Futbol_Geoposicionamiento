const API_URL = "http://127.0.0.1:8000";

// Pedir el partido que está actualmente activo en memoria
export async function getFrames() {
    const response = await fetch(`${API_URL}/frames`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al obtener los datos");
    }
    return await response.json();
}

// Subir y procesar un nuevo Excel
export async function uploadExcel(file, matchName, times, fieldId, thresholds) {
    const clubId = localStorage.getItem("activeClubId");
    if (!clubId) throw new Error("No has seleccionado un club activo");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("match_name", matchName || "Partido sin nombre");
    formData.append("field_id", fieldId || "");
    formData.append("club_id", clubId); // NUEVO

    formData.append("start_h1", times.start_h1 || "");
    formData.append("end_h1", times.end_h1 || "");
    formData.append("start_h2", times.start_h2 || "");
    formData.append("end_h2", times.end_h2 || "");

    if (thresholds) {
        formData.append("u_sprint", thresholds.sprint);
        formData.append("u_hsr", thresholds.hsr);
        formData.append("u_acel", thresholds.acel);
    }

    const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al subir el archivo Excel");
    }
    return await response.json();
}

// --- NUEVO: OBTENER LISTA DE PARTIDOS GUARDADOS ---
export async function getSavedMatches() {
    const clubId = localStorage.getItem("activeClubId");
    if (!clubId) throw new Error("No has seleccionado un club");

    // Ahora pedimos los partidos filtrados por club
    const response = await fetch(`${API_URL}/matches/club/${clubId}`);
    if (!response.ok) throw new Error("Error al obtener la lista de partidos");
    return await response.json();
}

// --- NUEVO: CARGAR UN PARTIDO GUARDADO ---
export async function loadSavedMatch(matchId) {
    const response = await fetch(`${API_URL}/matches/${matchId}`);
    if (!response.ok) throw new Error("Error al cargar el partido");
    return await response.json();
}

// --- NUEVO: ELIMINAR UN PARTIDO GUARDADO ---
export async function deleteSavedMatch(matchId) {
    const response = await fetch(`${API_URL}/matches/${matchId}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Error al eliminar el partido");
    return await response.json();
}

// --- NUEVO: PLANTILLA ---
export async function getClubPlayers() {
    const clubId = localStorage.getItem("activeClubId");
    if (!clubId) throw new Error("No has seleccionado un club activo");

    const response = await fetch(`${API_URL}/club/${clubId}/players`);
    if (!response.ok) throw new Error("Error al obtener la plantilla");
    return await response.json();
}

// --- NUEVO: AUTENTICACIÓN ---
export async function loginUser(email, password) {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        body: formData,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al iniciar sesión");
    }
    return await response.json();
}

// --- NUEVO: AÑADIR JUGADOR ---
export async function addPlayer(playerData) {
    const clubId = localStorage.getItem("activeClubId");
    if (!clubId) throw new Error("No has seleccionado un club activo");

    // El backend espera recibir los datos como Form (FormData)
    const formData = new FormData();
    formData.append("name", playerData.name);
    formData.append("dorsal", playerData.dorsal);
    formData.append("position", playerData.position);
    if (playerData.photo_url) formData.append("photo_url", playerData.photo_url);

    const response = await fetch(`${API_URL}/club/${clubId}/players`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) throw new Error("Error al guardar el jugador");
    return await response.json();
}

export async function getPlayerStats(playerId) {
    // Asegúrate de usar la URL base correcta si la tienes definida en una constante, 
    // o pon directamente el string si no:
    const baseUrl = "http://127.0.0.1:8000"; 
    
    const response = await fetch(`${baseUrl}/jugador/${playerId}/stats`);
    if (!response.ok) {
        throw new Error("Error al obtener las estadísticas del jugador");
    }
    return await response.json();
}

export async function getMatchSummary(matchId) {
    const baseUrl = "http://127.0.0.1:8000"; 
    const response = await fetch(`${baseUrl}/matches/${matchId}/resumen`);
    if (!response.ok) {
        throw new Error("Error al obtener el resumen del partido");
    }
    return await response.json();
}