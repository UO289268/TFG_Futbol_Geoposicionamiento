import React from "react";
import { useNavigate } from "react-router-dom";

function SeleccionClub() {
  const navigate = useNavigate();

  const clubes = [
    { id: 1, nombre: "Fútbol Club Barcelona", ubicacion: "Barcelona, España", equipos: 2, analistas: 0, color: "#181733" },
    { id: 2, nombre: "Real Oviedo", ubicacion: "Oviedo, España", equipos: 2, analistas: 1, color: "#005a9c" }
  ];

  const handleSelectClub = (clubId) => {
    // Más adelante aquí guardaremos el club en un estado global
    navigate("/app"); // Redirige a tu simulador
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "10vh" }}>
      <h2 style={{ fontSize: "28px", color: "#2c3e50", marginBottom: "5px" }}>Selecciona un club</h2>
      <p style={{ color: "#7f8c8d", marginBottom: "40px" }}>Selecciona el club con el que quieres trabajar hoy.</p>

      <div style={{ display: "flex", gap: "20px" }}>
        {clubes.map(club => (
          <div 
            key={club.id} 
            onClick={() => handleSelectClub(club.id)}
            style={{ backgroundColor: "white", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", width: "300px", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", transition: "transform 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
              <div style={{ width: "60px", height: "60px", backgroundColor: club.color, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "12px", textAlign: "center" }}>
                {club.nombre.substring(0, 3).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: "0 0 5px 0", color: "#2c3e50", fontSize: "18px" }}>{club.nombre}</h3>
                <span style={{ color: "#7f8c8d", fontSize: "13px" }}>📍 {club.ubicacion}</span>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #eee", paddingTop: "15px", display: "flex", justifyContent: "space-around", color: "#3498db", fontSize: "14px", fontWeight: "bold" }}>
              <span>👥 {club.equipos} equipos</span>
              <span>👨‍💻 {club.analistas} analistas</span>
            </div>
          </div>
        ))}
      </div>
      
      <button style={{ marginTop: "40px", padding: "10px 20px", border: "1px dashed #bdc3c7", backgroundColor: "transparent", color: "#7f8c8d", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
        + Nuevo club
      </button>
    </div>
  );
}

export default SeleccionClub;