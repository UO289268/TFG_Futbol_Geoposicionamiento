import React from "react";
import Sidebar from "./Sidebar";

function Layout({ children, user, onLogout }) {
  return (
    <div style={{ display: "flex", backgroundColor: "#f4f6f8", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <Sidebar />
      
      {/* Contenido principal desplazado hacia la derecha por el menú lateral */}
      <div style={{ marginLeft: "250px", flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Cabecera Superior */}
        <div style={{ height: "70px", backgroundColor: "white", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <span style={{ color: "#2c3e50", fontWeight: "bold" }}>{user?.email}</span>
            <button onClick={onLogout} style={{ backgroundColor: "#e74c3c", color: "white", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Renderizado de la Pantalla Activa */}
        <div style={{ padding: "30px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;