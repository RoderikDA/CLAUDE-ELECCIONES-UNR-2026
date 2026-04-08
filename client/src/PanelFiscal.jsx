import { useState } from "react";
import { Btn, Toast } from "./UI.jsx";
import { postResultados } from "./api.js";

// DIAS se genera dinámicamente desde fac.dias

export default function PanelFiscal({ user, facultades, consejeros, results, mesasCargadas, onSaved }) {
  const [step, setStep]             = useState("facultad");
  const [facultadId, setFacultadId] = useState(null);
  const [tipo, setTipo]             = useState(null);
  const [dia, setDia]               = useState(null);
  const [mesa, setMesa]             = useState(null);
  const [votos, setVotos]           = useState({});
  const [blancos, setBlancos]       = useState("");
  const [nulos, setNulos]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);

  const fac = facultades.find(f => f.id === facultadId);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function back() {
    if (step === "carga") { setStep("mesa"); setVotos({}); setBlancos(""); setNulos(""); }
    else if (step === "mesa") setStep("dia");
    else if (step === "dia") setStep("tipo");
    else if (step === "tipo") { setStep("facultad"); setFacultadId(null); }
  }

  function isMesaCargada(fid, t, d, m) {
    return mesasCargadas?.[fid]?.[t]?.some(x => x.dia === d && x.mesa === m) ?? false;
  }

  function pickMesa(m) {
    setMesa(m);
    const init = {};
    fac.listas.forEach(l => { init[l.id] = ""; });
    setVotos(init); setBlancos(""); setNulos("");
    setStep("carga");
  }

  async function confirmar() {
    setSaving(true);
    try {
      await postResultados(user.codigo, {
        facultad_id: facultadId,
        tipo, dia, mesa,
        listas: fac.listas.map(l => ({ id: l.id, nombre: l.nombre, votos: parseInt(votos[l.id]) || 0 })),
        blancos: parseInt(blancos) || 0,
        nulos:   parseInt(nulos)   || 0,
        usuario: user.nombre,
      });
      await onSaved();
      showToast(`✓ ${fac.nombre} · Día ${dia} · Mesa ${mesa} guardada`);
      setStep("mesa");
      setVotos({}); setBlancos(""); setNulos("");
    } catch (e) {
      showToast("❌ " + e.message, false);
    } finally {
      setSaving(false);
    }
  }

  const totalVotos = Object.values(votos).reduce((a, v) => a + (parseInt(v) || 0), 0)
    + (parseInt(blancos) || 0) + (parseInt(nulos) || 0);

  const numMesas = fac?.mesas_centro !== undefined
    ? (tipo === "centro" ? fac.mesas_centro : fac.mesas_consejo) ?? 0
    : 0;

  const BackBtn = () => (
    <button onClick={back} style={{ background:"none",border:"none",color:"#999",cursor:"pointer",fontSize:13,padding:"0 0 14px",fontFamily:"inherit" }}>
      ← Volver
    </button>
  );

  const Crumb = () => {
    const parts = [];
    if (fac)  parts.push(fac.nombre);
    if (tipo) parts.push(tipo === "centro" ? "CE" : "CD");
    if (dia)  parts.push(`Día ${dia}`);
    if (mesa) parts.push(`Mesa ${mesa}`);
    if (!parts.length) return null;
    return (
      <div style={{ fontSize:11, color:"#aaa", marginBottom:14, display:"flex", gap:5, flexWrap:"wrap" }}>
        {parts.map((p, i) => (
          <span key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
            {i > 0 && <span style={{ color:"#ddd" }}>›</span>}
            <span style={{ background:"#f1f2f6", padding:"2px 8px", borderRadius:5 }}>{p}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ maxWidth:480, margin:"0 auto" }}>
      {toast && <Toast {...toast} />}

      {step === "facultad" && (
        <>
          <h2 style={{ margin:"0 0 6px", fontSize:20, color:"#1a1a2e" }}>Seleccioná tu facultad</h2>
          <p style={{ color:"#999", fontSize:13, margin:"0 0 16px" }}>Hola <strong>{user.nombre}</strong> — elegí la facultad a escrutar</p>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {facultades.map(f => {
              const totalMesas = ((f.mesas_centro||0) + (f.mesas_consejo||0)) * 3;
              const cargadas   = (mesasCargadas?.[f.id]?.centro?.length||0) + (mesasCargadas?.[f.id]?.consejo?.length||0);
              return (
                <div key={f.id} onClick={() => { setFacultadId(f.id); setStep("tipo"); }}
                  style={{ background:"#fff", borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", border:"2px solid #eee", boxShadow:"0 1px 8px #0001" }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:"#1a1a2e" }}>{f.nombre}</div>
                    <div style={{ fontSize:11, color:"#aaa", marginTop:3 }}>
                      {f.listas.length} agrupaciones · {cargadas}/{totalMesas} mesas cargadas
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {cargadas > 0 && <span style={{ fontSize:11, background:"#16a08515", color:"#16a085", fontWeight:700, padding:"2px 8px", borderRadius:6 }}>{cargadas} ✓</span>}
                    <span style={{ fontSize:22, color:"#ddd" }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {step === "tipo" && fac && (
        <>
          <BackBtn /><Crumb />
          <h2 style={{ margin:"0 0 4px", fontSize:20, color:"#1a1a2e" }}>{fac.nombre}</h2>
          <p style={{ color:"#999", fontSize:13, margin:"0 0 22px" }}>¿Qué elección querés cargar?</p>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[
              { id:"centro",  label:"Centro de Estudiantes", icon:"🎓", color:"#2980b9", mesas: fac.mesas_centro||0, dias: fac.dias||3 },
              { id:"consejo", label:"Consejo Directivo",     icon:"⚖️", color:"#8e44ad", mesas: fac.mesas_consejo||0, dias: fac.dias||3 },
            ].map(op => {
              const cargadas = mesasCargadas?.[facultadId]?.[op.id]?.length || 0;
              const total    = op.mesas * 3;
              return (
                <div key={op.id} onClick={() => { setTipo(op.id); setStep("dia"); }}
                  style={{ background:"#fff", borderRadius:14, padding:"18px 20px", cursor:"pointer", border:`2px solid ${cargadas>0?op.color+"55":"#eee"}`, boxShadow:"0 1px 8px #0001", display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ fontSize:28 }}>{op.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:"#1a1a2e" }}>{op.label}</div>
                    <div style={{ fontSize:12, color:"#aaa", marginTop:3 }}>
                      {op.mesas} mesas · 3 días · {op.id==="consejo"?`D'Hondt ${consejeros} consejeros`:"Directa"}
                    </div>
                  </div>
                  {cargadas > 0 && <span style={{ fontSize:11, color:op.color, fontWeight:700, background:op.color+"15", padding:"3px 10px", borderRadius:6 }}>{cargadas}/{total}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {step === "dia" && fac && (
        <>
          <BackBtn /><Crumb />
          <h2 style={{ margin:"0 0 22px", fontSize:20, color:"#1a1a2e" }}>Seleccioná el día</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {Array.from({ length: fac.dias || 3 }, (_, i) => i + 1).map(d => {
              const mesasDelDia = mesasCargadas?.[facultadId]?.[tipo]?.filter(x => x.dia === d) ?? [];
              const total = tipo === "centro" ? (fac.mesas_centro||0) : (fac.mesas_consejo||0);
              return (
                <div key={d} onClick={() => { setDia(d); setStep("mesa"); }}
                  style={{ background:"#fff", borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", border:`2px solid ${mesasDelDia.length===total&&total>0?"#16a08544":"#eee"}`, boxShadow:"0 1px 8px #0001" }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:16, color:"#1a1a2e" }}>Día {d} — Jornada {d}</div>
                    <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{mesasDelDia.length}/{total} mesas cargadas</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {mesasDelDia.length === total && total > 0 && <span style={{ fontSize:16 }}>✅</span>}
                    <span style={{ fontSize:22, color:"#ddd" }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {step === "mesa" && fac && dia && (
        <>
          <BackBtn /><Crumb />
          <h2 style={{ margin:"0 0 6px", fontSize:20, color:"#1a1a2e" }}>Seleccioná la mesa</h2>
          <p style={{ color:"#999", fontSize:13, margin:"0 0 18px" }}>Día {dia} · {numMesas} mesas</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))", gap:10 }}>
            {Array.from({ length: numMesas }, (_, i) => i + 1).map(m => {
              const cargada = isMesaCargada(facultadId, tipo, dia, m);
              return (
                <div key={m} onClick={() => pickMesa(m)}
                  style={{ background: cargada?"#16a08510":"#fff", border:`2px solid ${cargada?"#16a08555":"#eee"}`, borderRadius:12, padding:"16px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", boxShadow:"0 1px 6px #0001" }}>
                  <div style={{ fontSize:20, fontWeight:800, color: cargada?"#16a085":"#1a1a2e" }}>{m}</div>
                  <div style={{ fontSize:10, color: cargada?"#16a085":"#ccc", fontWeight:700 }}>{cargada?"✓ Cargada":"Pendiente"}</div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize:11, color:"#aaa", textAlign:"center", marginTop:12 }}>Podés re-cargar una mesa para corregirla.</p>
        </>
      )}

      {step === "carga" && fac && (
        <>
          <BackBtn /><Crumb />
          <h2 style={{ margin:"0 0 2px", fontSize:18, color:"#1a1a2e" }}>{fac.nombre} · Día {dia} · Mesa {mesa}</h2>
          <div style={{ fontSize:13, color: tipo==="consejo"?"#8e44ad":"#2980b9", fontWeight:700, marginBottom:18 }}>
            {tipo==="centro"?"🎓 Centro de Estudiantes":"⚖️ Consejo Directivo"}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
            {fac.listas.map(l => (
              <div key={l.id}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:l.color }}/>
                  <label style={{ fontWeight:600, fontSize:14, color:"#1a1a2e" }}>{l.nombre}</label>
                </div>
                <input type="number" min="0" value={votos[l.id]}
                  onChange={e => setVotos({ ...votos, [l.id]: e.target.value })}
                  placeholder="0"
                  style={{ width:"100%", padding:"10px 14px", fontSize:22, fontWeight:800, border:`2px solid ${l.color}55`, borderRadius:10, outline:"none", fontFamily:"inherit", color:l.color, boxSizing:"border-box", background:l.color+"08" }}
                />
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            {[
              { label:"Votos en blanco", value:blancos, set:setBlancos, color:"#7f8c8d" },
              { label:"Votos nulos",     value:nulos,   set:setNulos,   color:"#e74c3c" },
            ].map(({ label, value, set, color }) => (
              <div key={label}>
                <div style={{ fontSize:12, fontWeight:600, color:"#888", marginBottom:5 }}>{label}</div>
                <input type="number" min="0" value={value} onChange={e => set(e.target.value)} placeholder="0"
                  style={{ width:"100%", padding:"10px 12px", fontSize:20, fontWeight:800, border:`2px solid ${color}44`, borderRadius:10, outline:"none", fontFamily:"inherit", color, boxSizing:"border-box", background:color+"08" }}
                />
              </div>
            ))}
          </div>
          <div style={{ background:"#f8f9fa", borderRadius:10, padding:"11px 16px", marginBottom:16, display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:"#888", fontSize:13 }}>Total votos mesa</span>
            <span style={{ fontWeight:800, fontSize:18, color:"#1a1a2e" }}>{totalVotos.toLocaleString()}</span>
          </div>
          <Btn onClick={confirmar} variant="success" disabled={saving || totalVotos === 0} style={{ width:"100%" }}>
            {saving ? "Guardando…" : `Confirmar Mesa ${mesa}`}
          </Btn>
        </>
      )}
    </div>
  );
}
