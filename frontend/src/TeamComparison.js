import React, { useState, useEffect } from 'react';
import { getTeamPlayers } from './api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function TeamComparison({ resumen, period }) {
    const [playersDB, setPlayersDB] = useState([]);

    useEffect(() => {
        getTeamPlayers().then(setPlayersDB).catch(console.error);
    }, []);

    if (!resumen) return null;

    // Función para procesar y ordenar los datos de mayor a menor
    const getData = (metricKey) => {
        const chartData = [];
        Object.keys(resumen).forEach(dorsal => {
            const stats = resumen[dorsal][period];
            if (stats && stats[metricKey] > 0) {
                const dbPlayer = playersDB.find(p => String(p.dorsal) === String(dorsal));
                const name = dbPlayer ? dbPlayer.name : `Dorsal ${dorsal}`;
                chartData.push({
                    name: name,
                    value: stats[metricKey]
                });
            }
        });
        return chartData.sort((a, b) => b.value - a.value); 
    };

    const distData = getData('dist');
    const hsrData = getData('hsr');
    const plData = getData('pl');
    const vmaxData = getData('max_v');

    // Plantilla universal para las 4 gráficas
    const renderChart = (data, color, title) => {
        // 💡 Calculamos la altura dinámicamente: 35px por cada jugadora para que nunca se aplasten
        const chartHeight = Math.max(300, data.length * 35); 

        return (
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#2c3e50" }}>{title}</h4>
                <div style={{ height: `${chartHeight}px`, width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            {/* 💡 Activamos las líneas de guía verticales para leer los valores fácilmente */}
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#ecf0f1" />
                            
                            {/* 💡 Activamos el Eje X numérico en la parte inferior */}
                            <XAxis type="number" tick={{ fill: '#7f8c8d', fontSize: 13, fontWeight: 'bold' }} stroke="#bdc3c7" />
                            
                            {/* 💡 interval={0} obliga a React a pintar TODOS los nombres sin saltarse ninguno */}
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                interval={0} 
                                width={85} 
                                tick={{ fill: '#34495e', fontSize: 13, fontWeight: 'bold' }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            
                            <Tooltip 
                                cursor={{ fill: 'rgba(0,0,0,0.04)' }} 
                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", fontWeight: 'bold' }} 
                            />
                            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={18} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", paddingBottom: "20px" }}>
            {renderChart(distData, "#3498db", "Distancia Total (m)")}
            {renderChart(hsrData, "#e67e22", "Distancia HSR (m)")}
            {renderChart(plData, "#2ecc71", "Player Load (u.a.)")}
            {renderChart(vmaxData, "#e74c3c", "Velocidad Máxima (km/h)")}
        </div>
    );
}

export default TeamComparison;