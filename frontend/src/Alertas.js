import React, { useState } from "react";
import { TIPOS_ALERTA } from "./tactica";

const COLORES_REGLA = ["#e74c3c", "#8e44ad", "#e67e22", "#16a085", "#2c3e50", "#c0392b"];
export const colorRegla = (reglas, reglaId) => {
    const i = reglas.findIndex(r => r.id === reglaId);
    return COLORES_REGLA[(i >= 0 ? i : 0) % COLORES_REGLA.length];
};

// Hora de un fotograma dentro de su parte (mm:ss) con la parte delante.
export const formatoInstante = (f, h1Frames, hayH2) => {
    const enH2 = hayH2 && f >= h1Frames;
    const seg = Math.floor((enH2 ? f - h1Frames : f) / 10);
    const mmss = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
    return hayH2 ? `${enH2 ? "2ª" : "1ª"} ${mmss}` : mmss;
};

const describirRegla = (r, roles) => {
    const nombreLinea = id => (roles.find(x => x.id === id) || { name: id }).name;
    if (r.tipo === "pareja") return `Dorsal ${r.a} – Dorsal ${r.b} > ${r.umbral} m`;
    if (r.tipo === "centroides") return `${nombreLinea(r.a)} – ${nombreLinea(r.b)} > ${r.umbral} m`;
    return `Jugadora a > ${r.umbral} m de la más cercana`;
};

const estiloCampo = { width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };

const Alertas = ({ reglas, setReglas, episodios, players, roles, playerRoles, h1Frames, hayH2, frame, onSeek }) => {
    const devs = Object.keys(players || {});
    const lineas = roles.filter(r => r.id !== "Banquillo" && Object.values(playerRoles).includes(r.id));
    const [tipo, setTipo] = useState("pareja");
    const [a, setA] = useState("");
    const [b, setB] = useState("");
    const [umbral, setUmbral] = useState(15);
    const [duracion, setDuracion] = useState(2);
    const [abierta, setAbierta] = useState(true);

    const opciones = tipo === "pareja" ? devs.map(d => ({ id: d, name: `Dorsal ${d}` })) : lineas.map(l => ({ id: l.id, name: l.name }));
    const valA = a || (opciones[0] ? opciones[0].id : "");
    const valB = b || (opciones[1] ? opciones[1].id : "");

    const anadir = () => {
        if (tipo !== "aislada" && (!valA || !valB || valA === valB)) return alert("Elige dos elementos distintos.");
        if (!(Number(umbral) > 0)) return alert("El umbral debe ser mayor que 0.");
        setReglas([...reglas, { id: Date.now(), tipo, a: valA, b: valB, umbral: Number(umbral), duracion: Math.max(0, Number(duracion)) }]);
    };

    const cambiarTipo = (t) => { setTipo(t); setA(""); setB(""); };

    return (
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#fdf2f2", borderRadius: "8px", border: "1px solid #f1c4c4" }}>
            <div onClick={() => setAbierta(!abierta)} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                <h4 style={{ margin: 0, fontSize: "14px", color: "#922b21" }}>🚨 Alertas tácticas ({episodios.length})</h4>
                <span style={{ color: "#922b21" }}>{abierta ? "▲" : "▼"}</span>
            </div>

            {abierta && (
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <select value={tipo} onChange={e => cambiarTipo(e.target.value)} style={estiloCampo}>
                        {Object.entries(TIPOS_ALERTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>

                    {tipo !== "aislada" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                            <select value={valA} onChange={e => setA(e.target.value)} style={estiloCampo}>
                                {opciones.map(o => <option key={`a-${o.id}`} value={o.id}>{o.name}</option>)}
                            </select>
                            <select value={valB} onChange={e => setB(e.target.value)} style={estiloCampo}>
                                {opciones.map(o => <option key={`b-${o.id}`} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "13px" }}>
                        <span>Más de</span>
                        <input type="number" min="1" value={umbral} onChange={e => setUmbral(e.target.value)} style={{ ...estiloCampo, width: "70px" }} />
                        <span>m durante</span>
                        <input type="number" min="0" step="0.5" value={duracion} onChange={e => setDuracion(e.target.value)} style={{ ...estiloCampo, width: "60px" }} />
                        <span>s</span>
                        <button onClick={anadir} style={{ marginLeft: "auto", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontWeight: "bold" }}>Añadir</button>
                    </div>

                    {reglas.map(r => {
                        const n = episodios.filter(e => e.reglaId === r.id).length;
                        return (
                            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", backgroundColor: "white", padding: "6px 8px", borderRadius: "4px", borderLeft: `4px solid ${colorRegla(reglas, r.id)}` }}>
                                <span style={{ flex: 1 }}>{describirRegla(r, roles)} <span style={{ color: "#7f8c8d" }}>(≥ {r.duracion} s) · {n} episodios</span></span>
                                <span onClick={() => setReglas(reglas.filter(x => x.id !== r.id))} style={{ cursor: "pointer", fontWeight: "bold", color: "#c0392b" }} title="Eliminar regla">&times;</span>
                            </div>
                        );
                    })}

                    {reglas.length > 0 && (
                        <div style={{ maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {episodios.length === 0 && <div style={{ fontSize: "13px", color: "#7f8c8d" }}>No se han encontrado episodios con estas reglas.</div>}
                            {episodios.map((e, i) => {
                                const activo = frame >= e.start && frame <= e.end;
                                const quien = e.tipo === "aislada" ? `Dorsal ${e.devs[0]}` : e.tipo === "pareja" ? `${e.devs[0]} – ${e.devs[1]}` : e.lineas.join(" – ");
                                return (
                                    <div key={`ep-${i}`} onClick={() => onSeek(e.start)} title="Ir a este instante"
                                        style={{ display: "flex", gap: "8px", fontSize: "12px", padding: "5px 8px", borderRadius: "4px", cursor: "pointer", backgroundColor: activo ? "#fadbd8" : "white", borderLeft: `4px solid ${colorRegla(reglas, e.reglaId)}` }}>
                                        <span style={{ fontFamily: "monospace", fontWeight: "bold", minWidth: "58px" }}>{formatoInstante(e.start, h1Frames, hayH2)}</span>
                                        <span style={{ flex: 1 }}>{quien}</span>
                                        <span>{((e.end - e.start + 1) / 10).toFixed(1)} s</span>
                                        <span style={{ fontWeight: "bold" }}>máx. {e.max.toFixed(1)} m</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Alertas;
