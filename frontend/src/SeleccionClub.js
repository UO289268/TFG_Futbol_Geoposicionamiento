import React from "react";

// Ahora recibe "onSelectClub" como propiedad para enviar la orden a App.js
function SeleccionClub({ onSelectClub }) {
  const clubes = [
    { 
      id: 1, 
      nombre: "Real Madrid", 
      ubicacion: "Madrid, España", 
      equipos: 2, 
      analistas: 0, 
      escudo: "https://upload.wikimedia.org/wikipedia/es/m/m1/Escudo_del_Real_Madrid_Club_de_F%C3%BAtbol.svg",
      color: "#00529F" 
    },
    { 
      id: 2, 
      nombre: "Real Sporting de Gijón", 
      ubicacion: "Gijón, España", 
      equipos: 2, 
      analistas: 1, 
      escudo: "https://assets.footylogos.com/previews/sporting-gijon/sporting-gijon-logo-footylogos-1200.webp",
      color: "#ED1C24" 
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "10vh" }}>
      <h2 style={{ fontSize: "28px", color: "#2c3e50", marginBottom: "5px" }}>Selecciona un equipo</h2>
      <p style={{ color: "#7f8c8d", marginBottom: "40px" }}>Selecciona el equipo con el que quieres trabajar hoy.</p>

      <div style={{ display: "flex", gap: "20px" }}>
        {clubes.map(club => (
          <div 
            key={club.id} 
            onClick={() => onSelectClub(club)} // Ejecuta la función principal al hacer clic
            style={{ backgroundColor: "white", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", width: "300px", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", transition: "transform 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
              {club.escudo ? (
                <img src={club.escudo} alt={`Escudo ${club.nombre}`} style={{ width: "60px", height: "60px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "60px", height: "60px", backgroundColor: club.color, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "12px", textAlign: "center" }}>
                  {club.nombre.substring(0, 3).toUpperCase()}
                </div>
              )}
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