import { useState } from "react";
import { Btn, Toast } from "./UI.jsx";
import { postResultados } from "./api.js";

export default function PanelFiscal({ config, results, onSaved }) {
  const [step,      setStep]      = useState("facultad");
  const [facultadId,setFacultadId]= useState(null);
  const [tipo,      setTipo]      = useState(null);
  const [votos,     setVotos]     = useState({});
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  const fac = config.facultades.find(f => f.id === facultadId);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function pickFacultad(id) { setFacultadId(id); setStep("tipo"); }

  function pickTipo(t) {
    const f = config.facultades.find(f => f.id === facultadId);
    const init = {};
    f.listas.forEach(l => { init[l.id] = results?.[facultadId]?.[t]?.[l.id] ?? ""; });
    setVotos(init);
    setTipo(t);
    setStep("carga");
  }

  function back() {
    if (step === "carga") { setStep("tipo"); setVotos({}); }
    else if (step === "tipo") { setStep("facultad"); setFacultadId(null); }
  }

  async function confirmar() {
    setSaving(true);
    try {
      await postResultados({
        facultad_id: facultadId,
        facultad: fac.nombre,
        tipo,
        listas: fac.listas.map(l => ({
          id: l.id,
          nombre: l.nombre,
          votos: parseInt(votos[l.id]) || 0,
        })),
      });
      await onSaved();
      showToast(`✓ ${fac.nombre} — ${tipo === "centro" ? "Centro" : "Consejo"} guardado`);
      setStep("facultad"); setFacultadId(null); setTipo(null);
    } catch (e) {
      showToast("❌ Error al guardar. Revisá la conexión.", false);
    } finally {
      setSaving(false);
    }
  }

  const totalVotos = Object.values(votos).reduce((a, v) => a + (parseInt(v) || 0), 0);
  const yaEnviado  = (fid, t) => {
    const d = results?.[fid]?.[t];
    return d && Object.values(d).some(v => v > 0);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      {toast && <Toast {...toast} />}

      {/* STEP 1 — elegir facultad */}
      {step === "facultad" && (
        <>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "#1a1a2e" }}>Seleccioná tu facultad</h2>
          <p style={{ color: "#999", fontSize: 13, margin: "0 0 18px" }}>UNR · Elecciones Estudiantiles 2025</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {config.facultades.map(f => (
              <div key={f.id} onClick={() => pickFacultad(f.id)} style={{
                background: "#fff", borderRadius: 14, padding: "14px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer", border: "2px solid #eee", boxShadow: "0 1px 8px #0001",
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{f.nombre}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 3, display: "flex", gap: 8 }}>
                    <span>{f.listas.length} agrupaciones</span>
                    {["centro", "consejo"].map(t => (
                      <span key={t} style={{ color: yaEnviado(f.id, t) ? "#16a085" : "#ddd", fontWeight: 700 }}>
                        {t === "centro" ? "CE" : "CD"}{yaEnviado(f.id, t) ? " ✓" : ""}
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 22, color: "#ddd" }}>›</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* STEP 2 — elegir tipo */}
      {step === "tipo" && fac && (
        <>
          <button onClick={back} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 13, padding: "0 0 16px", fontFamily: "inherit" }}>← Volver</button>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#1a1a2e" }}>{fac.nombre}</h2>
          <p style={{ color: "#999", fontSize: 13, margin: "0 0 22px" }}>¿Qué elección querés cargar?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { id: "centro",  label: "Centro de Estudiantes", desc: `${fac.mesas?.centro ?? "-"} mesas · gana la lista más votada`, icon: "🎓", color: "#2980b9" },
              { id: "consejo", label: "Consejo Directivo",     desc: `${fac.mesas?.consejo ?? "-"} mesas · D'Hondt ${config.bancas} bancas`, icon: "⚖️", color: "#8e44ad" },
            ].map(op => (
              <div key={op.id} onClick={() => pickTipo(op.id)} style={{
                background: "#fff", borderRadius: 14, padding: "18px 20px",
                cursor: "pointer", border: `2px solid ${yaEnviado(facultadId, op.id) ? op.color + "55" : "#eee"}`,
                boxShadow: "0 1px 8px #0001", display: "flex", alignItems: "center", gap: 16,
              }}>
                <div style={{ fontSize: 28 }}>{op.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{op.label}</div>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>{op.desc}</div>
                </div>
                {yaEnviado(facultadId, op.id) && (
                  <span style={{ fontSize: 11, color: op.color, fontWeight: 700, background: op.color + "15", padding: "3px 10px", borderRadius: 6 }}>Enviada</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* STEP 3 — cargar votos */}
      {step === "carga" && fac && (
        <>
          <button onClick={back} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 13, padding: "0 0 14px", fontFamily: "inherit" }}>← Volver</button>
          <h2 style={{ margin: "0 0 2px", fontSize: 19, color: "#1a1a2e" }}>{fac.nombre}</h2>
          <div style={{ fontSize: 13, color: tipo === "consejo" ? "#8e44ad" : "#2980b9", fontWeight: 700, marginBottom: 18 }}>
            {tipo === "centro" ? "🎓 Centro de Estudiantes" : `⚖️ Consejo Directivo — D'Hondt ${config.bancas} bancas`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            {fac.listas.map(l => (
              <div key={l.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }} />
                  <label style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{l.nombre}</label>
                </div>
                <input
                  type="number" min="0"
                  value={votos[l.id]}
                  onChange={e => setVotos({ ...votos, [l.id]: e.target.value })}
                  placeholder="0"
                  style={{
                    width: "100%", padding: "11px 14px", fontSize: 22, fontWeight: 800,
                    border: `2px solid ${l.color}55`, borderRadius: 10, outline: "none",
                    fontFamily: "inherit", color: l.color, boxSizing: "border-box", background: l.color + "08",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "11px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#888", fontSize: 13 }}>Total ingresado</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e" }}>{totalVotos.toLocaleString()}</span>
          </div>
          <Btn onClick={confirmar} variant="success" disabled={saving || totalVotos === 0} style={{ width: "100%" }}>
            {saving ? "Guardando…" : "Confirmar resultados"}
          </Btn>
        </>
      )}
    </div>
  );
}
