import { useState, useEffect, useCallback } from "react";
import { UNR_CONFIG } from "./config.js";
import { getResultados, getLog, deleteResultados } from "./api.js";
import PanelFiscal     from "./PanelFiscal.jsx";
import PanelResultados from "./PanelResultados.jsx";
import PanelLog        from "./PanelLog.jsx";

const TABS = [
  { id: "fiscal",     icon: "📥", label: "Cargar"    },
  { id: "resultados", icon: "📊", label: "Resultados"},
  { id: "log",        icon: "🕑", label: "Historial" },
  { id: "admin",      icon: "⚙️", label: "Admin"     },
];

export default function App() {
  const [tab,     setTab]     = useState("fiscal");
  const [results, setResults] = useState({});
  const [log,     setLog]     = useState([]);
  const [ready,   setReady]   = useState(false);
  const [error,   setError]   = useState(null);

  const config = UNR_CONFIG;

  const fetchData = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([getResultados(), getLog()]);
      setResults(r);
      setLog(l);
      setError(null);
    } catch (e) {
      setError("No se pudo conectar al servidor.");
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setReady(true));
    // Refrescar cada 30 segundos automáticamente
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleSaved() { await fetchData(); }

  if (!ready) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa", fontFamily: "inherit", color: "#aaa", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 28 }}>🗳️</div>
      <div>Cargando…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#1a1a2e", color: "#fff", padding: "16px 22px 14px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, opacity: .4, marginBottom: 3, textTransform: "uppercase" }}>UNR · Escrutinio Digital</div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.5 }}>Elecciones Estudiantiles 2025</div>
          </div>
          <button onClick={fetchData} style={{ background: "none", border: "1px solid #ffffff30", color: "#fff", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fdecea", borderBottom: "1px solid #f5c6cb", padding: "10px 22px", fontSize: 13, color: "#c0392b", textAlign: "center" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "1.5px solid #eee", display: "flex" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px 4px", border: "none",
            borderBottom: tab === t.id ? "3px solid #1a1a2e" : "3px solid transparent",
            background: "none", fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? "#1a1a2e" : "#bbb",
            cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
            <span style={{ fontSize: 17 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "22px 14px 36px" }}>
        {tab === "fiscal"     && <PanelFiscal config={config} results={results} onSaved={handleSaved} />}
        {tab === "resultados" && <PanelResultados config={config} results={results} />}
        {tab === "log"        && <PanelLog log={log} />}
        {tab === "admin"      && <PanelAdmin onReset={async (clave) => { await deleteResultados(clave); await fetchData(); }} />}
      </div>
    </div>
  );
}

// ── Panel Admin ───────────────────────────────────────────────────
function PanelAdmin({ onReset }) {
  const [clave,   setClave]   = useState("");
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);

  async function handleReset() {
    if (!clave) return;
    setLoading(true);
    try {
      await onReset(clave);
      setMsg({ text: "✓ Resultados borrados correctamente", ok: true });
      setClave("");
    } catch {
      setMsg({ text: "❌ Clave incorrecta o error del servidor", ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <div style={{ background: "#fff8e1", border: "1.5px solid #ffe082", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#7a5c00" }}>
        ⚠️ Esta sección es solo para administradores. Usá la clave definida en el servidor.
      </div>

      <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px #0001" }}>
        <h3 style={{ margin: "0 0 16px", color: "#1a1a2e" }}>Borrar todos los resultados</h3>
        <input
          type="password" placeholder="Clave de administrador"
          value={clave} onChange={e => setClave(e.target.value)}
          style={{ width: "100%", padding: "11px 14px", border: "2px solid #eee", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
        />
        {msg && (
          <div style={{ marginBottom: 12, fontSize: 13, color: msg.ok ? "#16a085" : "#e74c3c", fontWeight: 700 }}>{msg.text}</div>
        )}
        <button onClick={handleReset} disabled={loading || !clave} style={{
          width: "100%", background: "#e74c3c", color: "#fff", border: "none", borderRadius: 10,
          padding: "12px", fontSize: 14, fontWeight: 700, cursor: loading || !clave ? "not-allowed" : "pointer",
          opacity: loading || !clave ? 0.5 : 1, fontFamily: "inherit",
        }}>
          {loading ? "Borrando…" : "🗑 Confirmar borrado"}
        </button>
      </div>
    </div>
  );
}
