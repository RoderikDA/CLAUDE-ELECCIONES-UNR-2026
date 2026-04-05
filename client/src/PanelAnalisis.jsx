import { useState } from "react";
import { Card, TabToggle } from "./UI.jsx";
import { dhondt } from "./dhondt.js";

// ── Cuántos votos faltan para el próximo consejero ────────────────
function votosParaSiguienteConsejero(listas, consejeros) {
  // El próximo consejero lo gana quien primero alcance el cociente
  // del siguiente asiento. Calculamos cuántos votos necesita cada lista
  // para "robarle" el próximo asiento al actual líder.
  const seats = [...consejeros];
  
  // Cociente actual del siguiente asiento disponible
  // Si le damos el próximo asiento al ganador hipotético,
  // necesita superar al que actualmente lo ganaría
  
  // Simulamos dar el próximo consejero a cada lista y vemos cuántos votos necesita
  const resultados = listas.map((l, i) => {
    // Cociente que necesita para ganar el próximo asiento
    // Necesita que votos/(seats[i]+1) > max de los demás cocientes
    const cocientesOtros = listas.map((ll, j) => 
      i === j ? -1 : ll.votos / (seats[j] + 1)
    );
    const maxOtro = Math.max(...cocientesOtros);
    
    // Votos necesarios = maxOtro * (seats[i] + 1) + 1
    const votosNecesarios = Math.ceil(maxOtro * (seats[i] + 1)) + 1;
    const faltan = Math.max(0, votosNecesarios - l.votos);
    
    return {
      nombre: l.nombre,
      color: l.color,
      votos: l.votos,
      consejeros: seats[i],
      faltan,
      cocienteActual: l.votos / (seats[i] + 1),
    };
  });
  
  return resultados.sort((a, b) => a.faltan - b.faltan);
}

// ── Dona SVG simple ───────────────────────────────────────────────
function DonaChart({ listas, total }) {
  if (total === 0) return <div style={{ textAlign:"center", color:"#ccc", padding:20, fontSize:13 }}>Sin datos</div>;
  
  const size = 180;
  const cx = size / 2, cy = size / 2;
  const r = 70, innerR = 45;
  
  let startAngle = -Math.PI / 2;
  const slices = listas.filter(l => l.votos > 0).map(l => {
    const pct = l.votos / total;
    const angle = pct * 2 * Math.PI;
    const slice = { ...l, startAngle, angle, pct };
    startAngle += angle;
    return slice;
  });

  function polarToCart(angle, radius) {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  function slicePath(start, angle, r, innerR) {
    const end = start + angle;
    const p1 = polarToCart(start, r);
    const p2 = polarToCart(end, r);
    const p3 = polarToCart(end, innerR);
    const p4 = polarToCart(start, innerR);
    const large = angle > Math.PI ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
  }

  return (
    <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
      <svg width={size} height={size}>
        {slices.map((s, i) => (
          <path key={i} d={slicePath(s.startAngle, s.angle, r, innerR)}
            fill={s.color} opacity={0.9} stroke="#fff" strokeWidth={1.5}
          />
        ))}
        <text x={cx} y={cy-6} textAnchor="middle" fontSize="13" fill="#666">Total</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1a1a2e">
          {total.toLocaleString()}
        </text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {listas.filter(l=>l.votos>0).sort((a,b)=>b.votos-a.votos).map(l => (
          <div key={l.nombre} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:l.color, flexShrink:0 }} />
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

// ── Panel D'Hondt por facultad ────────────────────────────────────
function DHondtFacultad({ facultad, results, consejeros }) {
  const listas = facultad.listas
    .map(l => ({ ...l, votos: results?.[facultad.id]?.consejo?.[l.id]?.votos || 0 }))
    .sort((a, b) => b.votos - a.votos);
  
  const total = listas.reduce((a, l) => a + l.votos, 0);
  if (total === 0) return null;

  const seats = dhondt(listas, consejeros);
  const analisis = votosParaSiguienteConsejero(listas, seats);
  
  // Quién está más cerca del próximo consejero (excluyendo los que ya tienen todos)
  const conOportunidad = analisis.filter(a => a.votos > 0);

  return (
    <Card style={{ marginBottom:14 }}>
      <h3 style={{ margin:"0 0 14px", fontSize:16, color:"#1a1a2e" }}>{facultad.nombre}</h3>
      
      {/* Consejeros actuales */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:"#aaa", marginBottom:8, fontWeight:600 }}>CONSEJEROS ACTUALES</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {listas.map((l, i) => seats[i] > 0 && (
            <div key={l.id} style={{
              background: l.color+"18", border:`1.5px solid ${l.color}44`,
              borderRadius:10, padding:"8px 14px",
            }}>
              <div style={{ fontSize:13, fontWeight:700, color:l.color }}>{l.nombre}</div>
              <div style={{ fontSize:20, fontWeight:800, color:l.color, textAlign:"center" }}>
                {seats[i]}
              </div>
              <div style={{ fontSize:10, color:"#aaa", textAlign:"center" }}>
                {seats[i]===1?"consejero":"consejeros"}
              </div>
            </div>
          ))}
          {listas.every((l,i) => seats[i] === 0) && (
            <div style={{ color:"#ccc", fontSize:13 }}>Sin consejeros todavía</div>
          )}
        </div>
      </div>

      {/* Distancia al próximo consejero */}
      {conOportunidad.length > 0 && (
        <div style={{ background:"#f8f9fa", borderRadius:12, padding:14 }}>
          <div style={{ fontSize:11, color:"#aaa", marginBottom:10, fontWeight:600 }}>
            📊 DISTANCIA AL PRÓXIMO CONSEJERO
          </div>
          {conOportunidad.map((a, i) => (
            <div key={a.nombre} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"8px 0",
              borderBottom: i < conOportunidad.length-1 ? "1px solid #eee" : "none",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:a.color }} />
                <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{a.nombre}</span>
                <span style={{ fontSize:11, background:a.color+"15", color:a.color, padding:"1px 7px", borderRadius:5 }}>
                  {a.consejeros} cons.
                </span>
              </div>
              <div style={{ textAlign:"right" }}>
                {a.faltan === 0 ? (
                  <span style={{ fontSize:12, color:"#16a085", fontWeight:700 }}>✓ Ya lo tiene</span>
                ) : (
                  <span style={{
                    fontSize:13, fontWeight:800,
                    color: i===0 ? "#e74c3c" : i===1 ? "#e67e22" : "#888",
                  }}>
                    faltan {a.faltan.toLocaleString()} votos
                  </span>
                )}
              </div>
            </div>
          ))}
          {conOportunidad[0]?.faltan > 0 && (
            <div style={{
              marginTop:12, background:"#e74c3c15", border:"1px solid #e74c3c33",
              borderRadius:8, padding:"10px 14px", fontSize:13,
            }}>
              🎯 <strong style={{ color:"#e74c3c" }}>{conOportunidad[0].nombre}</strong>
              {" "}está a{" "}
              <strong style={{ color:"#e74c3c" }}>{conOportunidad[0].faltan.toLocaleString()} votos</strong>
              {" "}del próximo consejero
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Vista por día ─────────────────────────────────────────────────
function VistaPorDia({ facultades, mesasCargadas, results }) {
  // Nota: los datos actuales están agregados, no por día.
  // Mostramos el progreso de mesas por día como proxy.
  const dias = [1, 2, 3];
  const tipos = ["centro", "consejo"];

  return (
    <div>
      <div style={{ background:"#fff8e1", border:"1.5px solid #ffe082", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#7a5c00" }}>
        ℹ️ Progreso de carga por jornada — muestra cuántas mesas fueron escrutadas cada día.
      </div>
      {facultades.map(f => {
        const totalCE = (f.mesas_centro||0);
        const totalCD = (f.mesas_consejo||0);
        const hasDatos = tipos.some(t => mesasCargadas?.[f.id]?.[t]?.length > 0);
        if (!hasDatos) return null;

        return (
          <Card key={f.id} style={{ marginBottom:12 }}>
            <h3 style={{ margin:"0 0 12px", fontSize:15, color:"#1a1a2e" }}>{f.nombre}</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {[["centro","🎓 Centro", totalCE],["consejo","⚖️ Consejo", totalCD]].map(([tipo, label, totalMesas]) => {
                const cargadasPorDia = dias.map(d => ({
                  dia: d,
                  n: mesasCargadas?.[f.id]?.[tipo]?.filter(x => x.dia === d).length || 0,
                  total: totalMesas,
                }));
                const totalCargadas = cargadasPorDia.reduce((a, d) => a + d.n, 0);
                if (totalCargadas === 0) return <div key={tipo} />;
                return (
                  <div key={tipo}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#666", marginBottom:8 }}>{label}</div>
                    {cargadasPorDia.map(({ dia, n, total }) => (
                      <div key={dia} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:11, color:"#888" }}>Día {dia}</span>
                          <span style={{ fontSize:11, fontWeight:700, color: n===total&&total>0?"#16a085":"#1a1a2e" }}>
                            {n}/{total} {n===total&&total>0?"✓":""}
                          </span>
                        </div>
                        <div style={{ height:6, background:"#f0f0f0", borderRadius:99, overflow:"hidden" }}>
                          <div style={{
                            height:"100%",
                            width: total>0?`${(n/total*100).toFixed(0)}%`:"0%",
                            background: n===total&&total>0?"#16a085":"#2980b9",
                            borderRadius:99, transition:"width .5s",
                          }}/>
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
  const [vista, setVista] = useState("dhondt");
  const [tipoGrafico, setTipoGrafico] = useState("centro");

  const facultadesConDatos = facultades.filter(f => {
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

      {/* ── D'HONDT ── */}
      {vista === "dhondt" && (
        <div style={{ marginTop:16 }}>
          <div style={{ background:"#8e44ad08", border:"1px solid #8e44ad22", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#8e44ad" }}>
            ⚖️ Distribución de consejeros y distancia al próximo — por facultad
          </div>
          {facultadesConDatos.length === 0 ? (
            <div style={{ textAlign:"center", color:"#ccc", padding:40, fontSize:13 }}>
              Sin datos de Consejo Directivo todavía.
            </div>
          ) : (
            facultadesConDatos.map(f => (
              <DHondtFacultad key={f.id} facultad={f} results={results} consejeros={consejeros} />
            ))
          )}
        </div>
      )}

      {/* ── GRÁFICOS ── */}
      {vista === "grafico" && (
        <div style={{ marginTop:16 }}>
          <div style={{ marginBottom:14 }}>
            <TabToggle
              options={[["centro","🎓 Centro"],["consejo","⚖️ Consejo"]]}
              value={tipoGrafico}
              onChange={setTipoGrafico}
            />
          </div>
          {facultades.map(f => {
            const listas = f.listas.map(l => ({
              ...l,
              votos: results?.[f.id]?.[tipoGrafico]?.[l.id]?.votos || 0,
            }));
            const total = listas.reduce((a,l) => a+l.votos, 0);
            if (total === 0) return null;
            return (
              <Card key={f.id} style={{ marginBottom:14 }}>
                <h3 style={{ margin:"0 0 16px", fontSize:15, color:"#1a1a2e" }}>{f.nombre}</h3>
                {/* Barras */}
                <div style={{ marginBottom:20 }}>
                  {[...listas].sort((a,b)=>b.votos-a.votos).map(l => {
                    const pct = total>0?(l.votos/total*100).toFixed(1):0;
                    return (
                      <div key={l.id} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, alignItems:"center" }}>
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
                {/* Dona */}
                <DonaChart listas={listas} total={total} />
              </Card>
            );
          })}
        </div>
      )}

      {/* ── POR DÍA ── */}
      {vista === "dias" && (
        <div style={{ marginTop:16 }}>
          <VistaPorDia facultades={facultades} mesasCargadas={mesasCargadas} results={results} />
        </div>
      )}
    </div>
  );
}
