import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getPlayerStats } from "./api"; 

function PlayerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);

  // 💡 AQUÍ ESTÁ LA MAGIA: Pedimos los datos reales al backend usando el ID
  useEffect(() => {
    async function fetchData() {
      setCargando(true);
      try {
        const stats = await getPlayerStats(id);
        setData(stats);
      } catch (error) {
        console.error("Error cargando estadísticas", error);
      } finally {
        setCargando(false);
      }
    }
    fetchData();
  }, [id]);

  if (cargando) return <div style={{ padding: "40px", color: "#7f8c8d" }}>Cargando perfil y métricas...</div>;
  if (!data) return <div style={{ padding: "40px", color: "#e74c3c" }}>No hay estadísticas registradas para este jugador aún. Sube un partido donde coincida su DEV.</div>;

  const { player, kpis, playerLoadAcumulado, zonasVelocidad } = data;

  return (
    <div>
      {/* Cabecera del Jugador */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "30px", backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
        <button onClick={() => navigate("/plantilla")} style={{ padding: "8px 15px", backgroundColor: "#f4f6f8", border: "1px solid #bdc3c7", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", color: "#2c3e50" }}>
          🔙 Volver
        </button>
        <div style={{ width: "60px", height: "60px", borderRadius: "50%", overflow: "hidden", border: "2px solid #27ae60", backgroundColor: "#ecf0f1", display: "flex", justifyContent: "center", alignItems: "center" }}>
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "24px" }}>👤</span>
          )}
        </div>
        <div>
          <h2 style={{ margin: "0 0 5px 0", color: "#2c3e50", fontSize: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
            {player.name} 
            <span style={{ fontSize: "14px", backgroundColor: "#2c3e50", color: "white", padding: "2px 8px", borderRadius: "12px" }}>#{player.dorsal}</span>
          </h2>
          <span style={{ color: "#7f8c8d", fontSize: "14px" }}>📍 {player.position}</span>
        </div>
      </div>

      {/* Tarjetas de KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "30px" }}>
        {[
          { label: "Minutos jugados", value: kpis.minutos, unit: "min" },
          { label: "Distancia Total", value: kpis.distancia, unit: "m" },
          { label: "Velocidad Máxima", value: kpis.vmax, unit: "km/h" },
          { label: "Player Load", value: kpis.playerLoad, unit: "u.a." },
          { label: "Sprints", value: kpis.sprints, unit: "" },
          { label: "Distancia HSR", value: kpis.hsr, unit: "m" },
          { label: "Aceleraciones", value: kpis.acels, unit: "" },
          { label: "Desaceleraciones", value: kpis.decels, unit: "" }
        ].map((kpi, index) => (
          <div key={index} style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px", border: "1px solid #e0e0e0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ color: "#7f8c8d", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "10px" }}>{kpi.label}</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}>
              {kpi.value} <span style={{ fontSize: "14px", color: "#bdc3c7", fontWeight: "normal" }}>{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
          <h3 style={{ margin: "0 0 20px 0", color: "#2c3e50", fontSize: "16px" }}>Player Load Acumulado (Media por Partido)</h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={playerLoadAcumulado} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#27ae60" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#27ae60" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0f1" />
                <XAxis dataKey="minuto" tickLine={false} axisLine={false} tick={{fill: '#7f8c8d', fontSize: 12}} />
                <YAxis tickLine={false} axisLine={false} tick={{fill: '#7f8c8d', fontSize: 12}} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="load" stroke="#27ae60" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
          <h3 style={{ margin: "0 0 20px 0", color: "#2c3e50", fontSize: "16px" }}>Zonas de velocidad</h3>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={zonasVelocidad} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {zonasVelocidad.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
            {zonasVelocidad.map(zona => (
              <div key={zona.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#2c3e50" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: zona.color }}></div>
                  {zona.name}
                </div>
                <span style={{ fontWeight: "bold" }}>{zona.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerDashboard;