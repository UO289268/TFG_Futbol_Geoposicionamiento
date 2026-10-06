import React, { useState, useEffect } from "react";
import { getSavedMatches, getMatchSummary } from "./api"; // 💡 Cambio aquí

function Sesiones() {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const data = await getSavedMatches();
        setMatches(data);
      } catch (error) {
        console.error("Error cargando sesiones", error);
      } finally {
        setCargando(false);
      }
    }
    fetchMatches();
  }, []);

  const handleSelectMatch = async (matchId) => {
    try {
      const data = await getMatchSummary(matchId); // 💡 Usamos la vía rápida a la BD
      setSelectedMatch(data.metadata);
      setResumen(data.resumen);
    } catch (error) {
      alert("Error al cargar los datos del partido");
    }
  };

  if (cargando) return <div style={{ padding: "40px", color: "#7f8c8d" }}>Cargando sesiones históricas...</div>;

  return (
    <div style={{ display: "flex", gap: "20px", height: "100%" }}>
      {/* Columna Izquierda: Lista de Partidos */}
      <div style={{ flex: "0 0 350px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #e0e0e0", padding: "20px", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 20px 0", color: "#2c3e50", fontSize: "24px" }}>Historial de Sesiones</h2>
        {matches.length === 0 ? (
          <p style={{ color: "#7f8c8d" }}>No hay partidos guardados.</p>
        ) : (
          matches.map(m => (
            <div 
              key={m.id} 
              onClick={() => handleSelectMatch(m.id)}
              style={{ padding: "15px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", backgroundColor: selectedMatch?.id === m.id ? "#eafaf1" : "white", borderRadius: "8px", transition: "0.2s" }}
            >
              <h4 style={{ margin: "0 0 5px 0", color: "#2980b9", fontSize: "16px" }}>{m.name}</h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#7f8c8d" }}>📅 {m.date} | 🏟️ {m.field}</p>
            </div>
          ))
        )}
      </div>

      {/* Columna Derecha: Tabla de Estadísticas Clásica */}
      <div style={{ flex: 1, backgroundColor: "white", borderRadius: "12px", border: "1px solid #e0e0e0", padding: "30px", overflowY: "auto" }}>
        {!resumen ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#bdc3c7", fontSize: "18px" }}>
            Selecciona una sesión de la izquierda para ver sus estadísticas completas.
          </div>
        ) : (
          <div>
            <h2 style={{ margin: "0 0 5px 0", color: "#2c3e50", fontSize: "28px" }}>{selectedMatch.name}</h2>
            <p style={{ color: "#7f8c8d", marginBottom: "30px" }}>Desglose de rendimiento táctico y físico por períodos.</p>
            
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#333" }}>
              <thead>
                <tr style={{ backgroundColor: "#34495e", color: "white" }}>
                  <th style={{ padding: "12px", border: "1px solid #ddd" }}>Jugador</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd" }}>Período</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd" }}>Distancia (m)</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd" }}>Vel. Máx (m/s)</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd" }}>Sprints</th>
                  <th style={{ padding: "12px", border: "1px solid #ddd" }}>Aceleraciones</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(resumen).map(([dev, playerStats]) => (
                  <React.Fragment key={dev}>
                    <tr style={{ backgroundColor: "#fdfdfd" }}>
                      <td rowSpan="3" style={{ textAlign: "center", fontWeight: "bold", border: "1px solid #ddd" }}>Dorsal {dev}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", color: "#7f8c8d" }}>1ª Parte</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.h1.dist}</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.h1.max_v}</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.h1.sprints}</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.h1.acels}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px", border: "1px solid #ddd", color: "#7f8c8d" }}>2ª Parte</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.h2.dist}</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.h2.max_v}</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.h2.sprints}</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.h2.acels}</td>
                    </tr>
                    <tr style={{ backgroundColor: "#f1f8ff", fontWeight: "bold" }}>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>TOTAL</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.total.dist}</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.total.max_v}</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.total.sprints}</td>
                      <td style={{ textAlign: "center", border: "1px solid #ddd" }}>{playerStats.total.acels}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sesiones;