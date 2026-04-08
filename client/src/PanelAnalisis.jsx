import { useState } from "react";
import { Card, TabToggle } from "./UI.jsx";
import { dhondt } from "./dhondt.js";

const DIA_COLORS = {
  1: "#2980b9",
  2: "#27ae60",
  3: "#e67e22",
};
const DIA_LABELS = { 1: "Día 1", 2: "Día 2", 3: "Día 3" };

// ── A quién le sacaría el consejero ──────────────────────────────
function calcularImpacto(listas, totalConsejeros, indexObjetivo) {
  const listasH = listas.map((l, i) => ({
    ...l, votos: i === indexObjetivo ? l.votos + 999999 : l.votos,
  }));
  const seatsH = dhondt(listasH, totalConsejeros);
  const seats  = dhondt(listas,  totalConsejeros);
  for (let i = 0; i < listas.length; i++) {
    if (i !== indexObjetivo && seatsH[i] < seats[i]) return listas[i].nombre;
  }
  return null;
}

function calcularDistancias(listas, totalConsejeros) {
  const seats = dhondt(listas, totalConsejeros);
  return listas.map((l, i) => {
    const cocientesOtros = listas.map((ll, j) =>
      i === j ? -1 : ll.votos / (seats[j] + 1)
    );
    const maxOtro = Math.max(...cocientesOtros);
    const votosNec = Math.ceil(maxOtro * (seats[i] + 1)) + 1;
    const faltan   = Math.max(0, votosNec - l.votos);
    const victima  = faltan === 0 ? null : calcularImpacto(listas, totalConsejeros, i);
    return { nombre:l.nombre, color:l.color, votos:l.votos, consejeros:seats[i], faltan, victima };
  }).sort((a, b) => {
    if (a.faltan === 0 && b.faltan === 0) return 0;
    if (a.faltan === 0) return 1;
    if (b.faltan === 0) return -1;
    return a.faltan - b.faltan;
  });
}

// ── Dona SVG ──────────────────────────────────────────────────────
function DonaChart({ listas, total }) {
  if (total === 0) return null;
  const size = 160, cx = 80, cy = 80, r = 62, innerR = 40;
  let startAngle = -Math.PI / 2;
  const slices = listas.filter(l => l.votos > 0).map(l => {
    const angle = (l.votos / total) * 2 * Math.PI;
    const s = { ...l, startAngle, angle };
    startAngle += angle;
    return s;
  });
  function pt(a, rad) { return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) }; }
  function arc(start, angle, ro, ri) {
    const end = start + angle;
    const p1 = pt(start, ro), p2 = pt(end, ro), p3 = pt(end, ri), p4 = pt(start, ri);
    const lg = angle > Math.PI ? 1 : 0;
    return `M${p1.x} ${p1.y} A${ro} ${ro} 0 ${lg} 1 ${p2.x} ${p2.y} L${p3.x} ${p3.y} A${ri} ${ri} 0 ${lg} 0 ${p4.x} ${p4.y}Z`;
  }
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      {slices.map((s,i) => (
        <path key={i} d={arc(s.startAngle, s.angle, r, innerR)}
          fill={s.color} opacity={0.9} stroke="#fff" strokeWidth={1.5} />
      ))}
      <text x={cx} y={cy-5}  textAnchor="middle" fontSize="11" fill="#888">Total</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize="15" fontWeight="bold" fill="#1a1a2e">
        {total.toLocaleString()}
      </text>
    </svg>
  );
}

// ── Barra apilada por días ────────────────────────────────────────
function BarraApilada({ lista, votosPorDia, facultadId, tipo, totalGeneral, onClick, expandida }) {
  const dias = [1, 2, 3];
  const votosDia = dias.map(d => votosPorDia?.[facultadId]?.[tipo]?.[d]?.[lista.id]?.votos || 0);
  const totalLista = votosDia.reduce((a, v) => a + v, 0);
  const pct = totalGeneral > 0 ? (totalLista / totalGeneral * 100).toFixed(1) : 0;

  if (totalLista === 0) return null;

  return (
    <div style={{ marginBottom: expandida ? 0 : 12 }}>
      {/* Fila principal clickeable */}
      <div
        onClick={onClick}
        style={{
          display:"flex", alignItems:"center", gap:10,
          cursor:"pointer", padding:"6px 8px", borderRadius:8,
          background: expandida ? lista.color+"10" : "transparent",
          border: expandida ? `1px solid ${lista.color}33` : "1px solid transparent",
          transition:"all .2s",
        }}
      >
        <div style={{ width:9, height:9, borderRadius:"50%", background:lista.color, flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", flex:1, minWidth:0 }}>
          {lista.nombre}
        </span>
        <span style={{ fontSize:11, color:"#999", flexShrink:0 }}>{pct}%</span>
        <span style={{ fontSize:14, fontWeight:800, color:lista.color, flexShrink:0, minWidth:36, textAlign:"right" }}>
          {totalLista.toLocaleString()}
        </span>
        <span style={{ fontSize:12, color:"#bbb" }}>{expandida ? "▲" : "▼"}</span>
      </div>

      {/* Barra apilada */}
      <div style={{ display:"flex", height:10, borderRadius:99, overflow:"hidden", background:"#f0f0f0", margin:"4px 0 0 17px" }}>
        {dias.map(d => {
          const v = votosDia[d-1];
          const w = totalLista > 0 ? (v / totalLista * 100).toFixed(1) : 0;
          return v > 0 ? (
            <div key={d} title={`Día ${d}: ${v} votos`} style={{
              width:`${w}%`, height:"100%",
              background: DIA_COLORS[d],
              transition:"width .5s",
            }} />
          ) : null;
        })}
      </div>

      {/* Detalle expandido */}
      {expandida && (
        <div style={{ marginTop:12, marginLeft:17, marginBottom:8 }}>
          {/* Leyenda días */}
          <div style={{ display:"flex", gap:12, marginBottom:10, flexWrap:"wrap" }}>
            {dias.map(d => (
              <div key={d} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:DIA_COLORS[d] }} />
                <span style={{ fontSize:11, color:"#666" }}>{DIA_LABELS[d]}</span>
              </div>
            ))}
          </div>

          {/* Barras por día */}
          {dias.map(d => {
            const v = votosDia[d-1];
            const pctDia = totalLista > 0 ? (v / totalLista * 100).toFixed(1) : 0;
            const pctTotal = totalGeneral > 0 ? (v / totalGeneral * 100).toFixed(1) : 0;
            return (
              <div key={d} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:DIA_COLORS[d] }}>{DIA_LABELS[d]}</span>
                  <div style={{ display:"flex", gap:12 }}>
                    <span style={{ fontSize:11, color:"#aaa" }}>{pctDia}% del día</span>
                    <span style={{ fontSize:11, color:"#aaa" }}>{pctTotal}% del total</span>
                    <span style={{ fontSize:13, fontWeight:800, color:DIA_COLORS[d] }}>{v.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ height:8, background:"#f0f0f0", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pctDia}%`, background:DIA_COLORS[d], borderRadius:99, transition:"width .5s" }} />
                </div>
              </div>
            );
          })}

          {/* Total por día abajo */}
          <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
            {dias.map(d => (
              <div key={d} style={{
                background: DIA_COLORS[d]+"15", border:`1px solid ${DIA_COLORS[d]}33`,
                borderRadius:8, padding:"5px 10px", fontSize:11,
              }}>
                <span style={{ color:DIA_COLORS[d], fontWeight:700 }}>{DIA_LABELS[d]}</span>
                <span style={{ color:"#666", marginLeft:6 }}>{votosDia[d-1].toLocaleString()} votos</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vista Por Día (votos reales) ──────────────────────────────────
function VistaPorDia({ facultades, results, votosPorDia }) {
  const [tipo, setTipo] = useState("centro");
  const [expandida, setExpandida] = useState(null); // "facultadId-listaId"

  function toggleExpandida(fid, lid) {
    const key = `${fid}-${lid}`;
    setExpandida(prev => prev === key ? null : key);
  }

  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <TabToggle
          options={[["centro","🎓 Centro"],["consejo","⚖️ Consejo"]]}
          value={tipo}
          onChange={v => { setTipo(v); setExpandida(null); }}
        />
      </div>

      <div style={{
        display:"flex", gap:16, marginBottom:16, padding:"10px 14px",
        background:"#fff", borderRadius:10, boxShadow:"0 1px 6px #0001",
        flexWrap:"wrap",
      }}>
        {[1,2,3].map(d => (
          <div key={d} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:3, background:DIA_COLORS[d] }} />
            <span style={{ fontSize:12, color:"#555", fontWeight:600 }}>{DIA_LABELS[d]}</span>
          </div>
        ))}
        <span style={{ fontSize:11, color:"#aaa", marginLeft:"auto" }}>
          Click en una agrupación para ver detalle por día
        </span>
      </div>

      {facultades.map(f => {
        const listas = f.listas.map(l => ({
          ...l,
          votos: results?.[f.id]?.[tipo]?.[l.id]?.votos || 0,
        }));
        const total = listas.reduce((a, l) => a + l.votos, 0);
        if (total === 0) return null;

        return (
          <Card key={f.id} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14, alignItems:"center" }}>
              <h3 style={{ margin:0, fontSize:15, color:"#1a1a2e" }}>{f.nombre}</h3>
              <span style={{ fontSize:12, color:"#16a085", fontWeight:700 }}>{total.toLocaleString()} votos</span>
            </div>

            {/* Barras apiladas + dona */}
            <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                {[...listas].sort((a,b)=>b.votos-a.votos).map(l => (
                  <BarraApilada
                    key={l.id}
                    lista={l}
                    votosPorDia={votosPorDia}
                    facultadId={f.id}
                    tipo={tipo}
                    totalGeneral={total}
                    onClick={() => toggleExpandida(f.id, l.id)}
                    expandida={expandida === `${f.id}-${l.id}`}
                  />
                ))}
              </div>
              <DonaChart listas={listas} total={total} />
            </div>

            {/* Resumen por día */}
            <div style={{ marginTop:14, display:"flex", gap:10, flexWrap:"wrap" }}>
              {Array.from({ length: f.dias || 3 }, (_, i) => i + 1).map(d => {
                const totalDia = f.listas.reduce((a, l) =>
                  a + (votosPorDia?.[f.id]?.[tipo]?.[d]?.[l.id]?.votos || 0), 0
                );
                if (totalDia === 0) return null;
                return (
                  <div key={d} style={{
                    background: DIA_COLORS[d]+"12", border:`1px solid ${DIA_COLORS[d]}33`,
                    borderRadius:8, padding:"6px 12px", fontSize:12,
                  }}>
                    <span style={{ color:DIA_COLORS[d], fontWeight:700 }}>{DIA_LABELS[d]}</span>
                    <span style={{ color:"#555", marginLeft:6 }}>{totalDia.toLocaleString()} votos</span>
                    <span style={{ color:"#aaa", marginLeft:6 }}>
                      ({total>0?(totalDia/total*100).toFixed(0):0}%)
                    </span>
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

// ── D'Hondt por facultad ──────────────────────────────────────────
function DHondtFacultad({ facultad, results, totalConsejeros }) {
  const listas = facultad.listas
    .map(l => ({ ...l, votos: results?.[facultad.id]?.consejo?.[l.id]?.votos || 0 }))
    .sort((a, b) => b.votos - a.votos);

  const total = listas.reduce((a, l) => a + l.votos, 0);
  if (total === 0) return null;

  const seats    = dhondt(listas, totalConsejeros);
  const analisis = calcularDistancias(listas, totalConsejeros);
  const conVotos = analisis.filter(a => a.votos > 0);

  return (
    <Card style={{ marginBottom:14 }}>
      <h3 style={{ margin:"0 0 14px", fontSize:16, color:"#1a1a2e" }}>{facultad.nombre}</h3>

      {/* Consejeros actuales */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11,color:"#aaa",marginBottom:8,fontWeight:600,letterSpacing:1 }}>
          CONSEJEROS ACTUALES ({seats.reduce((a,s)=>a+s,0)}/{totalConsejeros})
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {listas.map((l,i) => seats[i] > 0 && (
            <div key={l.id} style={{
              background:l.color+"18", border:`1.5px solid ${l.color}44`,
              borderRadius:10, padding:"8px 16px", textAlign:"center", minWidth:90,
            }}>
              <div style={{ fontSize:12,fontWeight:700,color:l.color }}>{l.nombre}</div>
              <div style={{ fontSize:24,fontWeight:800,color:l.color }}>{seats[i]}</div>
              <div style={{ fontSize:10,color:"#aaa" }}>consejero{seats[i]!==1?"s":""}</div>
            </div>
          ))}
          {seats.every(s=>s===0) && (
            <div style={{ color:"#ccc",fontSize:13 }}>Sin consejeros todavía</div>
          )}
        </div>
      </div>

      {/* Distancia al próximo */}
      {conVotos.length > 0 && (
        <div style={{ background:"#f8f9fa",borderRadius:12,padding:14 }}>
          <div style={{ fontSize:11,color:"#aaa",marginBottom:12,fontWeight:600,letterSpacing:1 }}>
            📊 DISTANCIA AL PRÓXIMO CONSEJERO
          </div>
          {conVotos.map((a,i) => (
            <div key={a.nombre} style={{
              padding:"10px 0",
              borderBottom: i<conVotos.length-1?"1px solid #eee":"none",
            }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:a.color }} />
                  <span style={{ fontSize:13,fontWeight:700,color:"#1a1a2e" }}>{a.nombre}</span>
                  <span style={{ fontSize:10,background:a.color+"15",color:a.color,padding:"1px 7px",borderRadius:5,fontWeight:700 }}>
                    {a.consejeros} cons.
                  </span>
                </div>
                <div style={{ textAlign:"right" }}>
                  {a.faltan===0 ? (
                    <span style={{ fontSize:12,color:"#16a085",fontWeight:700 }}>✓ Ya lo tiene</span>
                  ) : (
                    <span style={{ fontSize:13,fontWeight:800,color:i===0?"#e74c3c":i===1?"#e67e22":"#888" }}>
                      faltan {a.faltan.toLocaleString()} votos
                    </span>
                  )}
                </div>
              </div>
              {a.faltan>0 && a.victima && (
                <div style={{ marginTop:5,marginLeft:16,fontSize:11,color:"#888",display:"flex",alignItems:"center",gap:4 }}>
                  <span>↳ le sacaría 1 consejero a</span>
                  <span style={{ fontWeight:700,color:"#e74c3c",background:"#e74c3c12",padding:"1px 7px",borderRadius:5 }}>
                    {a.victima}
                  </span>
                </div>
              )}
            </div>
          ))}
          {conVotos[0]?.faltan>0 && (
            <div style={{ marginTop:14,background:"#e74c3c10",border:"1px solid #e74c3c33",borderRadius:10,padding:"12px 14px" }}>
              <div style={{ fontSize:13,color:"#1a1a2e" }}>
                🎯 <strong style={{ color:"#e74c3c" }}>{conVotos[0].nombre}</strong>
                {" "}está a{" "}
                <strong style={{ color:"#e74c3c" }}>{conVotos[0].faltan.toLocaleString()} votos</strong>
                {" "}del próximo consejero
                {conVotos[0].victima && (
                  <span style={{ color:"#888" }}> (le sacaría 1 a <strong>{conVotos[0].victima}</strong>)</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Gráficos simples ──────────────────────────────────────────────
function GraficosFacultad({ facultad, results, tipo }) {
  const listas = facultad.listas.map(l => ({
    ...l, votos: results?.[facultad.id]?.[tipo]?.[l.id]?.votos || 0,
  }));
  const total = listas.reduce((a,l)=>a+l.votos,0);
  if (total===0) return null;
  return (
    <Card style={{ marginBottom:14 }}>
      <h3 style={{ margin:"0 0 16px",fontSize:15,color:"#1a1a2e" }}>{facultad.nombre}</h3>
      <div style={{ display:"flex",gap:16,alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          {[...listas].sort((a,b)=>b.votos-a.votos).map(l => {
            const pct = total>0?(l.votos/total*100).toFixed(1):0;
            return (
              <div key={l.id} style={{ marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:l.color }} />
                    <span style={{ fontSize:12,fontWeight:600,color:"#1a1a2e" }}>{l.nombre}</span>
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
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
      </div>
    </Card>
  );
}

// ── PANEL PRINCIPAL ───────────────────────────────────────────────
export default function PanelAnalisis({ facultades, results, mesasCargadas, consejeros, votosPorDia }) {
  const [vista,       setVista]       = useState("dhondt");
  const [tipoGrafico, setTipoGrafico] = useState("centro");

  const facultadesConConsejo = facultades.filter(f => {
    const d = results?.[f.id]?.consejo;
    return d && Object.values(d).some(v => v.votos > 0);
  });

  return (
    <div style={{ maxWidth:640, margin:"0 auto" }}>
      <TabToggle
        options={[["dhondt","⚖️ D'Hondt"],["dias","📅 Por Día"],["grafico","📊 Gráficos"]]}
        value={vista}
        onChange={setVista}
      />

      {vista==="dhondt" && (
        <div style={{ marginTop:16 }}>
          <div style={{ background:"#8e44ad08",border:"1px solid #8e44ad22",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#6c3483" }}>
            ⚖️ Consejeros obtenidos y distancia al próximo — por facultad. Tope: {consejeros} consejeros.
          </div>
          {facultadesConConsejo.length===0 ? (
            <div style={{ textAlign:"center",color:"#ccc",padding:40,fontSize:13 }}>
              Sin datos de Consejo Directivo todavía.
            </div>
          ) : (
            facultadesConConsejo.map(f => (
              <DHondtFacultad key={f.id} facultad={f} results={results} totalConsejeros={consejeros} />
            ))
          )}
        </div>
      )}

      {vista==="dias" && (
        <div style={{ marginTop:16 }}>
          <VistaPorDia facultades={facultades} results={results} votosPorDia={votosPorDia} />
        </div>
      )}

      {vista==="grafico" && (
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
    </div>
  );
}
