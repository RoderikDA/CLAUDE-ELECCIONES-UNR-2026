import { useState } from "react";
import { login } from "./api.js";
import { WA_LINK, WA_NOMBRE } from "./UI.jsx";

export default function Login({ onLogin }) {
  const [codigo,  setCodigo]  = useState("");
  const [nombre,  setNombre]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setLoading(true); setError(null);
    try {
      const user = await login(codigo, nombre);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      background:"#f8f9fa", fontFamily:"'Segoe UI',sans-serif",
    }}>
      {/* Header */}
      <div style={{ background:"#1a1a2e", color:"#fff", padding:"20px 24px" }}>
        <div style={{ maxWidth:440, margin:"0 auto" }}>
          <div style={{ fontSize:10, letterSpacing:3, opacity:.4, marginBottom:4, textTransform:"uppercase" }}>UNR · Escrutinio Digital</div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-.5 }}>Elecciones Estudiantiles 2026</div>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 16px" }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 4px 24px #0002", padding:32 }}>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🗳️</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#1a1a2e", margin:"0 0 6px" }}>Acceso al sistema</h2>
              <p style={{ fontSize:13, color:"#aaa", margin:0 }}>Ingresá tu código de acceso</p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, fontWeight:700, color:"#666", display:"block", marginBottom:6 }}>
                  CÓDIGO DE ACCESO
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: FIS-A1B2C3"
                  autoComplete="off"
                  style={{
                    width:"100%", padding:"12px 14px", fontSize:16, fontWeight:700,
                    border:"2px solid #eee", borderRadius:10, outline:"none",
                    fontFamily:"monospace", letterSpacing:2, boxSizing:"border-box",
                    textTransform:"uppercase",
                  }}
                />
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:700, color:"#666", display:"block", marginBottom:6 }}>
                  TU NOMBRE <span style={{ color:"#bbb", fontWeight:400 }}>(fiscal: obligatorio)</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Nombre y apellido"
                  style={{
                    width:"100%", padding:"12px 14px", fontSize:15,
                    border:"2px solid #eee", borderRadius:10, outline:"none",
                    fontFamily:"inherit", boxSizing:"border-box",
                  }}
                />
              </div>

              {error && (
                <div style={{ background:"#fdecea", border:"1px solid #f5c6cb", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#c0392b", fontWeight:600 }}>
                  ❌ {error}
                </div>
              )}

              <button type="submit" disabled={loading || !codigo.trim()} style={{
                width:"100%", background:"#1a1a2e", color:"#fff", border:"none",
                borderRadius:12, padding:"14px", fontSize:15, fontWeight:800,
                cursor: loading||!codigo.trim() ? "not-allowed":"pointer",
                opacity: loading||!codigo.trim() ? 0.5:1, fontFamily:"inherit",
              }}>
                {loading ? "Verificando…" : "Ingresar →"}
              </button>
            </form>
          </div>

          {/* Solicitar acceso */}
          <div style={{
            background:"#fff", borderRadius:16, boxShadow:"0 2px 12px #0001",
            padding:"20px 24px", marginTop:16, textAlign:"center",
          }}>
            <p style={{ fontSize:13, color:"#888", margin:"0 0 12px" }}>
              ¿No tenés acceso? Solicitalo a:
            </p>
            <a
              href={WA_LINK}
              target="_blank" rel="noreferrer"
              style={{
                display:"inline-flex", alignItems:"center", gap:8,
                background:"#25D366", color:"#fff", textDecoration:"none",
                borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:700,
              }}
            >
              <span>💬</span> {WA_NOMBRE}
            </a>
            <p style={{ fontSize:11, color:"#ccc", margin:"12px 0 0" }}>
              WhatsApp · +54 341 602-5428
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:"#1a1a2e", color:"#fff", padding:"14px 24px", textAlign:"center" }}>
        <div style={{ fontSize:12, opacity:.4 }}>
          Desarrollado por <strong style={{ opacity:1 }}>{WA_NOMBRE}</strong>
        </div>
      </div>
    </div>
  );
}
