import React from "react";
import { Link, useLocation } from "react-router-dom";

function Layout({ children, user, activeClub, activeTeam, onLogout }) {
  const location = useLocation();

  const getLinkStyle = (path) => ({
    color: location.pathname === path ? "#f1c40f" : "white",
    textDecoration: "none",
    fontWeight: "bold",
    padding: "12px 20px",
    borderRadius: "8px",
    backgroundColor: location.pathname === path ? "rgba(255,255,255,0.1)" : "transparent",
    transition: "background-color 0.2s"
  });

  // 💡 Función para salir hasta la selección de Clubes
  const handleCambiarClub = () => {
    localStorage.removeItem("activeTeam");
    localStorage.removeItem("activeTeamId");
    localStorage.removeItem("activeTeamCategory");
    localStorage.removeItem("activeClub");
    localStorage.removeItem("activeClubId");
    window.location.href = "/inicio"; 
  };

  // 💡 Función para salir hasta la selección de Equipos (manteniendo el Club)
  const handleCambiarEquipo = () => {
    localStorage.removeItem("activeTeam");
    localStorage.removeItem("activeTeamId");
    localStorage.removeItem("activeTeamCategory");
    window.location.href = "/inicio";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f4f6f8" }}>
      
      {activeTeam && (
        <aside style={{ width: "240px", backgroundColor: "#2c3e50", color: "white", display: "flex", flexDirection: "column", padding: "20px 0", boxShadow: "2px 0 5px rgba(0,0,0,0.1)", zIndex: 10 }}>
          <div style={{ padding: "0 20px 20px 20px", borderBottom: "1px solid #34495e", marginBottom: "20px", textAlign: "center" }}>
            <h2 style={{ margin: "0", color: "#f1c40f", fontSize: "22px", letterSpacing: "1px" }}>TFG Analytics</h2>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "0 15px" }}>
            <Link to="/app" style={getLinkStyle("/app")}>▶ Simulador GPS</Link>
            <Link to="/sesiones" style={getLinkStyle("/sesiones")}>📅 Sesiones</Link>
            <Link to="/plantilla" style={getLinkStyle("/plantilla")}>👥 Plantilla</Link>
          </nav>
        </aside>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        <header style={{ backgroundColor: "white", padding: "15px 30px", borderBottom: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", zIndex: 5 }}>
          
          <div style={{ display: "flex", alignItems: "center" }}>
            {activeClub ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#f8f9fa", padding: "8px 18px", borderRadius: "30px", border: "1px solid #ecf0f1" }}>
                
                {activeClub.escudo && (
                  <img src={activeClub.escudo} alt="Escudo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                )}
                
                {/* 💡 MIGA DE PAN: CLUB */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: "bold", color: "#2c3e50", fontSize: "15px" }}>
                    {activeClub.nombre}
                  </span>
                  <button onClick={handleCambiarClub} style={{ background: "none", border: "none", color: "#95a5a6", cursor: "pointer", fontSize: "11px", textDecoration: "underline", padding: 0 }}>
                    Cambiar
                  </button>
                </div>
                
                {/* 💡 MIGA DE PAN: EQUIPO */}
                {activeTeam && (
                  <>
                    <span style={{ color: "#bdc3c7", fontSize: "14px", padding: "0 5px" }}>❯</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "bold", color: "#3498db", fontSize: "15px" }}>
                        {activeTeam.name}
                      </span>
                      <span style={{ fontSize: "11px", color: "#7f8c8d", backgroundColor: "#ecf0f1", padding: "3px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                        {activeTeam.category}
                      </span>
                      <button onClick={handleCambiarEquipo} style={{ background: "none", border: "none", color: "#3498db", cursor: "pointer", fontSize: "11px", textDecoration: "underline", padding: 0 }}>
                        Cambiar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <h3 style={{ margin: 0, color: "#2c3e50" }}>Panel de Selección</h3>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {user && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: "bold", color: "#2c3e50", fontSize: "14px" }}>{user.name}</div>
                <div style={{ color: "#7f8c8d", fontSize: "12px", textTransform: "capitalize" }}>{user.role}</div>
              </div>
            )}
            <button 
              onClick={onLogout} 
              style={{ padding: "8px 20px", backgroundColor: "transparent", color: "#e74c3c", border: "1px solid #e74c3c", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#e74c3c"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#e74c3c"; }}
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;