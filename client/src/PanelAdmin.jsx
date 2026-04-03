import { useState, useEffect } from "react";
import { Card, Btn, Toast } from "./UI.jsx";
import { getUsuarios, crearUsuario, toggleUsuario, eliminarUsuario, guardarConfig, borrarResultados } from "./api.js";

const COLORS = ["#e74c3c","#2980b9","#27ae60","#8e44ad","#e67e22","#1abc9c","#c0392b","#16a085","#f39c12","#2c3e50"];

export default function PanelAdmin({ user, facultadesIniciales, bancasIniciales, exportURL, onConfigSaved }) {
  const [seccion, setSeccion] = useState("usuarios");

  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      {/* Sub-nav */}
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[["usuarios","👥 Usuarios"],["config","⚙️ Facultades"],["datos","🗑 Datos"]].map(([s, label]) => (
          <button key={s} onClick={() => setSeccion(s)} style={{
            padding:"8px 16px", border:"none", borderRadius:8, fontFamily:"inherit",
            background: seccion===s?"#1a1a2e":"#f1f2f6",
            color: seccion===s?"#fff":"#666",
            fontWeight:700, fontSize:13, cursor:"pointer",
          }}>{label}</button>
        ))}
      </div>

      {seccion === "usuarios" && <GestionUsuarios user={user} exportURL={exportURL} />}
      {seccion === "config"   && <GestionConfig user={user} facultadesIniciales={facultadesIniciales} bancasIniciales={bancasIniciales} onSaved={onConfigSaved} />}
      {seccion === "datos"    && <GestionDatos user={user} exportURL={exportURL} />}
    </div>
  );
}

// ── Gestión de usuarios ───────────────────────────────────────────
function GestionUsuarios({ user }) {
  const [usuarios, setUsuarios] = useState([]);
  const [nombre,   setNombre]   = useState("");
  const [rol,      setRol]      = useState("fiscal");
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);

  function showToast(msg, ok=true) { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); }

  useEffect(() => { fetchUsuarios(); }, []);

  async function fetchUsuarios() {
    try { setUsuarios(await getUsuarios(user.codigo)); } catch {}
  }

  async function crear() {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      const res = await crearUsuario(user.codigo, nombre.trim(), rol);
      showToast(`✓ Usuario creado — Código: ${res.codigo}`);
      setNombre("");
      fetchUsuarios();
    } catch (e) { showToast("❌ " + e.message, false); }
    finally { setLoading(false); }
  }

  async function toggle(id, activo) {
    await toggleUsuario(user.codigo, id, activo);
    fetchUsuarios();
  }

  async function eliminar(id) {
    await eliminarUsuario(user.codigo, id);
    fetchUsuarios();
  }

  const rolColor = { admin:"#8e44ad", fiscal:"#16a085", publico:"#2980b9" };
  const activos   = usuarios.filter(u => u.activo && u.rol !== "admin");
  const inactivos = usuarios.filter(u => !u.activo);

  return (
    <div>
      {toast && <Toast {...toast} />}
      <Card style={{ marginBottom:16 }}>
        <h3 style={{ margin:"0 0 16px", fontSize:16, color:"#1a1a2e" }}>Crear nuevo usuario</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, marginBottom:12 }}>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre y apellido"
            style={{ padding:"10px 12px", border:"2px solid #eee", borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none" }}
          />
          <select value={rol} onChange={e=>setRol(e.target.value)}
            style={{ padding:"10px 12px", border:"2px solid #eee", borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none", background:"#fff" }}>
            <option value="fiscal">Fiscal</option>
            <option value="publico">Público</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Btn onClick={crear} variant="success" disabled={loading||!nombre.trim()} style={{ width:"100%" }}>
          {loading ? "Creando…" : "Generar código de acceso"}
        </Btn>
      </Card>

      {/* Lista de usuarios activos */}
      <h3 style={{ fontSize:14, color:"#888", margin:"0 0 10px", fontWeight:600 }}>USUARIOS ACTIVOS ({activos.length})</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
        {activos.map(u => (
          <div key={u.id} style={{ background:"#fff", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 6px #0001" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:"#1a1a2e" }}>{u.nombre}</div>
              <div style={{ display:"flex", gap:8, marginTop:4, alignItems:"center" }}>
                <span style={{ fontSize:10, background:rolColor[u.rol]+"20", color:rolColor[u.rol], fontWeight:700, padding:"2px 8px", borderRadius:5 }}>{u.rol.toUpperCase()}</span>
                <span style={{ fontSize:12, fontFamily:"monospace", background:"#f8f9fa", padding:"2px 8px", borderRadius:5, letterSpacing:1, color:"#333" }}>{u.codigo}</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <Btn sm variant="ghost" onClick={() => toggle(u.id, false)}>Desactivar</Btn>
              <Btn sm variant="danger" onClick={() => eliminar(u.id)}>✕</Btn>
            </div>
          </div>
        ))}
        {activos.length === 0 && <div style={{ color:"#ccc", fontSize:13, textAlign:"center", padding:20 }}>Sin usuarios activos todavía.</div>}
      </div>

      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize:14, color:"#bbb", margin:"0 0 10px", fontWeight:600 }}>INACTIVOS ({inactivos.length})</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {inactivos.map(u => (
              <div key={u.id} style={{ background:"#f8f9fa", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", opacity:.7 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:"#aaa" }}>{u.nombre}</div>
                  <span style={{ fontSize:12, fontFamily:"monospace", color:"#bbb" }}>{u.codigo}</span>
                </div>
                <Btn sm variant="ghost" onClick={() => toggle(u.id, true)}>Reactivar</Btn>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Gestión de config facultades/listas ───────────────────────────
function GestionConfig({ user, facultadesIniciales, bancasIniciales, onSaved }) {
  const [draft,  setDraft]  = useState(() => JSON.parse(JSON.stringify(facultadesIniciales || [])));
  const [bancas, setBancas] = useState(bancasIniciales || 8);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  function showToast(msg, ok=true) { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); }

  const addFac = () => setDraft([...draft, { id:"f"+Date.now(), nombre:"", mesas_centro:3, mesas_consejo:3, listas:[], orden:draft.length }]);
  const delFac = fid => setDraft(draft.filter(f=>f.id!==fid));
  const updFac = (fid, k, v) => setDraft(draft.map(f=>f.id===fid?{...f,[k]:v}:f));
  const addLista = fid => setDraft(draft.map(f=>f.id===fid?{...f,listas:[...f.listas,{id:"l"+Date.now(),nombre:"",color:COLORS[f.listas.length%COLORS.length],orden:f.listas.length}]}:f));
  const delLista = (fid,lid) => setDraft(draft.map(f=>f.id===fid?{...f,listas:f.listas.filter(l=>l.id!==lid)}:f));
  const updLista = (fid,lid,k,v) => setDraft(draft.map(f=>f.id===fid?{...f,listas:f.listas.map(l=>l.id===lid?{...l,[k]:v}:l)}:f));

  async function guardar() {
    setSaving(true);
    try {
      await guardarConfig(user.codigo, { facultades: draft, bancas });
      showToast("✓ Configuración guardada");
      onSaved();
    } catch (e) { showToast("❌ " + e.message, false); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <div style={{ background:"#fff8e1", border:"1.5px solid #ffe082", borderRadius:10, padding:"11px 14px", marginBottom:18, fontSize:12, color:"#7a5c00" }}>
        ⚠️ Los cambios en nombres no borran resultados ya cargados. Si eliminás una facultad sus resultados quedan en la DB.
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, background:"#fff", borderRadius:12, padding:"14px 16px", boxShadow:"0 1px 8px #0001" }}>
        <span style={{ fontSize:14, fontWeight:700, color:"#1a1a2e", flex:1 }}>Bancas — Consejo Directivo</span>
        <input type="number" min="1" max="50" value={bancas} onChange={e=>setBancas(parseInt(e.target.value)||8)}
          style={{ width:64, padding:"7px 10px", border:"2px solid #eee", borderRadius:8, fontSize:16, fontWeight:800, fontFamily:"inherit", outline:"none", textAlign:"center", color:"#8e44ad" }}
        />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:18 }}>
        {draft.map(f => (
          <Card key={f.id} style={{ border:"2px solid #eee" }}>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input value={f.nombre} onChange={e=>updFac(f.id,"nombre",e.target.value)} placeholder="Nombre de la facultad"
                style={{ flex:1, padding:"8px 12px", border:"2px solid #eee", borderRadius:8, fontSize:14, fontWeight:700, fontFamily:"inherit", outline:"none" }} />
              <Btn sm variant="danger" onClick={()=>delFac(f.id)}>✕</Btn>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              {["centro","consejo"].map(t => (
                <div key={t}>
                  <div style={{ fontSize:11, color:"#aaa", marginBottom:4 }}>Mesas {t === "centro" ? "CE" : "CD"}</div>
                  <input type="number" min="0" value={f[`mesas_${t}`]||0} onChange={e=>updFac(f.id,`mesas_${t}`,parseInt(e.target.value)||0)}
                    style={{ width:"100%", padding:"6px 8px", border:"1.5px solid #eee", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:10 }}>
              {f.listas.map(l => (
                <div key={l.id} style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input type="color" value={l.color} onChange={e=>updLista(f.id,l.id,"color",e.target.value)}
                    style={{ width:28, height:28, border:"none", borderRadius:4, cursor:"pointer", padding:0 }} />
                  <input value={l.nombre} onChange={e=>updLista(f.id,l.id,"nombre",e.target.value)} placeholder="Agrupación"
                    style={{ flex:1, padding:"6px 10px", border:"1.5px solid #eee", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none" }} />
                  <Btn sm variant="ghost" onClick={()=>delLista(f.id,l.id)}>✕</Btn>
                </div>
              ))}
            </div>
            <Btn sm variant="ghost" onClick={()=>addLista(f.id)}>+ Agrupación</Btn>
          </Card>
        ))}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="ghost" onClick={addFac} style={{ flex:1 }}>+ Facultad</Btn>
        <Btn variant="success" onClick={guardar} disabled={saving} style={{ flex:1 }}>
          {saving ? "Guardando…" : "Guardar configuración"}
        </Btn>
      </div>
    </div>
  );
}

// ── Gestión de datos ──────────────────────────────────────────────
function GestionDatos({ user, exportURL }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);

  function showToast(msg, ok=true) { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); }

  async function handleBorrar() {
    if (!confirm) { setConfirm(true); setTimeout(()=>setConfirm(false), 5000); return; }
    setLoading(true);
    try {
      await borrarResultados(user.codigo);
      showToast("✓ Todos los resultados fueron borrados");
      setConfirm(false);
    } catch (e) { showToast("❌ " + e.message, false); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <Card style={{ marginBottom:16 }}>
        <h3 style={{ margin:"0 0 12px", fontSize:16, color:"#1a1a2e" }}>Exportar resultados</h3>
        <p style={{ fontSize:13, color:"#888", margin:"0 0 16px" }}>
          Descargá todos los datos en formato CSV compatible con Excel. Incluye facultad, tipo, día, mesa, agrupación, votos, blancos, nulos y quién cargó cada mesa.
        </p>
        <a href={exportURL} download style={{ textDecoration:"none" }}>
          <Btn variant="excel" style={{ width:"100%" }}>⬇ Descargar CSV / Excel</Btn>
        </a>
      </Card>

      <Card style={{ border:"1.5px solid #fdecea" }}>
        <h3 style={{ margin:"0 0 12px", fontSize:16, color:"#e74c3c" }}>⚠️ Zona de peligro</h3>
        <p style={{ fontSize:13, color:"#888", margin:"0 0 16px" }}>
          Esto borra permanentemente todos los resultados cargados. Los usuarios y la configuración de facultades no se ven afectados.
        </p>
        <Btn variant="danger" onClick={handleBorrar} disabled={loading} style={{ width:"100%" }}>
          {loading ? "Borrando…" : confirm ? "⚠️ ¿Confirmar? Tocá de nuevo para borrar todo" : "🗑 Borrar todos los resultados"}
        </Btn>
      </Card>
    </div>
  );
}
