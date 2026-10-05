import React from "react";
import Sidebar from "./Sidebar";

function Layout({ children, user, activeClub, onLogout }) {
  return (
    <div style={{ display: "flex", backgroundColor: "#f4f6f8", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <Sidebar />
      
      <div style={{ marginLeft: "250px", flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Cabecera Superior */}
        <div style={{ height: "70px", backgroundColor: "white", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px" }}>
          
          {/* IZQUIERDA: Info del Club Seleccionado */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {activeClub ? (
              <>
                {activeClub.escudo ? (
                  <img src={activeClub.escudo} alt={activeClub.nombre} style={{ width: "40px", height: "40px", objectFit: "contain" }} />
                ) : (
                  <div style={{ width: "40px", height: "40px", backgroundColor: activeClub.color || "#34495e", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "12px" }}>
                    {activeClub.nombre.substring(0, 3).toUpperCase()}
                  </div>
                )}
                <h3 style={{ margin: 0, color: "#2c3e50", fontSize: "20px" }}>{activeClub.nombre}</h3>
              </>
            ) : (
              <h3 style={{ margin: 0, color: "#bdc3c7", fontSize: "18px" }}>Ningún equipo seleccionado</h3>
            )}
          </div>

          {/* DERECHA: Usuario y Cerrar Sesión */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <span style={{ color: "#2c3e50", fontWeight: "bold" }}>{user?.email}</span>
            <button onClick={onLogout} style={{ backgroundColor: "#e74c3c", color: "white", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Contenido de la pantalla activa */}
        <div style={{ padding: "30px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;