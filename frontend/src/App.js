import React, { useEffect, useState } from "react";
import { getFrames } from "./api";
import Pitch from "./Pitch";

function App() {
  const [players, setPlayers] = useState({});
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [maxFrames, setMaxFrames] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [visiblePlayers, setVisiblePlayers] = useState([]);

  // Multiplicador de velocidad de reproducción
  const [speed, setSpeed] = useState(1);

  const formatFrameToTime = (frameNumber) => {
    const totalSeconds = frameNumber / 10;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    async function load() {
      const data = await getFrames();
      setPlayers(data.players);

      let max = 0;
      Object.values(data.players).forEach(p => {
        if (p.length > max) max = p.length;
      });
      setMaxFrames(max);

      if (Object.keys(data.players).length > 0) {
        setSelectedPlayer(Object.keys(data.players)[0]);
        setVisiblePlayers(Object.keys(data.players));
      }
    }
    load();
  }, []);

  // REPRODUCCIÓN
  useEffect(() => {
    if (!players || maxFrames === 0 || !isPlaying) return;

    const interval = setInterval(() => {
      setFrame(f => (f + 1) % maxFrames);
    }, 100 / speed);

    return () => clearInterval(interval);
  }, [players, maxFrames, isPlaying, speed]);

  const handleCheckboxChange = (dev) => {
    setVisiblePlayers(prev =>
      prev.includes(dev)
        ? prev.filter(p => p !== dev)
        : [...prev, dev]
    );
  };

  // --- CÁLCULOS DE ESTADÍSTICAS AVANZADAS ---
  let stats = {
    currentVel: 0,
    maxVel: 0,
    distance: 0,
    sprints: 0,
    hsrDist: 0,
    hmldDist: 0,
    acels: 0,
    decels: 0
  };

  if (selectedPlayer && players[selectedPlayer]) {
    const historyToCurrentFrame = players[selectedPlayer].slice(0, frame + 1);
    if (historyToCurrentFrame.length > 0) {

      const lastData = historyToCurrentFrame[historyToCurrentFrame.length - 1];
      stats.currentVel = lastData ? (lastData.vel || 0) : 0;

      for (let i = 0; i < historyToCurrentFrame.length; i++) {
        const frameData = historyToCurrentFrame[i];

        if (frameData) {
          const v = frameData.vel || 0;
          const distFrame = v * 0.1; // Metros recorridos en 0.1s

          if (v > stats.maxVel) stats.maxVel = v;
          stats.distance += distFrame;

          // 1. VELOCIDAD / RESISTENCIA (Zonas)
          const prevZona = i > 0 && historyToCurrentFrame[i - 1] ? historyToCurrentFrame[i - 1].zona : "Trote";

          if (frameData.zona === "Sprint" || frameData.zona === "HSR") {
            stats.hsrDist += distFrame; // Suma distancia HSR (>21km/h)
          }
          if (frameData.zona === "Sprint" || frameData.zona === "HSR" || frameData.zona === "HMLD") {
            stats.hmldDist += distFrame; // Suma distancia HMLD (>3m/s)
          }

          // Contar esfuerzos de Sprint (solo cuenta 1 cuando entra en la zona)
          if (frameData.zona === "Sprint" && prevZona !== "Sprint") {
            stats.sprints++;
          }

          // 2. FUERZA (Aceleraciones / Desaceleraciones)
          const prevFuerza = i > 0 && historyToCurrentFrame[i - 1] ? historyToCurrentFrame[i - 1].fuerza : "Normal";

          if (frameData.fuerza === "Acel" && prevFuerza !== "Acel") {
            stats.acels++;
          }
          if (frameData.fuerza === "Decel" && prevFuerza !== "Decel") {
            stats.decels++;
          }
        }
      }
    }
  }

  if (!players || Object.keys(players).length === 0) return <div>Cargando jugadores...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>

      <Pitch
        players={players}
        frame={frame}
        visiblePlayers={visiblePlayers}
        selectedPlayer={selectedPlayer}
      />

      <div style={{ display: "flex", flexDirection: "column", width: "1050px", backgroundColor: "#f5f5f5", padding: "15px", borderRadius: "8px", marginTop: "10px", boxSizing: "border-box" }}>

        {/* Fila 1: Reproductor */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
          <button onClick={() => setIsPlaying(!isPlaying)} style={{ padding: "8px 16px", cursor: "pointer", fontWeight: "bold" }}>
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <div style={{ display: "flex", gap: "5px", borderRight: "2px solid #ccc", paddingRight: "15px" }}>
            {[1, 2, 10].map(multiplier => (
              <button
                key={`speed-${multiplier}`}
                onClick={() => setSpeed(multiplier)}
                style={{
                  padding: "6px 10px", cursor: "pointer", fontWeight: "bold",
                  backgroundColor: speed === multiplier ? "#007bff" : "#e0e0e0",
                  color: speed === multiplier ? "white" : "#333", border: "none", borderRadius: "4px"
                }}
              >
                x{multiplier}
              </button>
            ))}
          </div>

          <input
            type="range" min="0" max={maxFrames > 0 ? maxFrames - 1 : 0} value={frame}
            onChange={(e) => setFrame(Number(e.target.value))} style={{ flexGrow: 1, cursor: "pointer" }}
          />

          <div style={{ fontFamily: "monospace", minWidth: "150px", textAlign: "right", fontSize: "16px", fontWeight: "bold" }}>
            <span style={{ color: "#007bff" }}>{formatFrameToTime(frame)}</span>
            <span style={{ color: "#666", fontSize: "12px" }}> / {formatFrameToTime(maxFrames > 0 ? maxFrames - 1 : 0)}</span>
          </div>
        </div>

        {/* Fila 2: PANEL DE CONTROL DE CARGAS (Actualizado según esquema) */}
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #ccc", paddingTop: "15px", paddingBottom: "15px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ fontWeight: "bold" }}>Analizar Jugador:</label>
              <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} style={{ padding: "5px", fontSize: "16px", cursor: "pointer" }}>
                {Object.keys(players).map(dev => (
                  <option key={dev} value={dev}>Dorsal {dev}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>
              Velocidad Actual: <span style={{ color: "#007bff" }}>{stats.currentVel.toFixed(2)} m/s</span>
            </div>
          </div>

          {/* Tarjetas de Carga Externa */}
          <div style={{ display: "flex", gap: "15px", justifyContent: "space-between" }}>

            {/* Tarjeta FUERZA */}
            <div style={{ flex: 1, backgroundColor: "#fbd4d4", padding: "10px", borderRadius: "8px", border: "1px solid #e7a4a4", textAlign: "center" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#b93434" }}>FUERZA</h4>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Acel (+3m/s²)</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold" }}>{stats.acels}</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Decel (-3m/s²)</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold" }}>{stats.decels}</div>
                </div>
              </div>
            </div>

            {/* Tarjeta RESISTENCIA */}
            <div style={{ flex: 1, backgroundColor: "#fde8c4", padding: "10px", borderRadius: "8px", border: "1px solid #e2bc82", textAlign: "center" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#b87d21" }}>RESISTENCIA</h4>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Dist. Total</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.distance.toFixed(0)}m</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#666" }}>HSR (&gt;21km/h)</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.hsrDist.toFixed(0)}m</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#666" }}>HMLD (&gt;3m/s)</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.hmldDist.toFixed(0)}m</div>
                </div>
              </div>
            </div>

            {/* Tarjeta VELOCIDAD */}
            <div style={{ flex: 1, backgroundColor: "#fff2cc", padding: "10px", borderRadius: "8px", border: "1px solid #e8d69f", textAlign: "center" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#b1983c" }}>VELOCIDAD</h4>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Vel. Máxima</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "red" }}>{stats.maxVel.toFixed(2)} m/s</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Nº Sprints</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.sprints}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Fila 3: Filtro de Visibilidad */}
        <div style={{ borderTop: "1px solid #ccc", paddingTop: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontWeight: "bold" }}>Filtro de Jugadores Visibles:</span>
            <div>
              <button onClick={() => setVisiblePlayers(Object.keys(players))} style={{ marginRight: "10px", cursor: "pointer" }}>Marcar Todos</button>
              <button onClick={() => setVisiblePlayers([])} style={{ cursor: "pointer" }}>Desmarcar Todos</button>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {Object.keys(players).map(dev => (
              <label key={`vis-${dev}`} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", background: visiblePlayers.includes(dev) ? "#d1e7ff" : "#e0e0e0", padding: "5px 10px", borderRadius: "15px", fontSize: "14px", border: "1px solid #ccc" }}>
                <input
                  type="checkbox"
                  checked={visiblePlayers.includes(dev)}
                  onChange={() => handleCheckboxChange(dev)}
                />
                J-{dev}
              </label>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;