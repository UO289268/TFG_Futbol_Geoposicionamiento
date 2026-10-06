import React, { useState, useEffect } from "react";
import { getClubs, createClub, deleteClub } from "./api"; // 💡 Importamos la función

function SeleccionClub({ onSelectClub }) {
  const [clubes, setClubes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newEscudo, setNewEscudo] = useState("");
  const [newColor, setNewColor] = useState("#2c3e50");

  useEffect(() => {
    cargarClubes();
  }, []);

  const cargarClubes = async () => {
    try {
      const data = await getClubs();
      setClubes(data);
    } catch (error) {
      console.error("Error al cargar clubes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClubClick = (club) => {
    localStorage.setItem("activeClubId", club.id);
    onSelectClub(club);
  };

  // 💡 NUEVO: Función para eliminar el club
  const handleDeleteClub = async (e, clubId, clubNombre) => {
    e.stopPropagation(); // Evita que se dispare el click de la tarjeta (entrar al club)
    if (window.confirm(`⚠️ ¿Estás seguro de que quieres eliminar el club "${clubNombre}" y todos sus datos?`)) {
      try {
        await deleteClub(clubId);
        setLoading(true);
        await cargarClubes(); // Recargamos la lista actualizada
      } catch (error) {
        alert("Error al eliminar el club");
      }
    }
  };

  const handleCreateClub = async (e) => {
    e.preventDefault();
    try {
      await createClub({ name: newName, location: newLocation, escudo: newEscudo, color: newColor });
      setShowForm(false);
      setNewName(""); setNewLocation(""); setNewEscudo(""); setNewColor("#2c3e50");
      setLoading(true);
      await cargarClubes();
    } catch (error) {
      alert("Error al crear el club");
    }
  };

  if (loading) return <div style={{ textAlign: "center", marginTop: "10vh", color: "#7f8c8d" }}>Cargando clubes...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "10vh", paddingBottom: "50px" }}>
      <h2 style={{ fontSize: "28px", color: "#2c3e50", marginBottom: "5px" }}>Selecciona un club</h2>
      <p style={{ color: "#7f8c8d", marginBottom: "40px" }}>Selecciona el club con el que quieres trabajar hoy.</p>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", maxWidth: "1000px" }}>
        {clubes.map(club => (
          <div 
            key={club.id} 
            onClick={() => handleClubClick(club)} 
            style={{ position: "relative", backgroundColor: "white", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", width: "300px", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", transition: "transform 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            {/* 💡 NUEVO: Botón de borrado en la esquina */}
            <button 
              onClick={(e) => handleDeleteClub(e, club.id, club.nombre)}
              title="Eliminar club"
              style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#e74c3c", padding: "5px" }}
            >
              🗑️
            </button>

            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
              {club.escudo ? (
                <img src={club.escudo} alt={`Escudo ${club.nombre}`} style={{ width: "60px", height: "60px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "60px", height: "60px", backgroundColor: club.color, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "12px", textAlign: "center" }}>
                  {club.nombre.substring(0, 3).toUpperCase()}
                </div>
              )}
              <div>
                <h3 style={{ margin: "0 0 5px 0", color: "#2c3e50", fontSize: "18px", paddingRight: "20px" }}>{club.nombre}</h3>
                <span style={{ color: "#7f8c8d", fontSize: "13px" }}>📍 {club.ubicacion}</span>
              </div>
            </div>
            
            <div style={{ borderTop: "1px solid #eee", paddingTop: "15px", display: "flex", justifyContent: "center", color: "#3498db", fontSize: "14px", fontWeight: "bold" }}>
              <span>👥 {club.equipos} {club.equipos === 1 ? "equipo" : "equipos"}</span>
            </div>
          </div>
        ))}
      </div>
      
      {!showForm ? (
        <button 
          onClick={() => setShowForm(true)} 
          style={{ marginTop: "40px", padding: "10px 20px", border: "1px dashed #bdc3c7", backgroundColor: "transparent", color: "#7f8c8d", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
        >
          + Nuevo club
        </button>
      ) : (
        <form onSubmit={handleCreateClub} style={{ marginTop: "40px", backgroundColor: "white", padding: "30px", borderRadius: "12px", border: "1px solid #e0e0e0", width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "15px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#2c3e50" }}>Crear Nuevo Club</h3>
          <input type="text" placeholder="Nombre (Ej. FC Barcelona)" value={newName} onChange={e => setNewName(e.target.value)} required style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
          <input type="text" placeholder="Ubicación (Ej. Barcelona, España)" value={newLocation} onChange={e => setNewLocation(e.target.value)} required style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
          <input type="text" placeholder="URL del Escudo (Opcional)" value={newEscudo} onChange={e => setNewEscudo(e.target.value)} style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ fontSize: "13px", color: "#7f8c8d", fontWeight: "bold" }}>Color Principal:</label>
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ border: "none", cursor: "pointer", height: "30px", width: "50px", padding: 0 }} />
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button type="submit" style={{ flex: 1, padding: "10px", backgroundColor: "#2ecc71", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "10px", backgroundColor: "#ecf0f1", color: "#7f8c8d", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default SeleccionClub;