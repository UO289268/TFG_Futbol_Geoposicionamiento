const API_URL = "http://127.0.0.1:8000";

export async function getFrames() {
    const response = await fetch(`${API_URL}/frames`);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al obtener los datos");
    }

    return await response.json();
}

export async function uploadExcel(file, times, fieldId, thresholds) {
    const formData = new FormData();
    formData.append("file", file);

    // Añadimos el ID del campo seleccionado
    formData.append("field_id", fieldId || "");

    // Añadimos los tiempos al formulario
    formData.append("start_h1", times.start_h1 || "");
    formData.append("end_h1", times.end_h1 || "");
    formData.append("start_h2", times.start_h2 || "");
    formData.append("end_h2", times.end_h2 || "");

    // --- NUEVOS UMBRALES DINÁMICOS ---
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