import React, { useEffect, useState } from "react";
import { getFrames } from "./api";
import Pitch from "./Pitch";

function App() {
  const [players, setPlayers] = useState({});
  const [frame, setFrame] = useState(0);

  // Nuevos estados para los controles
  const [isPlaying, setIsPlaying] = useState(true);
  const [maxFrames, setMaxFrames] = useState(0);

  // Carga inicial de jugadores
  useEffect(() => {
    async function load() {
      const data = await getFrames();
      setPlayers(data.players);

      // Calculamos el máximo de frames una sola vez de forma segura
      let max = 0;
      Object.values(data.players).forEach(p => {
        if (p.length > max) max = p.length;
      });
      setMaxFrames(max);
    }
    load();
  }, []);

  // Reproducción de frames
  useEffect(() => {
    // Si no hay jugadores, o si estamos en pausa, no hacemos nada
    if (!players || maxFrames === 0 || !isPlaying) return;

    const interval = setInterval(() => {
      // Si llega al final, vuelve al principio (o podrías hacer que se detenga)
      setFrame(f => (f + 1) % maxFrames);
    }, 100);

    return () => clearInterval(interval);
  }, [players, maxFrames, isPlaying]); // Añadimos isPlaying a las dependencias

  if (!players || Object.keys(players).length === 0) {
    return <div>Loading players...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>

      {/* El campo de fútbol */}
      <Pitch players={players} frame={frame} />

      {/* Panel de Controles */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "15px",
        marginTop: "20px",
        width: "1050px", // Mismo ancho que tu Pitch para que quede alineado
        backgroundColor: "#f5f5f5",
        padding: "10px 20px",
        borderRadius: "8px",
        boxSizing: "border-box"
      }}>

        {/* Botón Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{ padding: "8px 16px", cursor: "pointer", fontWeight: "bold" }}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>

        {/* Barra de progreso (Slider) */}
        <input
          type="range"
          min="0"
          max={maxFrames > 0 ? maxFrames - 1 : 0}
          value={frame}
          // Cuando el usuario mueve la barra, actualizamos el frame
          onChange={(e) => setFrame(Number(e.target.value))}
          style={{ flexGrow: 1, cursor: "pointer" }}
        />

        {/* Indicador de texto */}
        <span style={{ fontFamily: "monospace", minWidth: "120px" }}>
          Frame: {frame} / {maxFrames > 0 ? maxFrames - 1 : 0}
        </span>

      </div>
    </div>
  );
}

export default App;