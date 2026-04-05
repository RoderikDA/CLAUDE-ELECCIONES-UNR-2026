import { useState, useEffect, useCallback } from "react";
import Login          from "./Login.jsx";
import PanelFiscal    from "./PanelFiscal.jsx";
import PanelResultados from "./PanelResultados.jsx";
import PanelAdmin     from "./PanelAdmin.jsx";
import PanelLog       from "./PanelLog.jsx";
import PanelAnalisis   from "./PanelAnalisis.jsx";
import { Header, Footer } from "./UI.jsx";
import { getFacultades, getResultados, getLog, exportURL as getExportURL, getVotosPorDia } from "./api.js";

// Tabs por rol
const TABS_BY_ROL = {
  admin:   [
    { id:"resultados", icon:"📊", label:"Resultados" },
    { id:"analisis",   icon:"🔍", label:"Análisis"   },
    { id:"fiscal",     icon:"📥", label:"Cargar"     },
    { id:"log",        icon:"🕑", label:"Historial"  },
    { id:"admin",      icon:"⚙️", label:"Admin"      },
  ],
  fiscal:  [
    { id:"fiscal",     icon:"📥", label:"Cargar"     },
    { id:"resultados", icon:"📊", label:"Resultados" },
    { id:"log",        icon:"🕑", label:"Historial"  },
  ],
  publico: [
    { id:"resultados", icon:"📊", label:"Resultados" },
    { id:"analisis",   icon:"🔍", label:"Análisis"   },
  ],
};

export default function App() {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("unr_user")); } catch { return null; }
  });
  const [tab,     setTab]     = useState("resultados");
  const [facultades, setFacultades] = useState([]);
  const [bancas,  setBancas]  = useState(8);
  const [results, setResults] = useState({});
  const [mesasCargadas, setMesasCargadas] = useState({});
  const [log,     setLog]     = useState([]);
  const [ready,   setReady]   = useState(false);
  const [votosPorDia,   setVotosPorDia]   = useState({});
  const [error,   setError]   = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  function handleLogin(u) {
    sessionStorage.setItem("unr_user", JSON.stringify(u));
    setUser(u);
    setTab(u.rol === "admin" ? "resultados" : u.rol === "fiscal" ? "fiscal" : "resultados");
  }

  function handleLogout() {
    sessionStorage.removeItem("unr_user");
    setUser(null);
    setReady(false);
  }

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data, mesasCargadas: mc }, l, vpd] = await Promise.all([getResultados(user.codigo), getLog(user.codigo), getVotosPorDia(user.codigo)]);
      setVotosPorDia(vpd || {});
      setFacultades(facData.facultades || []);
      setBancas(parseInt(facData.config?.bancas_dhondt) || 8);
      setResults(resData.data || {});
      setMesasCargadas(resData.mesasCargadas || {});
      setLog(logData || []);
      setError(null);
      setLastUpdate(new Date());
    } catch (e) {
      setError("Error de conexión con el servidor.");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchAll().finally(() => setReady(true));
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, [fetchAll, user]);

  if (!user) return <Login onLogin={handleLogin} />;

  if (!ready) return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#f8f9fa", fontFamily:"'Segoe UI',sans-serif", color:"#aaa", gap:12 }}>
      <div style={{ fontSize:36 }}>🗳️</div>
      <div>Cargando…</div>
    </div>
  );

  const tabs = TABS_BY_ROL[user.rol] || [];
  const exportUrl = getExportURL(user.codigo);

  return (
    <div style={{ minHeight:"100vh", background:"#f8f9fa", fontFamily:"'Segoe UI',sans-serif", display:"flex", flexDirection:"column" }}>
      <Header user={user} onLogout={handleLogout} />

      {error && (
        <div style={{ background:"#fdecea", borderBottom:"1px solid #f5c6cb", padding:"9px 22px", fontSize:13, color:"#c0392b", textAlign:"center" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 1 && (
        <div style={{ background:"#fff", borderBottom:"1.5px solid #eee", display:"flex" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:"12px 4px", border:"none",
              borderBottom: tab===t.id?"3px solid #1a1a2e":"3px solid transparent",
              background:"none", fontWeight: tab===t.id?700:500,
              color: tab===t.id?"#1a1a2e":"#bbb",
              cursor:"pointer", fontSize:11, fontFamily:"inherit",
              display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            }}>
              <span style={{ fontSize:17 }}>{t.icon}</span>{t.label}
            </button>
          ))}
          <div style={{ display:"flex", alignItems:"center", paddingRight:12 }}>
            <button onClick={fetchAll} style={{ background:"none", border:"1px solid #eee", color:"#aaa", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
              ↻{lastUpdate ? ` ${lastUpdate.toLocaleTimeString("es-AR",{timeStyle:"short"})}` : ""}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, padding:"22px 14px 36px" }}>
        {tab === "fiscal"     && <PanelFiscal user={user} facultades={facultades} bancas={bancas} results={results} mesasCargadas={mesasCargadas} onSaved={fetchAll} />}
        {tab === "resultados" && <PanelResultados user={user} facultades={facultades} bancas={bancas} results={results} mesasCargadas={mesasCargadas} exportURL={exportUrl} />}
        {tab === "log"        && <PanelLog log={log} />}
        {tab === "analisis"   && <PanelAnalisis user={user} facultades={facultades} results={results} mesasCargadas={mesasCargadas} consejeros={bancas} votosPorDia={votosPorDia} />}
        {tab === "admin"      && <PanelAdmin user={user} facultadesIniciales={facultades} bancasIniciales={bancas} exportURL={exportUrl} onConfigSaved={fetchAll} />}
      </div>

      <Footer />
    </div>
  );
}
