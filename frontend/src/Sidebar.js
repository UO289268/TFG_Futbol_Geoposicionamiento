import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: "Inicio", icon: "🏠", path: "/inicio" },
    { name: "Plantilla", icon: "👥", path: "/plantilla" },
    { name: "Análisis", icon: "📊", path: "/app" },
    { name: "Sesiones", icon: "📅", path: "/sesiones" },
  ];

  return (
    <div style={{ width: "250px", backgroundColor: "#ffffff", borderRight: "1px solid #e0e0e0", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", top: 0, left: 0 }}>
      <div style={{ padding: "20px", borderBottom: "1px solid #e0e0e0", textAlign: "center" }}>
        <h2 style={{ margin: 0, color: "#2c3e50", fontSize: "20px" }}>TFG Analytics</h2>
      </div>
      
      <div style={{ padding: "20px 0", flex: 1 }}>
        {menuItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <div 
              key={item.name} 
              onClick={() => navigate(item.path)}
              style={{ 
                padding: "15px 25px", 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                gap: "15px",
                backgroundColor: isActive ? "#eafaf1" : "transparent",
                color: isActive ? "#27ae60" : "#7f8c8d",
                borderRight: isActive ? "4px solid #27ae60" : "4px solid transparent",
                fontWeight: isActive ? "bold" : "normal",
                transition: "0.2s"
              }}
            >
              <span style={{ fontSize: "18px" }}>{item.icon}</span>
              {item.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Sidebar;