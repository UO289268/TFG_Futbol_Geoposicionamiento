import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlayerStats } from './api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function PlayerDashboard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState("total");
    
    // 💡 Referencia para saber qué parte de la pantalla convertir a PDF
    const printRef = useRef();

    useEffect(() => {
        cargarDatos();
    }, [id]);

    const cargarDatos = async () => {
        try {
            const stats = await getPlayerStats(id);
            setData(stats);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 💡 Función principal para exportar a PDF
    const handleDownloadPdf = async () => {
        const element = printRef.current;
        if (!element) return;

        try {
            // Hacemos una captura de alta calidad del contenedor
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');

            // Configuramos el PDF en formato A4 vertical
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            // Nombre del archivo dinámico según el jugador y el filtro
            const fileName = `Informe_${data.player.name.replace(/\s+/g, '_')}_${selectedMatch}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            alert("Error al generar el PDF");
            console.error(error);
        }
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Cargando perfil...</div>;
    if (!data) return <div style={{ padding: "40px", textAlign: "center" }}>Error al cargar los datos.</div>;

    const currentKpis = selectedMatch === "total" 
        ? data.kpis 
        : data.historial_partidos.find(m => m.id === selectedMatch) || data.kpis;

    return (
        <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e0e0e0", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <button onClick={() => navigate(-1)} style={{ padding: "8px 15px", borderRadius: "5px", border: "1px solid #bdc3c7", backgroundColor: "#f8f9fa", cursor: "pointer" }}>
                        🔙 Volver
                    </button>
                    {data.player.photo_url ? (
                        <img src={data.player.photo_url} alt={data.player.name} style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                        <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "#3498db", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold" }}>
                            {data.player.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h2 style={{ margin: "0 0 5px 0", color: "#2c3e50" }}>{data.player.name} <span style={{ backgroundColor: "#34495e", color: "white", padding: "3px 8px", borderRadius: "10px", fontSize: "14px" }}>#{data.player.dorsal}</span></h2>
                        <span style={{ color: "#7f8c8d" }}>📍 {data.player.position}</span>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: "15px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "bold", color: "#7f8c8d", textTransform: "uppercase" }}>Filtrar Datos</label>
                        <select 
                            value={selectedMatch} 
                            onChange={(e) => setSelectedMatch(e.target.value)}
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #bdc3c7", backgroundColor: "#f8f9fa", cursor: "pointer", fontWeight: "bold", color: "#2c3e50", fontSize: "15px", outline: "none" }}
                        >
                            <option value="total">📊 Totales (Sumatorio)</option>
                            <optgroup label="Partidos Individuales">
                                {data.historial_partidos.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.date})</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                    {/* 💡 NUEVO BOTÓN DE EXPORTACIÓN */}
                    <button 
                        onClick={handleDownloadPdf}
                        style={{ padding: "10px 20px", backgroundColor: "#e74c3c", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px", height: "42px" }}
                    >
                        📄 Descargar PDF
                    </button>
                </div>
            </div>

            {/* 💡 Todo el contenido dentro de este div se exportará al PDF */}
            <div ref={printRef} style={{ backgroundColor: "#f4f6f8", padding: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
                    <KpiCard title="MINUTOS JUGADOS" value={`${currentKpis.minutos} min`} />
                    <KpiCard title="DISTANCIA TOTAL" value={`${currentKpis.distancia} m`} />
                    <KpiCard title="VELOCIDAD MÁXIMA" value={`${currentKpis.vmax} km/h`} />
                    <KpiCard title="PLAYER LOAD" value={`${currentKpis.playerLoad} u.a.`} />
                    <KpiCard title="SPRINTS" value={currentKpis.sprints} />
                    <KpiCard title="DISTANCIA HSR" value={`${currentKpis.hsr} m`} />
                    <KpiCard title="ACELERACIONES" value={currentKpis.acels} />
                    <KpiCard title="DESACELERACIONES" value={currentKpis.decels} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                    <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
                        <h3 style={{ margin: "0 0 20px 0", color: "#2c3e50", fontSize: "16px" }}>Player Load Acumulado (Media por Partido)</h3>
                        <div style={{ height: "300px" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.playerLoadAcumulado}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0f1" />
                                    <XAxis dataKey="minuto" tick={{ fontSize: 12, fill: "#7f8c8d" }} tickMargin={10} />
                                    <YAxis tick={{ fontSize: 12, fill: "#7f8c8d" }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                                    <Line type="monotone" dataKey="load" stroke="#2ecc71" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
                        <h3 style={{ margin: "0 0 20px 0", color: "#2c3e50", fontSize: "16px" }}>Zonas de velocidad</h3>
                        <div style={{ height: "250px" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.zonasVelocidad} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {data.zonasVelocidad.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                            {data.zonasVelocidad.map(zona => (
                                <div key={zona.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: zona.color }}></div>
                                        <span style={{ color: "#2c3e50" }}>{zona.name}</span>
                                    </div>
                                    <span style={{ fontWeight: "bold" }}>{zona.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value }) {
    return (
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "11px", color: "#7f8c8d" }}>{title}</h4>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}>{value}</div>
        </div>
    );
}

export default PlayerDashboard;