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
  const [speed, setSpeed] = useState(1);

  // --- NUEVO ESTADO: Posiciones Tácticas ---
  const [playerRoles, setPlayerRoles] = useState({});

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

        // Inicializamos a todos como "Banquillo" y vaciamos el campo
        const initialRoles = {};
        Object.keys(data.players).forEach(d => initialRoles[d] = "Banquillo");
        setPlayerRoles(initialRoles);
        setVisiblePlayers([]); // Empiezan todos ocultos hasta que los pongas a jugar
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!players || maxFrames === 0 || !isPlaying) return;
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % maxFrames);
    }, 100 / speed);
    return () => clearInterval(interval);
  }, [players, maxFrames, isPlaying, speed]);

  const handleCheckboxChange = (dev) => {
    setVisiblePlayers(prev =>
      prev.includes(dev) ? prev.filter(p => p !== dev) : [...prev, dev]
    );
  };

  // Función para cambiar el rol/posición del jugador en tiempo real
  const handleRoleChange = (dev, newRole) => {
    setPlayerRoles(prev => ({ ...prev, [dev]: newRole }));

    if (newRole === "Banquillo") {
      setVisiblePlayers(prev => prev.filter(p => p !== dev)); // Lo quita del campo
    } else {
      setVisiblePlayers(prev => prev.includes(dev) ? prev : [...prev, dev]); // Lo mete en el campo
    }
  };

  // --- CÁLCULOS CON LÓGICA ANTI-REBOTES (COOLDOWN) ---
  let stats = {
    currentVel: 0, maxVel: 0, distance: 0, sprints: 0,
    hsrDist: 0, hmldDist: 0, acels: 0, decels: 0
  };

  if (selectedPlayer && players[selectedPlayer]) {
    const historyToCurrentFrame = players[selectedPlayer].slice(0, frame + 1);

    if (historyToCurrentFrame.length > 0) {
      const lastData = historyToCurrentFrame[historyToCurrentFrame.length - 1];
      stats.currentVel = lastData ? (lastData.vel || 0) : 0;

      let isAcel = false;
      let isDecel = false;
      let cooldownAcel = 0;
      let cooldownDecel = 0;
      let isSprint = false;

      for (let i = 0; i < historyToCurrentFrame.length; i++) {
        const frameData = historyToCurrentFrame[i];

        if (frameData) {
          const v = frameData.vel || 0;
          const distFrame = v * 0.1;

          if (v > stats.maxVel) stats.maxVel = v;
          stats.distance += distFrame;

          if (frameData.zona === "Sprint" || frameData.zona === "HSR") stats.hsrDist += distFrame;
          if (frameData.zona === "Sprint" || frameData.zona === "HSR" || frameData.zona === "HMLD") stats.hmldDist += distFrame;

          if (frameData.zona === "Sprint" && !isSprint) {
            stats.sprints++;
            isSprint = true;
          } else if (frameData.zona !== "Sprint") {
            isSprint = false;
          }

          if (cooldownAcel > 0) cooldownAcel--;
          if (cooldownDecel > 0) cooldownDecel--;

          if (frameData.fuerza === "Acel" && !isAcel && cooldownAcel === 0) {
            stats.acels++;
            isAcel = true;
            cooldownAcel = 20;
          } else if (frameData.fuerza !== "Acel") {
            isAcel = false;
          }

          if (frameData.fuerza === "Decel" && !isDecel && cooldownDecel === 0) {
            stats.decels++;
            isDecel = true;
            cooldownDecel = 20;
          } else if (frameData.fuerza !== "Decel") {
            isDecel = false;
          }
        }
      }
    }
  }

  if (!players || Object.keys(players).length === 0) return <div>Cargando jugadores...</div>;

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px", backgroundColor: "#2c3e50", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>

      {/* LADO IZQUIERDO: Campo y Estadísticas */}
      <div style={{ flex: "0 0 1050px", display: "flex", flexDirection: "column" }}>
        <Pitch
          players={players}
          frame={frame}
          visiblePlayers={visiblePlayers}
          selectedPlayer={selectedPlayer}
          playerRoles={playerRoles} // Pasamos los roles al campo
        />

        <div style={{ backgroundColor: "#f5f5f5", padding: "15px", borderRadius: "8px", marginTop: "10px", boxSizing: "border-box" }}>
          {/* Reproductor */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ padding: "8px 16px", cursor: "pointer", fontWeight: "bold" }}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <div style={{ display: "flex", gap: "5px", borderRight: "2px solid #ccc", paddingRight: "15px" }}>
              {[1, 2, 10].map(multiplier => (
                <button
                  key={`speed-${multiplier}`} onClick={() => setSpeed(multiplier)}
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
            <input type="range" min="0" max={maxFrames > 0 ? maxFrames - 1 : 0} value={frame} onChange={(e) => setFrame(Number(e.target.value))} style={{ flexGrow: 1, cursor: "pointer" }} />
            <div style={{ fontFamily: "monospace", minWidth: "150px", textAlign: "right", fontSize: "16px", fontWeight: "bold" }}>
              <span style={{ color: "#007bff" }}>{formatFrameToTime(frame)}</span>
              <span style={{ color: "#666", fontSize: "12px" }}> / {formatFrameToTime(maxFrames > 0 ? maxFrames - 1 : 0)}</span>
            </div>
          </div>

          {/* PANEL DE CONTROL DE CARGAS */}
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

            <div style={{ display: "flex", gap: "15px", justifyContent: "space-between" }}>
              <div style={{ flex: 1, backgroundColor: "#fbd4d4", padding: "10px", borderRadius: "8px", border: "1px solid #e7a4a4", textAlign: "center" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#b93434" }}>FUERZA</h4>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Acel (+3m/s²)</div><div style={{ fontSize: "20px", fontWeight: "bold" }}>{stats.acels}</div></div>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Decel (-3m/s²)</div><div style={{ fontSize: "20px", fontWeight: "bold" }}>{stats.decels}</div></div>
                </div>
              </div>

              <div style={{ flex: 1, backgroundColor: "#fde8c4", padding: "10px", borderRadius: "8px", border: "1px solid #e2bc82", textAlign: "center" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#b87d21" }}>RESISTENCIA</h4>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Dist. Total</div><div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.distance.toFixed(0)}m</div></div>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>HSR (&gt;21km/h)</div><div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.hsrDist.toFixed(0)}m</div></div>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>HMLD (&gt;3m/s)</div><div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.hmldDist.toFixed(0)}m</div></div>
                </div>
              </div>

              <div style={{ flex: 1, backgroundColor: "#fff2cc", padding: "10px", borderRadius: "8px", border: "1px solid #e8d69f", textAlign: "center" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#b1983c" }}>VELOCIDAD</h4>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Vel. Máxima</div><div style={{ fontSize: "18px", fontWeight: "bold", color: "red" }}>{stats.maxVel.toFixed(2)} m/s</div></div>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Nº Sprints</div><div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.sprints}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LADO DERECHO: Panel de Gestión Táctica */}
      <div style={{ flex: 1, backgroundColor: "#ecf0f1", padding: "20px", borderRadius: "8px", boxShadow: "0 4px 8px rgba(0,0,0,0.2)" }}>
        <h3 style={{ borderBottom: "2px solid #bdc3c7", paddingBottom: "10px", marginTop: 0, color: "#2c3e50" }}>Gestión Táctica</h3>
        <p style={{ fontSize: "13px", color: "#7f8c8d", marginBottom: "20px" }}>Asigna posiciones para sacar a los jugadores al campo o envíalos al banquillo.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Object.keys(players).map(dev => {
            const currentRole = playerRoles[dev] || "Banquillo";
            const isPlaying = currentRole !== "Banquillo";

            return (
              <div key={`role-${dev}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: isPlaying ? "#fff" : "#e0e0e0", padding: "10px", borderRadius: "5px", borderLeft: isPlaying ? "4px solid #27ae60" : "4px solid #7f8c8d", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <span style={{ fontWeight: "bold", color: isPlaying ? "#2c3e50" : "#7f8c8d" }}>Dorsal {dev}</span>
                <select
                  value={currentRole}
                  onChange={(e) => handleRoleChange(dev, e.target.value)}
                  style={{ padding: "5px", borderRadius: "4px", border: "1px solid #bdc3c7", cursor: "pointer", fontWeight: "bold" }}
                >
                  <option value="Banquillo">Banquillo ⚫</option>
                  <option value="Defensa">Defensa 🔵</option>
                  <option value="Medio">Medio 🟡</option>
                  <option value="Delantero">Delantero 🔴</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export default App;