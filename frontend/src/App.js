import React, { useEffect, useState } from "react";
import { getFrames, uploadExcel } from "./api";
import Pitch from "./Pitch";

function App() {
  const [players, setPlayers] = useState({});
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [maxFrames, setMaxFrames] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [visiblePlayers, setVisiblePlayers] = useState([]);
  const [speed, setSpeed] = useState(1);
  const [playerRoles, setPlayerRoles] = useState({});

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Estados de Formulario
  const [selectedFile, setSelectedFile] = useState(null);
  const [matchTimes, setMatchTimes] = useState({
    start_h1: "", end_h1: "", start_h2: "", end_h2: ""
  });
  const [resumen, setResumen] = useState(null);
  const [showResumen, setShowResumen] = useState(false);

  // NUEVO ESTADO: Campos y Límites
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [fieldLimits, setFieldLimits] = useState(null);

  const formatFrameToTime = (frameNumber) => {
    const totalSeconds = frameNumber / 10;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const setupData = (data) => {
    setPlayers(data.players);
    setResumen(data.resumen);
    setFieldLimits(data.field_limits); // Guardamos los límites fijos del campo

    let max = 0;
    Object.values(data.players).forEach(p => {
      if (p.length > max) max = p.length;
    });
    setMaxFrames(max);

    if (Object.keys(data.players).length > 0) {
      setSelectedPlayer(Object.keys(data.players)[0]);
      const initialRoles = {};
      Object.keys(data.players).forEach(d => initialRoles[d] = "Banquillo");
      setPlayerRoles(initialRoles);
      setVisiblePlayers([]);
    }
    setIsLoaded(true);
  };

  // Cargar lista de campos al arrancar la app
  useEffect(() => {
    async function fetchFields() {
      try {
        const res = await fetch("http://127.0.0.1:8000/fields");
        const data = await res.json();
        setFields(data);
        if (data.length > 0) setSelectedField(data[0].id);
      } catch (e) {
        console.error("Error cargando la lista de campos", e);
      }
    }
    fetchFields();
  }, []);

  useEffect(() => {
    async function checkExistingData() {
      try {
        const data = await getFrames();
        setupData(data);
      } catch (err) {
        setIsLoaded(false);
      }
    }
    checkExistingData();
  }, []);

  const handleTimeChange = (e) => {
    setMatchTimes({ ...matchTimes, [e.target.name]: e.target.value });
  };

  const processDataClick = async () => {
    if (!selectedFile) {
      setError("Por favor, selecciona un archivo Excel primero.");
      return;
    }
    if (!selectedField) {
      setError("Por favor, selecciona el campo donde se jugó.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      // Pasamos el ID del campo a la API
      await uploadExcel(selectedFile, matchTimes, selectedField);
      const data = await getFrames();
      setupData(data);
    } catch (err) {
      setError(err.message || "Error desconocido al procesar el archivo");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!players || maxFrames === 0 || !isPlaying || !isLoaded) return;
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % maxFrames);
    }, 100 / speed);
    return () => clearInterval(interval);
  }, [players, maxFrames, isPlaying, speed, isLoaded]);

  const handleCheckboxChange = (dev) => {
    setVisiblePlayers(prev =>
      prev.includes(dev) ? prev.filter(p => p !== dev) : [...prev, dev]
    );
  };

  const handleRoleChange = (dev, newRole) => {
    setPlayerRoles(prev => ({ ...prev, [dev]: newRole }));
    if (newRole === "Banquillo") {
      setVisiblePlayers(prev => prev.filter(p => p !== dev));
    } else {
      setVisiblePlayers(prev => prev.includes(dev) ? prev : [...prev, dev]);
    }
  };

  // --- PANTALLA INICIAL DE CARGA ---
  if (!isLoaded) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#2c3e50", color: "white", fontFamily: "Arial, sans-serif", padding: "20px" }}>
        <h1 style={{ marginBottom: "10px", fontSize: "36px", textAlign: "center" }}>TFG Fútbol - Análisis Táctico</h1>
        <p style={{ marginBottom: "30px", color: "#bdc3c7", fontSize: "16px", textAlign: "center" }}>Calibra las coordenadas del campo y filtra el tiempo real de juego.</p>

        <div style={{ backgroundColor: "#34495e", padding: "40px", borderRadius: "10px", border: "2px solid #7f8c8d", width: "100%", maxWidth: "600px", boxShadow: "0 10px 20px rgba(0,0,0,0.3)" }}>
          {uploading ? (
            <div style={{ textAlign: "center" }}>
              <h3 style={{ color: "#f1c40f" }}>Procesando y Sincronizando...</h3>
              <p style={{ fontSize: "14px", color: "#bdc3c7" }}>Calculando distancias y anclando coordenadas satelitales.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>

              <div style={{ textAlign: "center", backgroundColor: "#2c3e50", padding: "15px", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#ecf0f1" }}>1. Archivo de Datos (GPS)</h4>
                <input type="file" accept=".xlsx, .xls" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: "none" }} id="excel-upload" />
                <label htmlFor="excel-upload" style={{ display: "inline-block", padding: "12px 20px", backgroundColor: selectedFile ? "#2980b9" : "#7f8c8d", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                  {selectedFile ? `✅ ${selectedFile.name}` : "📁 Cargar Excel"}
                </label>
              </div>

              <div style={{ backgroundColor: "#2c3e50", padding: "15px", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#ecf0f1", textAlign: "center" }}>2. Calibración del Terreno de Juego</h4>
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  style={{ width: "100%", padding: "12px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "bold", color: "#2c3e50" }}
                >
                  {fields.length === 0 && <option value="">Cargando campos disponibles...</option>}
                  {fields.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ backgroundColor: "#2c3e50", padding: "15px", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#ecf0f1", textAlign: "center" }}>3. Tiempos de Partido (Opcional)</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "12px", color: "#bdc3c7" }}>Inicio 1ª Parte</label>
                    <input type="time" name="start_h1" value={matchTimes.start_h1} onChange={handleTimeChange} style={{ padding: "8px", borderRadius: "4px", border: "none" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "12px", color: "#bdc3c7" }}>Fin 1ª Parte</label>
                    <input type="time" name="end_h1" value={matchTimes.end_h1} onChange={handleTimeChange} style={{ padding: "8px", borderRadius: "4px", border: "none" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "12px", color: "#bdc3c7" }}>Inicio 2ª Parte</label>
                    <input type="time" name="start_h2" value={matchTimes.start_h2} onChange={handleTimeChange} style={{ padding: "8px", borderRadius: "4px", border: "none" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "12px", color: "#bdc3c7" }}>Fin 2ª Parte</label>
                    <input type="time" name="end_h2" value={matchTimes.end_h2} onChange={handleTimeChange} style={{ padding: "8px", borderRadius: "4px", border: "none" }} />
                  </div>
                </div>
              </div>

              <button onClick={processDataClick} style={{ padding: "15px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "5px", fontSize: "18px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}>
                ▶ Iniciar Simulador
              </button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#e74c3c", borderRadius: "5px", color: "white", fontWeight: "bold", maxWidth: "600px", textAlign: "center" }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    );
  }

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

          if (frameData.fuerza === "Acel" && !isAcel && cooldownAcel === 0) {
            stats.acels++; isAcel = true; cooldownAcel = 20;
          } else if (frameData.fuerza !== "Acel") { isAcel = false; }

          if (frameData.fuerza === "Decel" && !isDecel && cooldownDecel === 0) {
            stats.decels++; isDecel = true; cooldownDecel = 20;
          } else if (frameData.fuerza !== "Decel") { isDecel = false; }
        }
      }
    }
  }

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px", backgroundColor: "#2c3e50", minHeight: "100vh", fontFamily: "Arial, sans-serif", position: "relative" }}>

      {resumen && (
        <button
          onClick={() => setShowResumen(true)}
          style={{
            position: "fixed", bottom: "30px", right: "30px", zIndex: 1000,
            padding: "15px 25px", backgroundColor: "#f1c40f", color: "#2c3e50",
            border: "none", borderRadius: "50px", fontWeight: "bold", fontSize: "16px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.4)", cursor: "pointer"
          }}
        >
          📊 Métricas Totales
        </button>
      )}

      {showResumen && resumen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex",
          alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            backgroundColor: "white", padding: "30px", borderRadius: "12px",
            width: "90%", maxHeight: "85%", overflowY: "auto", position: "relative"
          }}>
            <button
              onClick={() => setShowResumen(false)}
              style={{ position: "absolute", top: "20px", right: "20px", cursor: "pointer", fontSize: "20px", border: "none", background: "none" }}
            >
              ✖
            </button>

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

      <div style={{ flex: "0 0 1050px", display: "flex", flexDirection: "column" }}>

        {/* PASAMOS LOS LÍMITES AL COMPONENTE PITCH */}
        <Pitch players={players} frame={frame} visiblePlayers={visiblePlayers} selectedPlayer={selectedPlayer} playerRoles={playerRoles} fieldLimits={fieldLimits} />

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

      <div style={{ flex: 1, backgroundColor: "#ecf0f1", padding: "20px", borderRadius: "8px", boxShadow: "0 4px 8px rgba(0,0,0,0.2)" }}>
        <h3 style={{ borderBottom: "2px solid #bdc3c7", paddingBottom: "10px", marginTop: 0, color: "#2c3e50" }}>Gestión Táctica</h3>
        <p style={{ fontSize: "13px", color: "#7f8c8d", marginBottom: "20px" }}>Asigna posiciones para sacar a los jugadores al campo o envíalos al banquillo.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
          {Object.keys(players).map(dev => {
            const currentRole = playerRoles[dev] || "Banquillo";
            const isPlaying = currentRole !== "Banquillo";

            return (
              <div key={`role-${dev}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: isPlaying ? "#fff" : "#e0e0e0", padding: "10px", borderRadius: "5px", borderLeft: isPlaying ? "4px solid #27ae60" : "4px solid #7f8c8d", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <span style={{ fontWeight: "bold", color: isPlaying ? "#2c3e50" : "#7f8c8d" }}>Dorsal {dev}</span>
                <select value={currentRole} onChange={(e) => handleRoleChange(dev, e.target.value)} style={{ padding: "5px", borderRadius: "4px", border: "1px solid #bdc3c7", cursor: "pointer", fontWeight: "bold" }}>
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