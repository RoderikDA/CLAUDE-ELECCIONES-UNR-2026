import { useState } from "react";
import { Card, BarRow, TabToggle } from "./UI.jsx";
import { dhondt } from "./dhondt.js";
import { exportCSVUrl } from "./api.js";

export default function PanelResultados({ config, results }) {
  const [tipo,  setTipo]  = useState("centro");
  const [vista, setVista] = useState("global");

  function getListasConVotos(fid) {
    const f = config.facultades.find(f => f.id === fid);
    return f.listas
      .map(l => ({ ...l, votos: results?.[fid]?.[tipo]?.[l.id] || 0 }))
      .sort((a, b) => b.votos - a.votos);
  }

  function getGlobal() {
    const map = {};
    config.facultades.forEach(f => {
      f.listas.forEach(l => {
        const v = results?.[f.id]?.[tipo]?.[l.id] || 0;
        if (!map[l.nombre]) map[l.nombre] = { nombre: l.nombre, color: l.color, votos: 0 };
        map[l.nombre].votos += v;
      });
    });
    return Object.values(map).sort((a, b) => b.votos - a.votos);
  }

  const global      = getGlobal();
  const totalGlobal = global.reduce((a, l) => a + l.votos, 0);
  const globalSeats = tipo === "consejo" && totalGlobal > 0 ? dhondt(global, config.bancas) : null;
  const conDatos    = config.facultades.filter(f => {
    const d = results?.[f.id]?.[tipo];
    return d && Object.values(d).some(v => v > 0);
  });

  function SeatBadge({ n }) {
    if (n === 0) return null;
    return (
      <span style={{ marginLeft: 6, background: "#8e44ad15", color: "#8e44ad", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>
        {n} banca{n !== 1 ? "s" : ""}
      </span>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <TabToggle
        options={[["centro","🎓 Centro"],["consejo","⚖️ Consejo"]]}
        value={tipo} onChange={setTipo}
      />
      <div style={{ marginTop: 10 }}>
        <TabToggle
          options={[["global","Global"],["facultad","Por Facultad"]]}
          value={vista} onChange={setVista}
        />
      </div>

      <div style={{ marginTop: 14, marginBottom: 4, display: "flex", justifyContent: "flex-end" }}>
        <a href={exportCSVUrl()} download style={{ textDecoration: "none" }}>
          <button style={{
            background: "#217346", color: "#fff", border: "none", borderRadius: 8,
            padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>⬇ Exportar CSV / Excel</button>
        </a>
      </div>

      {vista === "global" && (
        <Card style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 3 }}>Total votos</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#1a1a2e" }}>{totalGlobal.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 3 }}>Facultades cargadas</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#16a085" }}>
                {conDatos.length}<span style={{ fontSize: 15, color: "#ccc" }}>/{config.facultades.length}</span>
              </div>
            </div>
          </div>

          {totalGlobal === 0 ? (
            <div style={{ textAlign: "center", color: "#ccc", padding: "20px 0", fontSize: 13 }}>Sin datos cargados todavía.</div>
          ) : (
            <>
              {global.map((l, i) => (
                <BarRow key={l.nombre} {...l} total={totalGlobal}
                  badge={globalSeats ? <SeatBadge n={globalSeats[i]} /> : null}
                />
              ))}
              {tipo === "consejo" && globalSeats && (
                <div style={{ marginTop: 18, background: "#8e44ad08", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#8e44ad", marginBottom: 10 }}>
                    ⚖️ Distribución D'Hondt — {config.bancas} bancas
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {global.map((l, i) => globalSeats[i] > 0 && (
                      <div key={l.nombre} style={{ background: l.color + "18", border: `1.5px solid ${l.color}44`, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                        <span style={{ color: l.color, fontWeight: 700 }}>{l.nombre}</span>
                        <span style={{ color: "#888", marginLeft: 6 }}>{globalSeats[i]} banca{globalSeats[i] !== 1 ? "s" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {vista === "facultad" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
          {config.facultades.map(f => {
            const listas = getListasConVotos(f.id);
            const total  = listas.reduce((a, l) => a + l.votos, 0);
            const seats  = tipo === "consejo" && total > 0 ? dhondt(listas, config.bancas) : null;
            return (
              <Card key={f.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#1a1a2e" }}>{f.nombre}</h3>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                    background: total > 0 ? "#16a08515" : "#f1f2f6",
                    color: total > 0 ? "#16a085" : "#bbb",
                  }}>{total > 0 ? `${total.toLocaleString()} votos` : "Sin datos"}</span>
                </div>
                {total === 0 ? (
                  <div style={{ color: "#ddd", fontSize: 12 }}>Esperando resultados…</div>
                ) : (
                  <>
                    {listas.map((l, i) => (
                      <BarRow key={l.id} {...l} total={total}
                        badge={seats ? (
                          <span style={{ marginLeft: 5, background: "#8e44ad15", color: "#8e44ad", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 5 }}>
                            {seats[i]}b
                          </span>
                        ) : null}
                      />
                    ))}
                    {tipo === "consejo" && seats && (
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {listas.map((l, i) => seats[i] > 0 && (
                          <div key={l.id} style={{ fontSize: 11, background: l.color + "15", color: l.color, fontWeight: 700, padding: "3px 10px", borderRadius: 6, border: `1px solid ${l.color}33` }}>
                            {l.nombre} · {seats[i]} banca{seats[i] !== 1 ? "s" : ""}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
