import React, { useEffect, useState } from "react";
import { getFrames, uploadExcel, getSavedMatches, loadSavedMatch } from "./api";
import Pitch from "./Pitch";

const DEFAULT_ROLES = [
  { id: "Banquillo", name: "Banquillo ⚫", color: "#000000", isDefault: true },
  { id: "Defensa", name: "Defensa 🔵", color: "#3498db", isDefault: true },
  { id: "Medio", name: "Medio 🟡", color: "#f1c40f", isDefault: true },
  { id: "Delantero", name: "Delantero 🔴", color: "#e74c3c", isDefault: true }
];

function App() {
  // NUEVO: Control de pantallas ("menu", "new", "load", "simulator")
  const [appMode, setAppMode] = useState("menu");

  const [players, setPlayers] = useState({});
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [maxFrames, setMaxFrames] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [visiblePlayers, setVisiblePlayers] = useState([]);
  const [speed, setSpeed] = useState(1);
  const [playerRoles, setPlayerRoles] = useState({});

  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [matchName, setMatchName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [matchTimes, setMatchTimes] = useState({ start_h1: "", end_h1: "", start_h2: "", end_h2: "" });

  const [resumen, setResumen] = useState(null);
  const [showResumen, setShowResumen] = useState(false);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [fieldLimits, setFieldLimits] = useState(null);
  const [showLines, setShowLines] = useState(false);
  const [thresholds, setThresholds] = useState({ sprint: 24.0, hsr: 21.0, acel: 3.0 });
  const [activeConfig, setActiveConfig] = useState(null);

  // Lista de partidos guardados
  const [savedMatches, setSavedMatches] = useState([]);

  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#9b59b6");

  const [heatmapMode, setHeatmapMode] = useState("none");
  const [selectedHeatRole, setSelectedHeatRole] = useState("Defensa");
  const [selectedHeatPlayer, setSelectedHeatPlayer] = useState("");

  const formatFrameToTime = (frameNumber) => {
    const totalSeconds = frameNumber / 10;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const setupData = (data) => {
    setPlayers(data.players);
    setResumen(data.resumen);
    setFieldLimits(data.field_limits);
    setActiveConfig(data.config);

    let max = 0;
    Object.values(data.players).forEach(p => {
      if (p.length > max) max = p.length;
    });
    setMaxFrames(max);

    if (Object.keys(data.players).length > 0) {
      const firstPlayer = Object.keys(data.players)[0];
      setSelectedPlayer(firstPlayer);
      setSelectedHeatPlayer(firstPlayer);

      const initialRoles = {};
      Object.keys(data.players).forEach(d => initialRoles[d] = "Banquillo");
      setPlayerRoles(initialRoles);
      setVisiblePlayers([]);
    }
    setAppMode("simulator"); // Pasamos a la pantalla del campo
  };

  useEffect(() => {
    async function fetchFields() {
      try {
        const res = await fetch("http://127.0.0.1:8000/fields");
        const data = await res.json();
        setFields(data);
        if (data.length > 0) setSelectedField(data[0].id);
      } catch (e) { console.error("Error cargando campos", e); }
    }
    fetchFields();
  }, []);

  const handleTimeChange = (e) => setMatchTimes({ ...matchTimes, [e.target.name]: e.target.value });

  // PROCESAR NUEVO PARTIDO
  const processDataClick = async () => {
    if (!matchName) return setError("Por favor, ponle un nombre al partido.");
    if (!selectedFile) return setError("Por favor, selecciona un archivo Excel primero.");
    if (!selectedField) return setError("Por favor, selecciona el campo donde se jugó.");

    setUploading(true);
    setError(null);
    try {
      await uploadExcel(selectedFile, matchName, matchTimes, selectedField, thresholds);
      const data = await getFrames();
      setupData(data);
    } catch (err) { setError(err.message || "Error al procesar"); }
    finally { setUploading(false); }
  };

  // CARGAR PARTIDO DESDE MEMORIA
  const fetchMatchesList = async () => {
    try {
      const matches = await getSavedMatches();
      setSavedMatches(matches);
      setAppMode("load");
    } catch (err) { alert("No se pudieron cargar los partidos guardados."); }
  };

  const loadSpecificMatch = async (matchId) => {
    setUploading(true);
    try {
      const data = await loadSavedMatch(matchId);
      setupData(data);
    } catch (err) { alert("Error al cargar el partido."); }
    finally { setUploading(false); }
  };

  // ----------------------------------------------------
  // GESTIÓN DE ROLES Y MAPA DE CALOR (Igual que antes)
  // ----------------------------------------------------
  useEffect(() => {
    if (!players || maxFrames === 0 || !isPlaying || appMode !== "simulator") return;
    const interval = setInterval(() => { setFrame(f => (f + 1) % maxFrames); }, 100 / speed);
    return () => clearInterval(interval);
  }, [players, maxFrames, isPlaying, speed, appMode]);

  const handleRoleChange = (dev, newRole) => {
    setPlayerRoles(prev => ({ ...prev, [dev]: newRole }));
    if (newRole === "Banquillo") {
      setVisiblePlayers(prev => prev.filter(p => p !== dev));
    } else {
      setVisiblePlayers(prev => prev.includes(dev) ? prev : [...prev, dev]);
    }
  };

  const handleAddRole = () => {
    if (newRoleName.trim() === "") return;
    const id = newRoleName.trim();
    if (roles.some(r => r.id === id)) return alert("Posición ya existe");
    setRoles([...roles, { id: id, name: id, color: newRoleColor, isDefault: false }]);
    setNewRoleName("");
  };

  const handleDeleteRole = (roleId) => {
    const newPlayerRoles = { ...playerRoles };
    Object.keys(newPlayerRoles).forEach(dev => {
      if (newPlayerRoles[dev] === roleId) {
        newPlayerRoles[dev] = "Banquillo";
        setVisiblePlayers(prev => prev.filter(p => p !== dev));
      }
    });
    setPlayerRoles(newPlayerRoles);
    setRoles(roles.filter(r => r.id !== roleId));
  };

  const getHeatmapData = () => {
    if (heatmapMode === "none" || !players || Object.keys(players).length === 0) return [];
    let filteredPlayers = [];
    if (heatmapMode === "team") filteredPlayers = Object.keys(players).filter(dev => playerRoles[dev] !== "Banquillo");
    else if (heatmapMode === "role") filteredPlayers = Object.keys(players).filter(dev => playerRoles[dev] === selectedHeatRole);
    else if (heatmapMode === "player" && selectedHeatPlayer) filteredPlayers = [selectedHeatPlayer];

    return filteredPlayers.flatMap(dev => players[dev].slice(0, frame + 1).filter(p => p !== null));
  };

  // --- RENDERIZADO CONDICIONAL DE PANTALLAS ---

  // PANTALLA 1: MENÚ PRINCIPAL
  if (appMode === "menu") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#2c3e50", color: "white", fontFamily: "Arial, sans-serif" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "50px" }}>TFG Analytics</h1>
        <div style={{ display: "flex", gap: "30px" }}>
          <button
            onClick={() => setAppMode("new")}
            style={{ padding: "30px 40px", fontSize: "24px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "15px", cursor: "pointer", boxShadow: "0 10px 20px rgba(0,0,0,0.3)", fontWeight: "bold" }}>
            ➕ Procesar Nuevo Partido
          </button>
          <button
            onClick={fetchMatchesList}
            style={{ padding: "30px 40px", fontSize: "24px", backgroundColor: "#2980b9", color: "white", border: "none", borderRadius: "15px", cursor: "pointer", boxShadow: "0 10px 20px rgba(0,0,0,0.3)", fontWeight: "bold" }}>
            📂 Cargar Partido Guardado
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA 2: CARGAR PARTIDO GUARDADO
  if (appMode === "load") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#2c3e50", color: "white", fontFamily: "Arial, sans-serif", padding: "20px" }}>
        <button onClick={() => setAppMode("menu")} style={{ position: "absolute", top: "20px", left: "20px", padding: "10px 20px", cursor: "pointer", borderRadius: "5px", border: "none", fontWeight: "bold" }}>🔙 Volver</button>
        <h2 style={{ fontSize: "36px", marginBottom: "30px" }}>Partidos Guardados</h2>

        {uploading ? (
          <h3 style={{ color: "#f1c40f" }}>Cargando datos a memoria RAM...</h3>
        ) : (
          <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "15px" }}>
            {savedMatches.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: "20px", color: "#bdc3c7" }}>No hay ningún partido procesado todavía.</p>
            ) : (
              savedMatches.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#34495e", padding: "20px", borderRadius: "10px", border: "1px solid #7f8c8d" }}>
                  <div>
                    <h3 style={{ margin: "0 0 5px 0", color: "#ecf0f1", fontSize: "22px" }}>{m.name}</h3>
                    <p style={{ margin: 0, color: "#bdc3c7", fontSize: "14px" }}>📅 {m.date} | 🏟️ {m.field} | 📄 {m.filename}</p>
                  </div>
                  <button onClick={() => loadSpecificMatch(m.id)} style={{ padding: "12px 25px", backgroundColor: "#f1c40f", color: "#2c3e50", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>
                    Cargar ▶
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // PANTALLA 3: PROCESAR NUEVO PARTIDO
  if (appMode === "new") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#2c3e50", color: "white", fontFamily: "Arial, sans-serif", padding: "20px" }}>
        <button onClick={() => setAppMode("menu")} style={{ position: "absolute", top: "20px", left: "20px", padding: "10px 20px", cursor: "pointer", borderRadius: "5px", border: "none", fontWeight: "bold" }}>🔙 Volver</button>
        <h1 style={{ marginBottom: "10px", fontSize: "36px", textAlign: "center" }}>Procesar Nuevo Partido</h1>

        <div style={{ backgroundColor: "#34495e", padding: "40px", borderRadius: "10px", border: "2px solid #7f8c8d", width: "100%", maxWidth: "600px", boxShadow: "0 10px 20px rgba(0,0,0,0.3)" }}>
          {uploading ? (
            <div style={{ textAlign: "center" }}>
              <h3 style={{ color: "#f1c40f" }}>Procesando y Guardando...</h3>
              <p style={{ fontSize: "14px", color: "#bdc3c7" }}>Esto puede tardar unos segundos. Se guardará automáticamente.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>

              <div style={{ backgroundColor: "#2c3e50", padding: "15px", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#ecf0f1" }}>1. Nombre del Partido</h4>
                <input type="text" placeholder="Ej: Jornada 1 vs Oviedo" value={matchName} onChange={e => setMatchName(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "5px", border: "none", boxSizing: "border-box", fontSize: "16px" }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#2c3e50", padding: "15px", borderRadius: "8px" }}>
                <h4 style={{ margin: 0, color: "#ecf0f1", flex: 1 }}>2. Archivo GPS (.xlsx)</h4>
                <input type="file" accept=".xlsx, .xls" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: "none" }} id="excel-upload" />
                <label htmlFor="excel-upload" style={{ padding: "10px 20px", backgroundColor: selectedFile ? "#2980b9" : "#7f8c8d", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                  {selectedFile ? `✅ ${selectedFile.name}` : "📁 Seleccionar"}
                </label>
              </div>

              <div style={{ backgroundColor: "#2c3e50", padding: "15px", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#ecf0f1" }}>3. Campo de Juego</h4>
                <select value={selectedField} onChange={(e) => setSelectedField(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "16px" }}>
                  {fields.length === 0 && <option value="">Cargando campos disponibles...</option>}
                  {fields.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>

              <div style={{ backgroundColor: "#2c3e50", padding: "15px", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#ecf0f1" }}>4. Tiempos (Opcional)</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}><label style={{ fontSize: "12px", color: "#bdc3c7" }}>Inicio 1ª P.</label><input type="time" name="start_h1" value={matchTimes.start_h1} onChange={handleTimeChange} style={{ padding: "8px", borderRadius: "4px", border: "none" }} /></div>
                  <div style={{ display: "flex", flexDirection: "column" }}><label style={{ fontSize: "12px", color: "#bdc3c7" }}>Fin 1ª P.</label><input type="time" name="end_h1" value={matchTimes.end_h1} onChange={handleTimeChange} style={{ padding: "8px", borderRadius: "4px", border: "none" }} /></div>
                  <div style={{ display: "flex", flexDirection: "column" }}><label style={{ fontSize: "12px", color: "#bdc3c7" }}>Inicio 2ª P.</label><input type="time" name="start_h2" value={matchTimes.start_h2} onChange={handleTimeChange} style={{ padding: "8px", borderRadius: "4px", border: "none" }} /></div>
                  <div style={{ display: "flex", flexDirection: "column" }}><label style={{ fontSize: "12px", color: "#bdc3c7" }}>Fin 2ª P.</label><input type="time" name="end_h2" value={matchTimes.end_h2} onChange={handleTimeChange} style={{ padding: "8px", borderRadius: "4px", border: "none" }} /></div>
                </div>
              </div>

              <div style={{ backgroundColor: "#2c3e50", padding: "15px", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#ecf0f1" }}>5. Umbrales</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}><label style={{ fontSize: "11px", color: "#bdc3c7" }}>Sprint (km/h)</label><input type="number" step="0.1" value={thresholds.sprint} onChange={(e) => setThresholds({ ...thresholds, sprint: e.target.value })} style={{ padding: "8px", borderRadius: "4px", border: "none" }} /></div>
                  <div style={{ display: "flex", flexDirection: "column" }}><label style={{ fontSize: "11px", color: "#bdc3c7" }}>HSR (km/h)</label><input type="number" step="0.1" value={thresholds.hsr} onChange={(e) => setThresholds({ ...thresholds, hsr: e.target.value })} style={{ padding: "8px", borderRadius: "4px", border: "none" }} /></div>
                  <div style={{ display: "flex", flexDirection: "column" }}><label style={{ fontSize: "11px", color: "#bdc3c7" }}>Acel (m/s²)</label><input type="number" step="0.1" value={thresholds.acel} onChange={(e) => setThresholds({ ...thresholds, acel: e.target.value })} style={{ padding: "8px", borderRadius: "4px", border: "none" }} /></div>
                </div>
              </div>

              <button onClick={processDataClick} style={{ padding: "15px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "5px", fontSize: "18px", fontWeight: "bold", cursor: "pointer" }}>
                Guardar y Empezar ▶
              </button>
            </div>
          )}
        </div>
        {error && <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#e74c3c", borderRadius: "5px", color: "white", fontWeight: "bold" }}>⚠️ {error}</div>}
      </div>
    );
  }

  // PANTALLA 4: SIMULADOR (appMode === "simulator")

  let stats = { currentVel: 0, maxVel: 0, distance: 0, sprints: 0, hsrDist: 0, hmldDist: 0, acels: 0, decels: 0 };
  if (selectedPlayer && players[selectedPlayer]) {
    const historyToCurrentFrame = players[selectedPlayer].slice(0, frame + 1);
    if (historyToCurrentFrame.length > 0) {
      const lastData = historyToCurrentFrame[historyToCurrentFrame.length - 1];
      stats.currentVel = lastData ? (lastData.vel || 0) : 0;
      let isAcel = false; let isDecel = false;
      let cooldownAcel = 0; let cooldownDecel = 0;
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
          if (frameData.zona === "Sprint" && !isSprint) { stats.sprints++; isSprint = true; }
          else if (frameData.zona !== "Sprint") { isSprint = false; }
          if (cooldownAcel > 0) cooldownAcel--;
          if (cooldownDecel > 0) cooldownDecel--;
          if (frameData.fuerza === "Acel" && !isAcel && cooldownAcel === 0) { stats.acels++; isAcel = true; cooldownAcel = 20; }
          else if (frameData.fuerza !== "Acel") { isAcel = false; }
          if (frameData.fuerza === "Decel" && !isDecel && cooldownDecel === 0) { stats.decels++; isDecel = true; cooldownDecel = 20; }
          else if (frameData.fuerza !== "Decel") { isDecel = false; }
        }
      }
    }
  }

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px", backgroundColor: "#2c3e50", minHeight: "100vh", fontFamily: "Arial, sans-serif", position: "relative" }}>
      {/* Botón de volver al menú en la esquina superior derecha */}
      <button
        onClick={() => setAppMode("menu")}
        style={{ position: "absolute", top: "20px", right: "20px", zIndex: 1000, padding: "10px 20px", backgroundColor: "#e74c3c", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
        ✖ Cerrar Partido
      </button>

      {resumen && (
        <button onClick={() => setShowResumen(true)} style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 1000, padding: "15px 25px", backgroundColor: "#f1c40f", color: "#2c3e50", border: "none", borderRadius: "50px", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.4)", cursor: "pointer" }}>
          📊 Métricas Totales
        </button>
      )}

      {showResumen && resumen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "90%", maxHeight: "85%", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setShowResumen(false)} style={{ position: "absolute", top: "20px", right: "20px", cursor: "pointer", fontSize: "20px", border: "none", background: "none" }}>✖</button>
            <h2 style={{ color: "#2c3e50", marginBottom: "20px", textAlign: "center" }}>Estadísticas Finales del Partido</h2>
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
        </div>
      )}

      <div style={{ flex: "0 0 1050px", display: "flex", flexDirection: "column", paddingTop: "30px" }}>

        <Pitch players={players} frame={frame} visiblePlayers={visiblePlayers} selectedPlayer={selectedPlayer} playerRoles={playerRoles} fieldLimits={fieldLimits} showLines={showLines} roles={roles} speed={speed} heatmapData={getHeatmapData()} />

        <div style={{ backgroundColor: "#f5f5f5", padding: "15px", borderRadius: "8px", marginTop: "10px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ padding: "8px 16px", cursor: "pointer", fontWeight: "bold", border: "none", borderRadius: "5px", backgroundColor: "#34495e", color: "white" }}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <div style={{ display: "flex", gap: "5px", borderRight: "2px solid #ccc", paddingRight: "15px" }}>
              {[1, 2, 10].map(multiplier => (
                <button key={`speed-${multiplier}`} onClick={() => setSpeed(multiplier)} style={{ padding: "6px 10px", cursor: "pointer", fontWeight: "bold", backgroundColor: speed === multiplier ? "#007bff" : "#e0e0e0", color: speed === multiplier ? "white" : "#333", border: "none", borderRadius: "4px" }}>
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

          <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #ccc", paddingTop: "15px", paddingBottom: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ fontWeight: "bold" }}>Analizar Jugador:</label>
                <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} style={{ padding: "5px", fontSize: "16px", cursor: "pointer" }}>
                  {Object.keys(players).map(dev => <option key={dev} value={dev}>Dorsal {dev}</option>)}
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
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Acel (+{activeConfig ? activeConfig.u_acel : 3}m/s²)</div><div style={{ fontSize: "20px", fontWeight: "bold" }}>{stats.acels}</div></div>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Decel (-{activeConfig ? activeConfig.u_acel : 3}m/s²)</div><div style={{ fontSize: "20px", fontWeight: "bold" }}>{stats.decels}</div></div>
                </div>
              </div>

              <div style={{ flex: 1, backgroundColor: "#fde8c4", padding: "10px", borderRadius: "8px", border: "1px solid #e2bc82", textAlign: "center" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#b87d21" }}>RESISTENCIA</h4>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Dist. Total</div><div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.distance.toFixed(0)}m</div></div>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>HSR (&gt;{activeConfig ? (activeConfig.u_hsr * 3.6).toFixed(1) : 21}km/h)</div><div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.hsrDist.toFixed(0)}m</div></div>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>HMLD (&gt;3m/s)</div><div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.hmldDist.toFixed(0)}m</div></div>
                </div>
              </div>

              <div style={{ flex: 1, backgroundColor: "#fff2cc", padding: "10px", borderRadius: "8px", border: "1px solid #e8d69f", textAlign: "center" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#b1983c" }}>VELOCIDAD</h4>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Vel. Máxima</div><div style={{ fontSize: "18px", fontWeight: "bold", color: "red" }}>{stats.maxVel.toFixed(2)} m/s</div></div>
                  <div><div style={{ fontSize: "12px", color: "#666" }}>Sprints (&gt;{activeConfig ? (activeConfig.u_sprint * 3.6).toFixed(1) : 24}km/h)</div><div style={{ fontSize: "18px", fontWeight: "bold" }}>{stats.sprints}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: "#ecf0f1", padding: "20px", borderRadius: "8px", boxShadow: "0 4px 8px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", paddingTop: "30px" }}>

        {/* --- MAPA DE CALOR --- */}
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #bdc3c7" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#34495e" }}>Visualizar Mapa de Calor</h4>
          <select value={heatmapMode} onChange={(e) => setHeatmapMode(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: heatmapMode !== "none" && heatmapMode !== "team" ? "10px" : "0", cursor: "pointer", fontWeight: "bold" }}>
            <option value="none">❌ Apagado</option>
            <option value="team">🌍 Todo el Equipo</option>
            <option value="role">👥 Por Línea / Posición</option>
            <option value="player">👤 Jugador Individual</option>
          </select>
          {heatmapMode === "role" && (
            <select value={selectedHeatRole} onChange={(e) => setSelectedHeatRole(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", cursor: "pointer" }}>
              {roles.filter(r => r.id !== "Banquillo").map(r => <option key={`heat-role-${r.id}`} value={r.id}>{r.name}</option>)}
            </select>
          )}
          {heatmapMode === "player" && (
            <select value={selectedHeatPlayer} onChange={(e) => setSelectedHeatPlayer(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", cursor: "pointer" }}>
              {Object.keys(players).map(dev => <option key={`heat-player-${dev}`} value={dev}>Dorsal {dev}</option>)}
            </select>
          )}
        </div>

        <h3 style={{ borderBottom: "2px solid #bdc3c7", paddingBottom: "10px", marginTop: 0, color: "#2c3e50" }}>Gestión Táctica</h3>
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #bdc3c7" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#34495e" }}>Crear Nueva Línea/Posición</h4>
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" placeholder="Ej. Pivote" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} />
            <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} style={{ width: "40px", height: "34px", padding: "0", border: "none", cursor: "pointer" }} />
            <button onClick={handleAddRole} style={{ backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "4px", padding: "0 15px", cursor: "pointer", fontWeight: "bold" }}>+</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
            {roles.map(r => (
              <div key={`badge-${r.id}`} style={{ display: "flex", alignItems: "center", backgroundColor: r.color, color: ["#f1c40f", "#ffffff"].includes(r.color.toLowerCase()) ? "black" : "white", padding: "4px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                {r.name}
                {!r.isDefault && <span onClick={() => handleDeleteRole(r.id)} style={{ marginLeft: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>&times;</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#fff", borderRadius: "5px", border: "1px solid #bdc3c7", display: "flex", alignItems: "center", gap: "10px" }}>
          <input type="checkbox" id="lines-toggle" checked={showLines} onChange={(e) => setShowLines(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
          <label htmlFor="lines-toggle" style={{ fontWeight: "bold", cursor: "pointer", color: "#2c3e50" }}>Unir líneas por posición</label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1 }}>
          {Object.keys(players).map(dev => {
            const currentRole = playerRoles[dev] || "Banquillo";
            const isPlaying = currentRole !== "Banquillo";
            const roleObj = roles.find(r => r.id === currentRole);
            const borderColor = roleObj ? roleObj.color : "#7f8c8d";

            return (
              <div key={`role-${dev}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: isPlaying ? "#fff" : "#e0e0e0", padding: "10px", borderRadius: "5px", borderLeft: `4px solid ${borderColor}`, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <span style={{ fontWeight: "bold", color: isPlaying ? "#2c3e50" : "#7f8c8d" }}>Dorsal {dev}</span>
                <select value={currentRole} onChange={(e) => handleRoleChange(dev, e.target.value)} style={{ padding: "5px", borderRadius: "4px", border: "1px solid #bdc3c7", cursor: "pointer", fontWeight: "bold" }}>
                  {roles.map(r => <option key={`opt-${r.id}`} value={r.id}>{r.name}</option>)}
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