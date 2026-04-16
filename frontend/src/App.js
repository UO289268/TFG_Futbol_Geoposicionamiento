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

  // NUEVO ESTADO: Multiplicador de velocidad de reproducción
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

  // REPRODUCCIÓN: Ahora depende del estado 'speed'
  useEffect(() => {
    if (!players || maxFrames === 0 || !isPlaying) return;

    // Dividimos los 100ms base entre el multiplicador de velocidad
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % maxFrames);
    }, 100 / speed);

    return () => clearInterval(interval);
  }, [players, maxFrames, isPlaying, speed]); // <-- IMPORTANTE: añadir speed a las dependencias

  const handleCheckboxChange = (dev) => {
    setVisiblePlayers(prev =>
      prev.includes(dev)
        ? prev.filter(p => p !== dev)
        : [...prev, dev]
    );
  };

  let currentVel = 0, maxVel = 0, distance = 0;
  if (selectedPlayer && players[selectedPlayer]) {
    const historyToCurrentFrame = players[selectedPlayer].slice(0, frame + 1);
    if (historyToCurrentFrame.length > 0) {
      currentVel = historyToCurrentFrame[historyToCurrentFrame.length - 1].vel || 0;
      for (let i = 0; i < historyToCurrentFrame.length; i++) {
        const v = historyToCurrentFrame[i].vel || 0;
        if (v > maxVel) maxVel = v;
        distance += v * 0.1;
      }
    }
  }

  if (!players || Object.keys(players).length === 0) return <div>Loading players...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>

      <Pitch players={players} frame={frame} visiblePlayers={visiblePlayers} />

      <div style={{ display: "flex", flexDirection: "column", width: "1050px", backgroundColor: "#f5f5f5", padding: "15px", borderRadius: "8px", marginTop: "10px", boxSizing: "border-box" }}>

        {/* Fila 1: Reproductor con TIEMPO y Controles de VELOCIDAD */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>

          <button onClick={() => setIsPlaying(!isPlaying)} style={{ padding: "8px 16px", cursor: "pointer", fontWeight: "bold" }}>
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          {/* NUEVO: Botonera de Velocidad */}
          <div style={{ display: "flex", gap: "5px", borderRight: "2px solid #ccc", paddingRight: "15px" }}>
            {[1, 2, 10].map(multiplier => (
              <button
                key={`speed-${multiplier}`}
                onClick={() => setSpeed(multiplier)}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  backgroundColor: speed === multiplier ? "#007bff" : "#e0e0e0",
                  color: speed === multiplier ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px"
                }}
              >
                x{multiplier}
              </button>
            ))}
          </div>

          <input
            type="range"
            min="0"
            max={maxFrames > 0 ? maxFrames - 1 : 0}
            value={frame}
            onChange={(e) => setFrame(Number(e.target.value))}
            style={{ flexGrow: 1, cursor: "pointer" }}
          />

          <div style={{ fontFamily: "monospace", minWidth: "150px", textAlign: "right", fontSize: "16px", fontWeight: "bold" }}>
            <span style={{ color: "#007bff" }}>{formatFrameToTime(frame)}</span>
            <span style={{ color: "#666", fontSize: "12px" }}> / {formatFrameToTime(maxFrames > 0 ? maxFrames - 1 : 0)}</span>
          </div>
        </div>

        {/* Fila 2: Estadísticas */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center", borderTop: "1px solid #ccc", paddingTop: "15px", paddingBottom: "15px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold", marginBottom: "5px" }}>Seleccionar Jugador:</label>
            <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} style={{ padding: "5px", fontSize: "16px", cursor: "pointer" }}>
              {Object.keys(players).map(dev => (
                <option key={dev} value={dev}>Jugador {dev}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "40px", marginLeft: "auto", marginRight: "20px" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#666" }}>Vel. Actual</div><div style={{ fontSize: "20px", fontWeight: "bold" }}>{currentVel.toFixed(2)} m/s</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#666" }}>Vel. Máxima</div><div style={{ fontSize: "20px", fontWeight: "bold", color: "red" }}>{maxVel.toFixed(2)} m/s</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#666" }}>Distancia</div><div style={{ fontSize: "20px", fontWeight: "bold", color: "blue" }}>{distance.toFixed(0)} m</div></div>
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