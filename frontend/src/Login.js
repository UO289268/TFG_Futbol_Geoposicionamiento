import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "./api";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await loginUser(email, password);
      // Guardamos el token y los datos del usuario en el navegador
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
      navigate("/"); // Redirige al inicio tras loguearse
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f8f9fa", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: "400px" }}>
        <h2 style={{ textAlign: "center", color: "#2c3e50", marginBottom: "30px", fontSize: "28px" }}>TFG Analytics</h2>
        
        {error && <div style={{ backgroundColor: "#ffcccc", color: "#cc0000", padding: "10px", borderRadius: "6px", marginBottom: "20px", textAlign: "center", fontSize: "14px" }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#7f8c8d", fontSize: "14px" }}>Correo Electrónico</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #bdc3c7", boxSizing: "border-box", fontSize: "16px" }}
              required 
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#7f8c8d", fontSize: "14px" }}>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #bdc3c7", boxSizing: "border-box", fontSize: "16px" }}
              required 
            />
          </div>
          <button type="submit" style={{ backgroundColor: "#27ae60", color: "white", padding: "14px", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}>
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;