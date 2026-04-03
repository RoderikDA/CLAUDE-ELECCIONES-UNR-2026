export default function PanelLog({ log }) {
  if (!log?.length) return (
    <div style={{ textAlign: "center", color: "#ccc", padding: 40, fontSize: 13 }}>Sin registros todavía.</div>
  );
  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      {[...log].map((e, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f1f2f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 14 }}>{e.facultad}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
              background: e.tipo === "consejo" ? "#8e44ad15" : "#2980b915",
              color: e.tipo === "consejo" ? "#8e44ad" : "#2980b9",
            }}>{e.tipo === "centro" ? "CE" : "CD"}</span>
          </div>
          <span style={{ color: "#bbb", fontSize: 12 }}>
            {new Date(e.ts).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
      ))}
    </div>
  );
}
