import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getClubPlayers } from './api';

function TeamComparison({ resumen, period = "total" }) {
  const [nombres, setNombres] = useState({});

  useEffect(() => {
    async function fetchNombres() {
      try {
        const playersDB = await getClubPlayers();
        const mapaNombres = {};
        playersDB.forEach(p => {
          mapaNombres[p.dorsal.toString()] = p.name.split(" ")[0]; // Coge solo el primer nombre o apodo para que quepa bien
        });
        setNombres(mapaNombres);
      } catch (error) {
        console.error("Error cargando nombres", error);
      }
    }
    fetchNombres();
  }, []);

  if (!resumen) return null;

  // 1. Transformar el JSON del backend en un array manejable
  const data = Object.keys(resumen).map(dorsal => {
    const stats = resumen[dorsal][period];
    return {
      name: nombres[dorsal] || `Dorsal ${dorsal}`,
      dist: stats.dist || 0,
      hsr: stats.hsr || 0,
      pl: stats.pl || 0,
      vmax: stats.max_v || 0
    };
  });

  // 2. Ordenar los datos de menor a mayor para que Recharts dibuje el mayor arriba
  const byDist = [...data].sort((a, b) => a.dist - b.dist);
  const byHsr = [...data].sort((a, b) => a.hsr - b.hsr);
  const byPL = [...data].sort((a, b) => a.pl - b.pl);
  const byVmax = [...data].sort((a, b) => a.vmax - b.vmax);

  const ChartCard = ({ title, dataSorted, dataKey, color, unit }) => (
    <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
      <h3 style={{ margin: "0 0 15px 0", color: "#2c3e50", fontSize: "16px" }}>{title}</h3>
      <div style={{ height: "280px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={dataSorted} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7f8c8d", fontWeight: "bold" }} width={80} />
            <Tooltip 
              cursor={{fill: 'transparent'}} 
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", fontWeight: "bold" }}
              formatter={(value) => [`${value} ${unit}`, title]}
            />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} barSize={12}>
              {dataSorted.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", padding: "10px" }}>
      <ChartCard title="Distancia" dataSorted={byDist} dataKey="dist" color="#3b82f6" unit="m" />
      <ChartCard title="HSR" dataSorted={byHsr} dataKey="hsr" color="#f97316" unit="m" />
      <ChartCard title="Player Load" dataSorted={byPL} dataKey="pl" color="#10b981" unit="u.a." />
      <ChartCard title="Vel. Máxima" dataSorted={byVmax} dataKey="vmax" color="#ef4444" unit="km/h" />
    </div>
  );
}

export default TeamComparison;