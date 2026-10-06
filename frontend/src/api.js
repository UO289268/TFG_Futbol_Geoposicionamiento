const API_URL = "http://127.0.0.1:8000";

export const CATEGORIAS_UMBRALES = {
  "Absoluto Masculino": { sprint: 24.0, hsr: 21.0, acel: 3.0 },
  "Absoluto Femenino": { sprint: 21.0, hsr: 18.0, acel: 2.8 },
  "Juvenil Masculino (U19)": { sprint: 22.5, hsr: 19.5, acel: 2.8 },
  "Juvenil Femenino (U19)": { sprint: 20.0, hsr: 17.0, acel: 2.5 },
  "Cadete Masculino (U16)": { sprint: 21.0, hsr: 18.0, acel: 2.5 },
  "Cadete Femenino (U16)": { sprint: 19.0, hsr: 16.0, acel: 2.2 },
  "Infantil (U14)": { sprint: 18.0, hsr: 15.0, acel: 2.2 }
};

export async function getClubs() {
    const response = await fetch(`${API_URL}/clubs`);
    return await response.json();
}

export async function createClub(clubData) {
    const formData = new FormData();
    formData.append("name", clubData.name);
    formData.append("location", clubData.location || "Ubicación desconocida");
    formData.append("color", clubData.color || "#34495e");
    if (clubData.escudo) formData.append("escudo", clubData.escudo);

    const response = await fetch(`${API_URL}/clubs`, {
        method: "POST",
        body: formData
    });
    return await response.json();
}

export async function deleteClub(clubId) {
    const response = await fetch(`${API_URL}/clubs/${clubId}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Error al eliminar el club");
    return await response.json();
}

export async function getFrames() {
    const response = await fetch(`${API_URL}/frames`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al obtener los datos");
    }
    return await response.json();
}

export async function uploadExcel(file, matchName, times, fieldId, thresholds, lineup) {
    const teamId = localStorage.getItem("activeTeamId"); 
    if (!teamId) throw new Error("No has seleccionado un equipo activo");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("match_name", matchName || "Partido sin nombre");
    formData.append("field_id", fieldId || "");
    formData.append("team_id", teamId); 

    formData.append("start_h1", times.start_h1 || "");
    formData.append("end_h1", times.end_h1 || "");
    formData.append("start_h2", times.start_h2 || "");
    formData.append("end_h2", times.end_h2 || "");

    if (thresholds) {
        formData.append("u_sprint", thresholds.sprint);
        formData.append("u_hsr", thresholds.hsr);
        formData.append("u_acel", thresholds.acel);
    }
    
    if (lineup) {
        formData.append("alineacion", JSON.stringify(lineup));
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

export async function getSavedMatches() {
    const teamId = localStorage.getItem("activeTeamId"); 
    if (!teamId) throw new Error("No has seleccionado un equipo");

    const response = await fetch(`${API_URL}/matches/team/${teamId}`);
    if (!response.ok) throw new Error("Error al obtener la lista de partidos");
    return await response.json();
}

export async function loadSavedMatch(matchId) {
    const response = await fetch(`${API_URL}/matches/${matchId}`);
    if (!response.ok) throw new Error("Error al cargar el partido");
    return await response.json();
}

export async function getMatchSummary(matchId) {
    const response = await fetch(`${API_URL}/matches/${matchId}/resumen`);
    if (!response.ok) {
        throw new Error("Error al obtener el resumen del partido");
    }
    return await response.json();
}

export async function deleteSavedMatch(matchId) {
    const response = await fetch(`${API_URL}/matches/${matchId}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Error al eliminar el partido");
    return await response.json();
}

export async function getClubTeams() {
    const clubId = localStorage.getItem("activeClubId");
    const response = await fetch(`${API_URL}/club/${clubId}/teams`);
    return await response.json();
}

export async function createTeam(teamData) {
    const clubId = localStorage.getItem("activeClubId");
    const formData = new FormData();
    formData.append("name", teamData.name);
    formData.append("category", teamData.category);

    const response = await fetch(`${API_URL}/club/${clubId}/teams`, {
        method: "POST",
        body: formData
    });
    return await response.json();
}

export async function getTeamPlayers() {
    const teamId = localStorage.getItem("activeTeamId"); 
    if (!teamId) throw new Error("No has seleccionado un equipo activo");

    const response = await fetch(`${API_URL}/team/${teamId}/players`);
    if (!response.ok) throw new Error("Error al obtener la plantilla");
    return await response.json();
}

export async function addPlayer(playerData) {
    const teamId = localStorage.getItem("activeTeamId"); 
    if (!teamId) throw new Error("No has seleccionado un equipo activo");

    const formData = new FormData();
    formData.append("name", playerData.name);
    formData.append("dorsal", playerData.dorsal);
    formData.append("position", playerData.position);
    if (playerData.photo_url) formData.append("photo_url", playerData.photo_url);

    const response = await fetch(`${API_URL}/team/${teamId}/players`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) throw new Error("Error al guardar el jugador");
    return await response.json();
}

export async function getPlayerStats(playerId) {
    const response = await fetch(`${API_URL}/jugador/${playerId}/stats`);
    if (!response.ok) {
        throw new Error("Error al obtener las estadísticas del jugador");
    }
    return await response.json();
}

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