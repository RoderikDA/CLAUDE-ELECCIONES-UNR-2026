import { useState } from "react";
import { Btn, Toast } from "./UI.jsx";
import { postResultados } from "./api.js";

const DIAS = [
  { id: 1, label: "Día 1", fecha: "Jornada 1" },
  { id: 2, label: "Día 2", fecha: "Jornada 2" },
  { id: 3, label: "Día 3", fecha: "Jornada 3" },
];

export default function PanelFiscal({ config, results, mesasCargadas, onSaved }) {
  const [step, setStep]           = useState("facultad"); // facultad|tipo|dia|mesa|carga
  const [facultadId, setFacultadId] = useState(null);
  const [tipo, setTipo]           = useState(null);
  const [dia, setDia]             = useState(null);
  const [mesa, setMesa]           = useState(null);
  const [votos, setVotos]         = useState({});
  const [blancos, setBlancos]     = useState("");
  const [nulos, setNulos]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);

  const fac = config.facultades.find(f => f.id === facultadId);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function reset() {
    setStep("facultad"); setFacultadId(null); setTipo(null);
    setDia(null); setMesa(null); setVotos({}); setBlancos(""); setNulos("");
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

  function countMesasCargadas(fid, t) {
    return mesasCargadas?.[fid]?.[t]?.length ?? 0;
  }

  function pickMesa(m) {
    setMesa(m);
    const f = config.facultades.find(f => f.id === facultadId);
    const init = {};
    f.listas.forEach(l => { init[l.id] = ""; });
    setVotos(init); setBlancos(""); setNulos("");
    setStep("carga");
  }

  async function confirmar() {
    setSaving(true);
    try {
      await postResultados({
        facultad_id: facultadId,
        facultad: fac.nombre,
        tipo, dia, mesa,
        listas: fac.listas.map(l => ({ id: l.id, nombre: l.nombre, votos: parseInt(votos[l.id]) || 0 })),
        blancos: parseInt(blancos) || 0,
        nulos: parseInt(nulos) || 0,
      });
      await onSaved();
      showToast(`✓ ${fac.nombre} · ${tipo === "centro" ? "CE" : "CD"} · Día ${dia} Mesa ${mesa} guardada`);
      // Volver a selección de mesa para cargar la siguiente
      setStep("mesa");
      setVotos({}); setBlancos(""); setNulos("");
    } catch (e) {
      showToast("❌ Error al guardar. Revisá la conexión.", false);
    } finally {
      setSaving(false);
    }
  }

  const totalVotos = Object.values(votos).reduce((a, v) => a + (parseInt(v) || 0), 0)
    + (parseInt(blancos) || 0) + (parseInt(nulos) || 0);

  const numMesas = fac?.mesas?.[tipo] ?? 0;

  // Botón volver compartido
  const BackBtn = () => (
    <button onClick={back} style={{
      background: "none", border: "none", color: "#999", cursor: "pointer",
      fontSize: 13, padding: "0 0 16px", fontFamily: "inherit",
    }}>← Volver</button>
  );

  // Breadcrumb
  const Crumb = () => {
    const parts = [];
    if (fac) parts.push(fac.nombre);
    if (tipo) parts.push(tipo === "centro" ? "CE" : "CD");
    if (dia) parts.push(`Día ${dia}`);
    if (mesa) parts.push(`Mesa ${mesa}`);
    if (parts.length === 0) return null;
    return (
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {parts.map((p, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && <span style={{ color: "#ddd" }}>›</span>}
            <span style={{ background: "#f1f2f6", padding: "2px 8px", borderRadius: 5 }}>{p}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      {toast && <Toast {...toast} />}

      {/* STEP 1: Facultad */}
      {step === "facultad" && (
        <>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "#1a1a2e" }}>Seleccioná tu facultad</h2>
          <p style={{ color: "#999", fontSize: 13, margin: "0 0 18px" }}>UNR · Elecciones Estudiantiles 2025</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {config.facultades.map(f => {
              const totalMesas = (f.mesas?.centro ?? 0) * 3 + (f.mesas?.consejo ?? 0) * 3;
              const cargadas   = countMesasCargadas(f.id, "centro") + countMesasCargadas(f.id, "consejo");
              return (
                <div key={f.id} onClick={() => { setFacultadId(f.id); setStep("tipo"); }}
                  style={{
                    background: "#fff", borderRadius: 14, padding: "14px 18px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", border: "2px solid #eee", boxShadow: "0 1px 8px #0001",
                  }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{f.nombre}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
                      {f.listas.length} agrupaciones · {cargadas}/{totalMesas} mesas cargadas
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {cargadas > 0 && (
                      <span style={{ fontSize: 11, background: "#16a08515", color: "#16a085", fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                        {cargadas} ✓
                      </span>
                    )}
                    <span style={{ fontSize: 22, color: "#ddd" }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* STEP 2: Tipo */}
      {step === "tipo" && fac && (
        <>
          <BackBtn />
          <Crumb />
          <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#1a1a2e" }}>{fac.nombre}</h2>
          <p style={{ color: "#999", fontSize: 13, margin: "0 0 22px" }}>¿Qué elección querés cargar?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { id: "centro",  label: "Centro de Estudiantes", icon: "🎓", color: "#2980b9", mesas: fac.mesas?.centro ?? 0 },
              { id: "consejo", label: "Consejo Directivo",     icon: "⚖️", color: "#8e44ad", mesas: fac.mesas?.consejo ?? 0 },
            ].map(op => {
              const cargadas = countMesasCargadas(facultadId, op.id);
              const total    = op.mesas * 3;
              return (
                <div key={op.id} onClick={() => { setTipo(op.id); setStep("dia"); }}
                  style={{
                    background: "#fff", borderRadius: 14, padding: "18px 20px",
                    cursor: "pointer", border: `2px solid ${cargadas > 0 ? op.color + "55" : "#eee"}`,
                    boxShadow: "0 1px 8px #0001", display: "flex", alignItems: "center", gap: 16,
                  }}>
                  <div style={{ fontSize: 28 }}>{op.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{op.label}</div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>
                      {op.mesas} mesas · 3 días · D{op.id === "consejo" ? `'Hondt ${config.bancas} bancas` : "irecta"}
                    </div>
                  </div>
                  {cargadas > 0 && (
                    <span style={{ fontSize: 11, color: op.color, fontWeight: 700, background: op.color + "15", padding: "3px 10px", borderRadius: 6 }}>
                      {cargadas}/{total}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* STEP 3: Día */}
      {step === "dia" && fac && (
        <>
          <BackBtn />
          <Crumb />
          <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#1a1a2e" }}>Seleccioná el día</h2>
          <p style={{ color: "#999", fontSize: 13, margin: "0 0 22px" }}>
            {tipo === "centro" ? "🎓 Centro de Estudiantes" : "⚖️ Consejo Directivo"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {DIAS.map(d => {
              const mesasDelDia = mesasCargadas?.[facultadId]?.[tipo]?.filter(x => x.dia === d.id) ?? [];
              const numMesasFac = fac.mesas?.[tipo] ?? 0;
              const completo    = mesasDelDia.length === numMesasFac;
              return (
                <div key={d.id} onClick={() => { setDia(d.id); setStep("mesa"); }}
                  style={{
                    background: "#fff", borderRadius: 14, padding: "16px 20px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", border: `2px solid ${completo ? "#16a08544" : "#eee"}`,
                    boxShadow: "0 1px 8px #0001",
                  }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
                      {mesasDelDia.length}/{numMesasFac} mesas cargadas
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {completo && <span style={{ fontSize: 16 }}>✅</span>}
                    <span style={{ fontSize: 22, color: "#ddd" }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* STEP 4: Mesa */}
      {step === "mesa" && fac && dia && (
        <>
          <BackBtn />
          <Crumb />
          <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#1a1a2e" }}>Seleccioná la mesa</h2>
          <p style={{ color: "#999", fontSize: 13, margin: "0 0 22px" }}>Día {dia} · {numMesas} mesas en total</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
            {Array.from({ length: numMesas }, (_, i) => i + 1).map(m => {
              const cargada = isMesaCargada(facultadId, tipo, dia, m);
              return (
                <div key={m} onClick={() => pickMesa(m)}
                  style={{
                    background: cargada ? "#16a08510" : "#fff",
                    border: `2px solid ${cargada ? "#16a08555" : "#eee"}`,
                    borderRadius: 12, padding: "16px 8px",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    cursor: "pointer", boxShadow: "0 1px 6px #0001",
                  }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: cargada ? "#16a085" : "#1a1a2e" }}>
                    {m}
                  </div>
                  <div style={{ fontSize: 10, color: cargada ? "#16a085" : "#ccc", fontWeight: 700 }}>
                    {cargada ? "Cargada ✓" : "Pendiente"}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: "#aaa", textAlign: "center" }}>
            Podés re-cargar una mesa ya enviada para corregirla.
          </div>
        </>
      )}

      {/* STEP 5: Carga de votos */}
      {step === "carga" && fac && (
        <>
          <BackBtn />
          <Crumb />
          <h2 style={{ margin: "0 0 2px", fontSize: 18, color: "#1a1a2e" }}>
            {fac.nombre} · Día {dia} · Mesa {mesa}
          </h2>
          <div style={{ fontSize: 13, color: tipo === "consejo" ? "#8e44ad" : "#2980b9", fontWeight: 700, marginBottom: 20 }}>
            {tipo === "centro" ? "🎓 Centro de Estudiantes" : `⚖️ Consejo Directivo`}
          </div>

          {/* Votos por agrupación */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
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
                    width: "100%", padding: "10px 14px", fontSize: 22, fontWeight: 800,
                    border: `2px solid ${l.color}55`, borderRadius: 10, outline: "none",
                    fontFamily: "inherit", color: l.color, boxSizing: "border-box", background: l.color + "08",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Blancos y Nulos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Votos en blanco", value: blancos, set: setBlancos, color: "#7f8c8d" },
              { label: "Votos nulos",     value: nulos,   set: setNulos,   color: "#e74c3c" },
            ].map(({ label, value, set, color }) => (
              <div key={label}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 5 }}>{label}</div>
                <input
                  type="number" min="0" value={value}
                  onChange={e => set(e.target.value)}
                  placeholder="0"
                  style={{
                    width: "100%", padding: "10px 12px", fontSize: 20, fontWeight: 800,
                    border: `2px solid ${color}44`, borderRadius: 10, outline: "none",
                    fontFamily: "inherit", color, boxSizing: "border-box", background: color + "08",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{
            background: "#f8f9fa", borderRadius: 10, padding: "11px 16px",
            marginBottom: 16, display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ color: "#888", fontSize: 13 }}>Total votos mesa</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e" }}>{totalVotos.toLocaleString()}</span>
          </div>

          <Btn onClick={confirmar} variant="success" disabled={saving || totalVotos === 0} style={{ width: "100%" }}>
            {saving ? "Guardando…" : `Confirmar Mesa ${mesa}`}
          </Btn>
        </>
      )}
    </div>
  );
}
