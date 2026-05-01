const API_URL = "http://127.0.0.1:8000";

export async function getFrames() {
    const response = await fetch(`${API_URL}/frames`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al obtener los datos");
    }
    return await response.json();
}

export async function uploadExcel(file, times) {
    const formData = new FormData();
    formData.append("file", file);

    // Añadimos los tiempos al formulario que viaja al backend
    formData.append("start_h1", times.start_h1 || "");
    formData.append("end_h1", times.end_h1 || "");
    formData.append("start_h2", times.start_h2 || "");
    formData.append("end_h2", times.end_h2 || "");

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