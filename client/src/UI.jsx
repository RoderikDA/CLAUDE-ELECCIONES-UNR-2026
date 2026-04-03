export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      boxShadow: "0 2px 12px #0001", padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", disabled, style = {}, sm }) {
  const vs = {
    primary: { background: "#1a1a2e", color: "#fff" },
    success: { background: "#16a085", color: "#fff" },
    danger:  { background: "#e74c3c", color: "#fff" },
    ghost:   { background: "#f1f2f6", color: "#444" },
    excel:   { background: "#217346", color: "#fff" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border: "none", borderRadius: 10,
      padding: sm ? "7px 14px" : "11px 22px",
      fontSize: sm ? 12 : 14, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "inherit", transition: "opacity .15s",
      ...vs[variant], ...style,
    }}>{children}</button>
  );
}

export function Toast({ msg, ok }) {
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      background: ok ? "#16a085" : "#e74c3c", color: "#fff",
      padding: "11px 26px", borderRadius: 12, fontWeight: 700,
      zIndex: 999, boxShadow: "0 4px 20px #0003", fontSize: 14, whiteSpace: "nowrap",
    }}>{msg}</div>
  );
}

export function BarRow({ nombre, color, votos, total, badge }) {
  const pct = total > 0 ? (votos / total * 100).toFixed(1) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{nombre}</span>
          {badge}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#999" }}>{pct}%</span>
          <span style={{ fontSize: 15, fontWeight: 800, color }}>{votos.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ height: 8, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: 99, transition: "width .5s ease",
        }} />
      </div>
    </div>
  );
}

export function TabToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, background: "#f1f2f6", borderRadius: 10, padding: 4 }}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex: 1, padding: "8px 0", border: "none", borderRadius: 8,
          fontFamily: "inherit", background: value === v ? "#fff" : "transparent",
          fontWeight: 700, fontSize: 13, color: value === v ? "#1a1a2e" : "#aaa",
          cursor: "pointer", boxShadow: value === v ? "0 1px 6px #0001" : "none",
        }}>{label}</button>
      ))}
    </div>
  );
}
