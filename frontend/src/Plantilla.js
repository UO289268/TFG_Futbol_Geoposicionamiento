import React, { useState, useEffect } from "react";
import { getTeamPlayers, addPlayer } from "./api";
import { useNavigate } from "react-router-dom";

function Plantilla() {
  const navigate = useNavigate();
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados para el Modal de creación
  const [showModal, setShowModal] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: "", dorsal: "", position: "Defensa", photo_url: "" });
  const [guardando, setGuardando] = useState(false);

  async function fetchPlayers() {
    setCargando(true);
    try {
      const data = await getTeamPlayers();
      setJugadores(data);
    } catch (error) {
      console.error("Error al cargar la plantilla", error);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name || !newPlayer.dorsal) return alert("Nombre y dorsal son obligatorios");
    
    setGuardando(true);
    try {
      await addPlayer(newPlayer);
      setShowModal(false);
      setNewPlayer({ name: "", dorsal: "", position: "Defensa", photo_url: "" }); // Resetear form
      fetchPlayers(); // Recargar la lista para ver al nuevo jugador
    } catch (error) {
      alert("Error al crear el jugador");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando && jugadores.length === 0) return <div style={{ padding: "40px", color: "#7f8c8d" }}>Cargando plantilla...</div>;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h2 style={{ margin: "0 0 5px 0", color: "#2c3e50", fontSize: "28px" }}>Plantilla del Equipo</h2>
          <p style={{ margin: 0, color: "#7f8c8d" }}>Gestiona los perfiles y estadísticas de tus futbolistas.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ backgroundColor: "#27ae60", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
        >
          + Añadir Jugadora
        </button>
      </div>

      {jugadores.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", textAlign: "center", borderRadius: "12px", border: "1px dashed #bdc3c7", color: "#7f8c8d" }}>
          <h3>Aún no hay futbolistas en este club</h3>
          <p>Pulsa en "+ Añadir Jugadora" para registrar a tu plantilla.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "25px" }}>
          {jugadores.map((jugador) => (
            <div 
              key={jugador.id} 
              onClick={() => navigate(`/jugador/${jugador.id}`)} 
              style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e0e0e0", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.02)", transition: "transform 0.2s", cursor: "pointer" }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ height: "200px", backgroundColor: "#f8f9fa", display: "flex", justifyContent: "center", alignItems: "flex-end", overflow: "hidden", position: "relative" }}>
                {jugador.photo_url ? (
                  <img src={jugador.photo_url} alt={jugador.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bdc3c7", fontSize: "48px" }}>
                    👤
                  </div>
                )}
                <div style={{ position: "absolute", top: "10px", left: "10px", backgroundColor: "rgba(44, 62, 80, 0.8)", color: "white", width: "35px", height: "35px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "16px" }}>
                  {jugador.dorsal}
                </div>
              </div>
              <div style={{ padding: "20px" }}>
                <h3 style={{ margin: "0 0 5px 0", color: "#2c3e50", fontSize: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {jugador.name}
                </h3>
                <span style={{ backgroundColor: "#eafaf1", color: "#27ae60", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                  {jugador.position}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CREACIÓN */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px 0", color: "#2c3e50" }}>Nuevo Registro</h2>
            
            <form onSubmit={handleCreatePlayer} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", color: "#7f8c8d", fontWeight: "bold", fontSize: "14px" }}>Nombre completo</label>
                <input required type="text" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #bdc3c7", boxSizing: "border-box" }} placeholder="Ej: Aitana Bonmatí" />
              </div>
              
              <div style={{ display: "flex", gap: "15px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "5px", color: "#7f8c8d", fontWeight: "bold", fontSize: "14px" }}>Dorsal (DEV)</label>
                  <input required type="text" value={newPlayer.dorsal} onChange={e => setNewPlayer({...newPlayer, dorsal: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #bdc3c7", boxSizing: "border-box" }} placeholder="Ej: 14" />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: "block", marginBottom: "5px", color: "#7f8c8d", fontWeight: "bold", fontSize: "14px" }}>Posición</label>
                  <select value={newPlayer.position} onChange={e => setNewPlayer({...newPlayer, position: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #bdc3c7", boxSizing: "border-box", cursor: "pointer" }}>
                    <option value="Portera">Portera</option>
                    <option value="Defensa">Defensa</option>
                    <option value="Centrocampista">Centrocampista</option>
                    <option value="Delantera">Delantera</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", color: "#7f8c8d", fontWeight: "bold", fontSize: "14px" }}>URL de la Foto (Opcional)</label>
                <input type="text" value={newPlayer.photo_url} onChange={e => setNewPlayer({...newPlayer, photo_url: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #bdc3c7", boxSizing: "border-box" }} placeholder="https://ejemplo.com/foto.jpg" />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "12px", backgroundColor: "#ecf0f1", color: "#7f8c8d", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={{ flex: 1, padding: "12px", backgroundColor: "#2980b9", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: guardando ? "not-allowed" : "pointer" }}>
                  {guardando ? "Guardando..." : "Guardar Jugador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Plantilla;