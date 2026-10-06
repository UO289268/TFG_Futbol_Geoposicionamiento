import React, { useState, useEffect } from 'react';
import { getClubTeams, createTeam, CATEGORIAS_UMBRALES } from './api';

function SeleccionEquipo({ onTeamSelect }) {
    const [teams, setTeams] = useState([]);
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamCategory, setNewTeamCategory] = useState(Object.keys(CATEGORIAS_UMBRALES)[0]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarEquipos();
    }, []);

    const cargarEquipos = async () => {
        try {
            const data = await getClubTeams();
            setTeams(data);
        } catch (error) {
            console.error("Error al cargar equipos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        try {
            const nuevoEquipo = await createTeam({ name: newTeamName, category: newTeamCategory });
            setTeams([...teams, nuevoEquipo]);
            setNewTeamName("");
        } catch (error) {
            alert("Error al crear el equipo");
        }
    };

    const handleSelectTeam = (team) => {
        localStorage.setItem("activeTeamId", team.id);
        localStorage.setItem("activeTeamCategory", team.category);
        onTeamSelect(team);
    };

    if (loading) return <div style={{ padding: "40px" }}>Cargando equipos...</div>;

    return (
        <div style={{ maxWidth: "600px", margin: "40px auto", backgroundColor: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
            <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>Selecciona tu Equipo</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
                {teams.length === 0 ? (
                    <p style={{ color: "#7f8c8d" }}>No hay equipos registrados en este club.</p>
                ) : (
                    teams.map(team => (
                        <button 
                            key={team.id} 
                            onClick={() => handleSelectTeam(team)}
                            style={{ padding: "15px", backgroundColor: "#f8f9fa", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", textAlign: "left", fontSize: "16px", fontWeight: "bold", color: "#34495e", transition: "0.2s" }}
                        >
                            {team.name} <span style={{ fontSize: "12px", color: "#95a5a6", fontWeight: "normal", marginLeft: "10px" }}>({team.category})</span>
                        </button>
                    ))
                )}
            </div>

            <h3 style={{ color: "#2c3e50", fontSize: "18px", borderTop: "1px solid #eee", paddingTop: "20px" }}>Crear Nuevo Equipo</h3>
            <form onSubmit={handleCreateTeam} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <input 
                    type="text" 
                    placeholder="Nombre (Ej. Infantil A)" 
                    value={newTeamName} 
                    onChange={(e) => setNewTeamName(e.target.value)} 
                    required 
                    style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }}
                />
                <select 
                    value={newTeamCategory} 
                    onChange={(e) => setNewTeamCategory(e.target.value)}
                    style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }}
                >
                    {Object.keys(CATEGORIAS_UMBRALES).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <button type="submit" style={{ padding: "12px", backgroundColor: "#2ecc71", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                    + Añadir Equipo
                </button>
            </form>
        </div>
    );
}

export default SeleccionEquipo;