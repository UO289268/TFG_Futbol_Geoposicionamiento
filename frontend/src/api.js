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
    const formData = new FormData();
    formData.append("file", file);
    formData.append("match_name", matchName || "Partido sin nombre");
    formData.append("field_id", fieldId || "");

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
    const response = await fetch(`${API_URL}/matches`);
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