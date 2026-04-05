import { useState } from "react";
import { Card, TabToggle } from "./UI.jsx";
import { dhondt } from "./dhondt.js";

// ── A quién le sacaría el consejero ──────────────────────────────
function calcularImpacto(listas, consejeros, indexObjetivo) {
  // Simulamos dar votosNecesarios a la lista objetivo y recalculamos
  const listasHipoteticas = listas.map((l, i) => ({
    ...l,
    votos: i === indexObjetivo ? l.votos + 1000 : l.votos, // votos suficientes
  }));
  const seatsHipoteticos = dhondt(listasHipoteticas, consejeros);
  const seatsActuales    = dhondt(listas, consejeros);

  // Quién pierde consejero
  for (let i = 0; i < listas.length; i++) {
    if (i !== indexObjetivo && seatsHipoteticos[i] < seatsActuales[i]) {
      return listas[i].nombre;
    }
  }
  return null;
}

// ── Votos para el próximo consejero + a quién le saca ────────────
function calcularDistancias(listas, consejeros) {
  const seats = dhondt(listas, consejeros);

  return listas.map((l, i) => {
    const cocientesOtros = listas.map((ll, j) =>
      i === j ? -1 : ll.votos / (seats[j] + 1)
    );
    const maxOtro = Math.max(...cocientesOtros);
    const votosNecesarios = Math.ceil(maxOtro * (seats[i] + 1)) + 1;
    const faltan = Math.max(0, votosNecesarios - l.votos);

    // A quién le sacaría el consejero
    const victima = faltan === 0 ? null : calcularImpacto(listas, consejeros, i);

    return {
      nombre: l.nombre,
      color:  l.color,
      votos:  l.votos,
      consejeros: seats[i],
      faltan,
      victima,
    };
  }).sort((a, b) => {
    // Primero los que faltan votos (de menor a mayor), luego los que ya lo tienen
    if (a.faltan === 0 && b.faltan === 0) return 0;
    if (a.faltan === 0) return 1;
    if (b.faltan === 0) return -1;
    return a.faltan - b.faltan;
  });
}

// ── Dona SVG ──────────────────────────────────────────────────────
function DonaChart({ listas, total }) {
  if (total === 0) return (
    <div style={{ textAlign:"center", color:"#ccc", padding:20, fontSize:13 }}>Sin datos</div>
  );

  const size = 180, cx = 90, cy = 90, r = 70, innerR = 45;
  let startAngle = -Math.PI / 2;

  const slices = listas.filter(l => l.votos > 0).map(l => {
    const angle = (l.votos / total) * 2 * Math.PI;
    const s = { ...l, startAngle, angle };
    startAngle += angle;
    return s;
  });

  function pt(angle, radius) {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  function arc(start, angle, ro, ri) {
    const end = start + angle;
    const p1 = pt(start, ro), p2 = pt(end, ro);
    const p3 = pt(end, ri),   p4 = pt(start, ri);
    const lg = angle > Math.PI ? 1 : 0;
    return `M${p1.x} ${p1.y} A${ro} ${ro} 0 ${lg} 1 ${p2.x} ${p2.y} L${p3.x} ${p3.y} A${ri} ${ri} 0 ${lg} 0 ${p4.x} ${p4.y}Z`;
  }

  return (
    <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
      <svg width={size} height={size}>
        {slices.map((s, i) => (
          <path key={i} d={arc(s.startAngle, s.angle, r, innerR)}
            fill={s.color} opacity={0.9} stroke="#fff" strokeWidth={1.5}
          />
        ))}
        <text x={cx} y={cy-6}  textAnchor="middle" fontSize="12" fill="#888">Total</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1a1a2e">
          {total.toLocaleString()}
        </text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {[...listas].sort((a,b)=>b.votos-a.votos).filter(l=>l.votos>0).map(l => (
          <div key={l.nombre} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:l.color, flexShrink:0 }} />
            <span style={{ fontSize:12, color:"#555" }}>{l.nombre}</span>
            <span style={{ fontSize:12, fontWeight:700, color:l.color, marginLeft:"auto" }}>
              {(l.votos/total*100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── D'Hondt por facultad ──────────────────────────────────────────
function DHondtFacultad({ facultad, results, consejeros }) {
  const listas = facultad.listas
    .map(l => ({ ...l, votos: results?.[facultad.id]?.consejo?.[l.id]?.votos || 0 }))
    .sort((a, b) => b.votos - a.votos);

  const total = listas.reduce((a, l) => a + l.votos, 0);
  if (total === 0) return null;

  const seats    = dhondt(listas, consejeros);
  const analisis = calcularDistancias(listas, consejeros);
  const conVotos = analisis.filter(a => a.votos > 0);

  return (
    <Card style={{ marginBottom:14 }}>
      <h3 style={{ margin:"0 0 14px", fontSize:16, color:"#1a1a2e" }}>{facultad.nombre}</h3>

      {/* Consejeros actuales */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:"#aaa", marginBottom:8, fontWeight:600, letterSpacing:1 }}>
          CONSEJEROS ACTUALES
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {listas.map((l, i) => seats[i] > 0 && (
            <div key={l.id} style={{
              background: l.color+"18", border:`1.5px solid ${l.color}44`,
              borderRadius:10, padding:"8px 16px", textAlign:"center", minWidth:90,
            }}>
              <div style={{ fontSize:12, fontWeight:700, color:l.color }}>{l.nombre}</div>
              <div style={{ fontSize:24, fontWeight:800, color:l.color }}>{seats[i]}</div>
              <div style={{ fontSize:10, color:"#aaa" }}>consejero{seats[i]!==1?"s":""}</div>
            </div>
          ))}
          {seats.every(s => s === 0) && (
            <div style={{ color:"#ccc", fontSize:13 }}>Sin consejeros todavía</div>
          )}
        </div>
      </div>

      {/* Distancia al próximo */}
      {conVotos.length > 0 && (
        <div style={{ background:"#f8f9fa", borderRadius:12, padding:14 }}>
          <div style={{ fontSize:11, color:"#aaa", marginBottom:12, fontWeight:600, letterSpacing:1 }}>
            📊 DISTANCIA AL PRÓXIMO CONSEJERO
          </div>

          {conVotos.map((a, i) => (
            <div key={a.nombre} style={{
              padding:"10px 0",
              borderBottom: i < conVotos.length-1 ? "1px solid #eee" : "none",
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:a.color }} />
                  <span style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{a.nombre}</span>
                  <span style={{
                    fontSize:10, background:a.color+"15", color:a.color,
                    padding:"1px 7px", borderRadius:5, fontWeight:700,
                  }}>
                    {a.consejeros} cons.
                  </span>
                </div>
                <div style={{ textAlign:"right" }}>
                  {a.faltan === 0 ? (
                    <span style={{ fontSize:12, color:"#16a085", fontWeight:700 }}>✓ Ya lo tiene</span>
                  ) : (
                    <span style={{
                      fontSize:13, fontWeight:800,
                      color: i===0?"#e74c3c":i===1?"#e67e22":"#888",
                    }}>
                      faltan {a.faltan.toLocaleString()} votos
                    </span>
                  )}
                </div>
              </div>

              {/* A quién le sacaría */}
              {a.faltan > 0 && a.victima && (
                <div style={{
                  marginTop:6, marginLeft:16,
                  fontSize:11, color:"#888",
                  display:"flex", alignItems:"center", gap:4,
                }}>
                  <span>↳ le sacaría 1 consejero a</span>
                  <span style={{
                    fontWeight:700, color:"#e74c3c",
                    background:"#e74c3c12", padding:"1px 7px", borderRadius:5,
                  }}>
                    {a.victima}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Destacado: el más cercano */}
          {conVotos[0]?.faltan > 0 && (
            <div style={{
              marginTop:14, background:"#e74c3c10",
              border:"1px solid #e74c3c33", borderRadius:10,
              padding:"12px 14px",
            }}>
              <div style={{ fontSize:13, color:"#1a1a2e" }}>
                🎯 <strong style={{ color:"#e74c3c" }}>{conVotos[0].nombre}</strong>
                {" "}está a{" "}
                <strong style={{ color:"#e74c3c" }}>{conVotos[0].faltan.toLocaleString()} votos</strong>
                {" "}del próximo consejero
                {conVotos[0].victima && (
                  <span style={{ color:"#888" }}>
                    {" "}(le sacaría 1 a <strong>{conVotos[0].victima}</strong>)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Gráficos por facultad ─────────────────────────────────────────
function GraficosFacultad({ facultad, results, tipo }) {
  const listas = facultad.listas.map(l => ({
    ...l, votos: results?.[facultad.id]?.[tipo]?.[l.id]?.votos || 0,
  }));
  const total = listas.reduce((a, l) => a + l.votos, 0);
  if (total === 0) return null;

  return (
    <Card style={{ marginBottom:14 }}>
      <h3 style={{ margin:"0 0 16px", fontSize:15, color:"#1a1a2e" }}>{facultad.nombre}</h3>
      <div style={{ marginBottom:20 }}>
        {[...listas].sort((a,b)=>b.votos-a.votos).map(l => {
          const pct = total > 0 ? (l.votos/total*100).toFixed(1) : 0;
          return (
            <div key={l.id} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:l.color }} />
                  <span style={{ fontSize:12,fontWeight:600,color:"#1a1a2e" }}>{l.nombre}</span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <span style={{ fontSize:11,color:"#999" }}>{pct}%</span>
                  <span style={{ fontSize:13,fontWeight:800,color:l.color }}>{l.votos.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ height:8,background:"#f0f0f0",borderRadius:99,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${pct}%`,background:l.color,borderRadius:99,transition:"width .5s" }}/>
              </div>
            </div>
          );
        })}
      </div>
      <DonaChart listas={listas} total={total} />
    </Card>
  );
}

// ── Vista por día ─────────────────────────────────────────────────
function VistaPorDia({ facultades, mesasCargadas }) {
  return (
    <div>
      <div style={{ background:"#fff8e1",border:"1.5px solid #ffe082",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#7a5c00" }}>
        ℹ️ Progreso de carga por jornada.
      </div>
      {facultades.map(f => {
        const hasDatos = ["centro","consejo"].some(t => mesasCargadas?.[f.id]?.[t]?.length > 0);
        if (!hasDatos) return null;
        return (
          <Card key={f.id} style={{ marginBottom:12 }}>
            <h3 style={{ margin:"0 0 12px",fontSize:15,color:"#1a1a2e" }}>{f.nombre}</h3>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
              {[["centro","🎓 Centro",f.mesas_centro||0],["consejo","⚖️ Consejo",f.mesas_consejo||0]].map(([tipo,label,totalMesas])=>{
                const cargadasPorDia = [1,2,3].map(d=>({
                  dia:d,
                  n: mesasCargadas?.[f.id]?.[tipo]?.filter(x=>x.dia===d).length||0,
                  total: totalMesas,
                }));
                const totalCargadas = cargadasPorDia.reduce((a,d)=>a+d.n,0);
                if (totalCargadas===0) return <div key={tipo}/>;
                return (
                  <div key={tipo}>
                    <div style={{ fontSize:12,fontWeight:700,color:"#666",marginBottom:8 }}>{label}</div>
                    {cargadasPorDia.map(({dia,n,total})=>(
                      <div key={dia} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                          <span style={{ fontSize:11,color:"#888" }}>Día {dia}</span>
                          <span style={{ fontSize:11,fontWeight:700,color:n===total&&total>0?"#16a085":"#1a1a2e" }}>
                            {n}/{total}{n===total&&total>0?" ✓":""}
                          </span>
                        </div>
                        <div style={{ height:6,background:"#f0f0f0",borderRadius:99,overflow:"hidden" }}>
                          <div style={{ height:"100%",width:total>0?`${(n/total*100).toFixed(0)}%`:"0%",background:n===total&&total>0?"#16a085":"#2980b9",borderRadius:99,transition:"width .5s" }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── PANEL PRINCIPAL ───────────────────────────────────────────────
export default function PanelAnalisis({ facultades, results, mesasCargadas, consejeros }) {
  const [vista,      setVista]      = useState("dhondt");
  const [tipoGrafico, setTipoGrafico] = useState("centro");

  const facultadesConConsejo = facultades.filter(f => {
    const d = results?.[f.id]?.consejo;
    return d && Object.values(d).some(v => v.votos > 0);
  });

  return (
    <div style={{ maxWidth:640, margin:"0 auto" }}>
      <TabToggle
        options={[["dhondt","⚖️ D'Hondt"],["grafico","📊 Gráficos"],["dias","📅 Por Día"]]}
        value={vista}
        onChange={setVista}
      />

      {vista === "dhondt" && (
        <div style={{ marginTop:16 }}>
          <div style={{ background:"#8e44ad08",border:"1px solid #8e44ad22",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#6c3483" }}>
            ⚖️ Consejeros obtenidos y distancia al próximo — por facultad
          </div>
          {facultadesConConsejo.length === 0 ? (
            <div style={{ textAlign:"center",color:"#ccc",padding:40,fontSize:13 }}>
              Sin datos de Consejo Directivo todavía.
            </div>
          ) : (
            facultadesConConsejo.map(f => (
              <DHondtFacultad key={f.id} facultad={f} results={results} consejeros={consejeros} />
            ))
          )}
        </div>
      )}

      {vista === "grafico" && (
        <div style={{ marginTop:16 }}>
          <div style={{ marginBottom:14 }}>
            <TabToggle
              options={[["centro","🎓 Centro"],["consejo","⚖️ Consejo"]]}
              value={tipoGrafico}
              onChange={setTipoGrafico}
            />
          </div>
          {facultades.map(f => (
            <GraficosFacultad key={f.id} facultad={f} results={results} tipo={tipoGrafico} />
          ))}
        </div>
      )}

      {vista === "dias" && (
        <div style={{ marginTop:16 }}>
          <VistaPorDia facultades={facultades} mesasCargadas={mesasCargadas} />
        </div>
      )}
    </div>
  );
}
