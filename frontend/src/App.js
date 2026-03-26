import React, { useEffect, useState } from "react";
import { getFrames } from "./api";
import Pitch from "./Pitch";

function App() {
  const [players, setPlayers] = useState({});
  const [frame, setFrame] = useState(0);

  // Estados para los controles
  const [isPlaying, setIsPlaying] = useState(true);
  const [maxFrames, setMaxFrames] = useState(0);

  // Nuevo estado para el jugador seleccionado
  const [selectedPlayer, setSelectedPlayer] = useState("");

  // Carga inicial de jugadores
  useEffect(() => {
    async function load() {
      const data = await getFrames();
      setPlayers(data.players);

      // Calculamos el máximo de frames
      let max = 0;
      Object.values(data.players).forEach(p => {
        if (p.length > max) max = p.length;
      });
      setMaxFrames(max);

      // Si hay jugadores, seleccionamos el primero por defecto para las estadísticas
      if (Object.keys(data.players).length > 0) {
        setSelectedPlayer(Object.keys(data.players)[0]);
      }
    }
    load();
  }, []);

  // Reproducción de frames
  useEffect(() => {
    if (!players || maxFrames === 0 || !isPlaying) return;

    const interval = setInterval(() => {
      setFrame(f => (f + 1) % maxFrames);
    }, 100);

    return () => clearInterval(interval);
  }, [players, maxFrames, isPlaying]);

  // --- CÁLCULO DE ESTADÍSTICAS EN TIEMPO REAL ---
  let currentVel = 0;
  let maxVel = 0;
  let distance = 0;

  if (selectedPlayer && players[selectedPlayer]) {
    // Tomamos solo los datos del jugador hasta el frame actual
    const historyToCurrentFrame = players[selectedPlayer].slice(0, frame + 1);

    if (historyToCurrentFrame.length > 0) {
      currentVel = historyToCurrentFrame[historyToCurrentFrame.length - 1].vel || 0;

      // Calculamos la velocidad máxima y la distancia acumulada
      for (let i = 0; i < historyToCurrentFrame.length; i++) {
        const v = historyToCurrentFrame[i].vel || 0;
        if (v > maxVel) maxVel = v;
        distance += v * 0.1; // Suponiendo vel en m/s y 100ms por frame
      }
    }
  }

  if (!players || Object.keys(players).length === 0) {
    return <div>Loading players...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>

      {/* El campo de fútbol */}
      <Pitch players={players} frame={frame} />

      {/* Panel de Controles y Estadísticas */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        width: "1050px", // Mismo ancho que tu Pitch
        backgroundColor: "#f5f5f5",
        padding: "15px",
        borderRadius: "8px",
        marginTop: "10px",
        boxSizing: "border-box"
      }}>

        {/* Fila 1: Botón Play/Pause y Slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ padding: "8px 16px", cursor: "pointer", fontWeight: "bold" }}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <input
            type="range"
            min="0"
            max={maxFrames > 0 ? maxFrames - 1 : 0}
            value={frame}
            onChange={(e) => setFrame(Number(e.target.value))}
            style={{ flexGrow: 1, cursor: "pointer" }}
          />

          <span style={{ fontFamily: "monospace", minWidth: "120px" }}>
            Frame: {frame} / {maxFrames > 0 ? maxFrames - 1 : 0}
          </span>
        </div>

        {/* Fila 2: Panel de Estadísticas del Jugador */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center", borderTop: "1px solid #ccc", paddingTop: "15px" }}>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold", marginBottom: "5px" }}>Seleccionar Jugador:</label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              style={{ padding: "5px", fontSize: "16px", cursor: "pointer" }}
            >
              {Object.keys(players).map(dev => (
                <option key={dev} value={dev}>Jugador {dev}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "40px", marginLeft: "auto", marginRight: "20px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#666" }}>Velocidad Actual</div>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>{currentVel.toFixed(2)} m/s</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#666" }}>Velocidad Máxima</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "red" }}>{maxVel.toFixed(2)} m/s</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#666" }}>Distancia Recorrida</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "blue" }}>{distance.toFixed(0)} m</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;