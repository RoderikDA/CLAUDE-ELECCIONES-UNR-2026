const WA = "3416025428";
export const WA_LINK = `https://wa.me/54${WA}`;
export const WA_NOMBRE = "Rodrigo Díaz Abal";

export function Card({ children, style = {} }) {
  return <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px #0001", padding:20, ...style }}>{children}</div>;
}

export function Btn({ children, onClick, variant="primary", disabled, style={}, sm }) {
  const vs = {
    primary: { background:"#1a1a2e", color:"#fff" },
    success: { background:"#16a085", color:"#fff" },
    danger:  { background:"#e74c3c", color:"#fff" },
    ghost:   { background:"#f1f2f6", color:"#444" },
    excel:   { background:"#217346", color:"#fff" },
    wa:      { background:"#25D366", color:"#fff" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border:"none", borderRadius:10,
      padding: sm?"7px 14px":"11px 22px",
      fontSize: sm?12:14, fontWeight:700,
      cursor: disabled?"not-allowed":"pointer",
      opacity: disabled?0.5:1,
      fontFamily:"inherit", transition:"opacity .15s",
      ...vs[variant], ...style,
    }}>{children}</button>
  );
}

export function Toast({ msg, ok }) {
  return (
    <div style={{
      position:"fixed", top:20, left:"50%", transform:"translateX(-50%)",
      background: ok?"#16a085":"#e74c3c", color:"#fff",
      padding:"11px 26px", borderRadius:12, fontWeight:700,
      zIndex:999, boxShadow:"0 4px 20px #0003", fontSize:14, whiteSpace:"nowrap",
    }}>{msg}</div>
  );
}

export function BarRow({ nombre, color, votos, total, badge }) {
  const pct = total > 0 ? (votos / total * 100).toFixed(1) : 0;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
          <div style={{ width:9, height:9, borderRadius:"50%", background:color, flexShrink:0 }}/>
          <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{nombre}</span>
          {badge}
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:12, color:"#999" }}>{pct}%</span>
          <span style={{ fontSize:15, fontWeight:800, color }}>{votos.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ height:8, background:"#f0f0f0", borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width .5s ease" }}/>
      </div>
    </div>
  );
}

export function TabToggle({ options, value, onChange }) {
  return (
    <div style={{ display:"flex", gap:8, background:"#f1f2f6", borderRadius:10, padding:4 }}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex:1, padding:"8px 0", border:"none", borderRadius:8,
          fontFamily:"inherit", background: value===v?"#fff":"transparent",
          fontWeight:700, fontSize:13, color: value===v?"#1a1a2e":"#aaa",
          cursor:"pointer", boxShadow: value===v?"0 1px 6px #0001":"none",
        }}>{label}</button>
      ))}
    </div>
  );
}

export function Header({ user, onLogout }) {
  return (
    <div style={{ background:"#1a1a2e", color:"#fff", padding:"14px 22px" }}>
      <div style={{ maxWidth:640, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:10, letterSpacing:3, opacity:.4, marginBottom:2, textTransform:"uppercase" }}>UNR · Escrutinio Digital</div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:-.5 }}>Elecciones Estudiantiles 2026</div>
        </div>
        {user && (
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, opacity:.6 }}>{user.nombre}</div>
            <div style={{ display:"flex", gap:8, marginTop:4, justifyContent:"flex-end" }}>
              <span style={{ fontSize:10, background: user.rol==="admin"?"#8e44ad": user.rol==="fiscal"?"#16a085":"#2980b9", padding:"2px 8px", borderRadius:5, fontWeight:700 }}>
                {user.rol.toUpperCase()}
              </span>
              <button onClick={onLogout} style={{ background:"none", border:"1px solid #ffffff30", color:"#fff", borderRadius:6, padding:"2px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                Salir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <div style={{ background:"#1a1a2e", color:"#fff", padding:"16px 22px", marginTop:"auto" }}>
      <div style={{ maxWidth:640, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:12, opacity:.5 }}>
          Desarrollado por <span style={{ opacity:1, fontWeight:700 }}>{WA_NOMBRE}</span>
        </div>
        <a href={WA_LINK} target="_blank" rel="noreferrer" style={{
          display:"flex", alignItems:"center", gap:6,
          background:"#25D366", color:"#fff", textDecoration:"none",
          borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700,
        }}>
          <span>💬</span> WhatsApp
        </a>
      </div>
    </div>
  );
}
