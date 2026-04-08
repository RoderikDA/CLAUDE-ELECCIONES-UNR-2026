import { useState, useEffect } from "react";
import { Card, Btn, Toast } from "./UI.jsx";
import { getUsuarios, crearUsuario, toggleUsuario, eliminarUsuario, guardarConfig, borrarResultados } from "./api.js";

const COLORS = ["#e74c3c","#2980b9","#27ae60","#8e44ad","#e67e22","#1abc9c","#c0392b","#16a085","#f39c12","#2c3e50"];

export default function PanelAdmin({ user, facultadesIniciales, bancasIniciales, exportURL, onConfigSaved }) {
  const [seccion, setSeccion] = useState("usuarios");
  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[["usuarios","👥 Usuarios"],["config","⚙️ Facultades"],["datos","🗑 Datos"]].map(([s,label]) => (
          <button key={s} onClick={()=>setSeccion(s)} style={{
            padding:"8px 16px", border:"none", borderRadius:8, fontFamily:"inherit",
            background: seccion===s?"#1a1a2e":"#f1f2f6",
            color: seccion===s?"#fff":"#666",
            fontWeight:700, fontSize:13, cursor:"pointer",
          }}>{label}</button>
        ))}
      </div>
      {seccion==="usuarios" && <GestionUsuarios user={user} facultades={facultadesIniciales} />}
      {seccion==="config"   && <GestionConfig user={user} facultadesIniciales={facultadesIniciales} bancasIniciales={bancasIniciales} onSaved={onConfigSaved} />}
      {seccion==="datos"    && <GestionDatos user={user} exportURL={exportURL} />}
    </div>
  );
}

function GestionUsuarios({ user, facultades }) {
  const [usuarios,  setUsuarios]  = useState([]);
  const [nombre,    setNombre]    = useState("");
  const [rol,       setRol]       = useState("fiscal");
  const [facId,     setFacId]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [filtroRol, setFiltroRol] = useState("todos");

  function showToast(msg, ok=true) { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); }
  useEffect(()=>{ fetchUsuarios(); },[]);

  async function fetchUsuarios() {
    try { setUsuarios(await getUsuarios(user.codigo)); } catch {}
  }

  async function crear() {
    if (!nombre.trim()) return;
    if (rol === "fiscal" && !facId) { showToast("❌ Seleccioná una facultad para el fiscal", false); return; }
    setLoading(true);
    try {
      const res = await crearUsuario(user.codigo, nombre.trim(), rol, rol === "fiscal" ? facId : null);
      showToast(`✓ Código generado: ${res.codigo}`);
      setNombre(""); setFacId("");
      fetchUsuarios();
    } catch (e) { showToast("❌ " + e.message, false); }
    finally { setLoading(false); }
  }

  async function toggle(id, activo) { await toggleUsuario(user.codigo, id, activo); fetchUsuarios(); }
  async function eliminar(id) { await eliminarUsuario(user.codigo, id); fetchUsuarios(); }

  const rolColor = { admin:"#8e44ad", fiscal:"#16a085", publico:"#2980b9" };
  const usuariosFiltrados = usuarios.filter(u => {
    if (u.rol === "admin") return false;
    if (filtroRol === "todos") return true;
    return u.rol === filtroRol;
  });
  const activos   = usuariosFiltrados.filter(u => u.activo);
  const inactivos = usuariosFiltrados.filter(u => !u.activo);

  return (
    <div>
      {toast && <Toast {...toast} />}
      <Card style={{ marginBottom:16 }}>
        <h3 style={{ margin:"0 0 16px", fontSize:16, color:"#1a1a2e" }}>Crear nuevo usuario</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre y apellido"
            style={{ padding:"10px 12px", border:"2px solid #eee", borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none" }} />
          <select value={rol} onChange={e=>{ setRol(e.target.value); setFacId(""); }}
            style={{ padding:"10px 12px", border:"2px solid #eee", borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none", background:"#fff" }}>
            <option value="fiscal">Fiscal</option>
            <option value="publico">Público (visualizador)</option>
            <option value="admin">Admin</option>
          </select>
          {rol === "fiscal" && (
            <select value={facId} onChange={e=>setFacId(e.target.value)}
              style={{ padding:"10px 12px", border:`2px solid ${facId?"#16a085":"#e74c3c"}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none", background:"#fff" }}>
              <option value="">— Seleccioná la facultad —</option>
              {(facultades||[]).map(f => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          )}
          <Btn onClick={crear} variant="success" disabled={loading||!nombre.trim()} style={{ width:"100%" }}>
            {loading ? "Creando…" : "Generar código de acceso"}
          </Btn>
        </div>
      </Card>

      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {[["todos","Todos"],["fiscal","Fiscales"],["publico","Públicos"]].map(([v,label])=>(
          <button key={v} onClick={()=>setFiltroRol(v)} style={{
            padding:"5px 12px", border:"none", borderRadius:6, fontFamily:"inherit",
            background: filtroRol===v?"#1a1a2e":"#f1f2f6",
            color: filtroRol===v?"#fff":"#666",
            fontWeight:600, fontSize:12, cursor:"pointer",
          }}>{label}</button>
        ))}
      </div>

      <h3 style={{ fontSize:14, color:"#888", margin:"0 0 10px", fontWeight:600 }}>ACTIVOS ({activos.length})</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
        {activos.map(u => (
          <div key={u.id} style={{ background:"#fff", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 6px #0001" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:"#1a1a2e" }}>{u.nombre}</div>
              <div style={{ display:"flex", gap:8, marginTop:4, alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:10, background:rolColor[u.rol]+"20", color:rolColor[u.rol], fontWeight:700, padding:"2px 8px", borderRadius:5 }}>
                  {u.rol.toUpperCase()}
                </span>
                {u.facultad_nombre && (
                  <span style={{ fontSize:11, background:"#f1f2f6", color:"#555", padding:"2px 8px", borderRadius:5 }}>
                    📍 {u.facultad_nombre}
                  </span>
                )}
                <span style={{ fontSize:12, fontFamily:"monospace", background:"#f8f9fa", padding:"2px 8px", borderRadius:5, letterSpacing:1, color:"#333" }}>
                  {u.codigo}
                </span>
              </div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <Btn sm variant="ghost" onClick={()=>toggle(u.id, false)}>Desactivar</Btn>
              <Btn sm variant="danger" onClick={()=>eliminar(u.id)}>✕</Btn>
            </div>
          </div>
        ))}
        {activos.length===0 && <div style={{ color:"#ccc", fontSize:13, textAlign:"center", padding:20 }}>Sin usuarios activos.</div>}
      </div>

      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize:14, color:"#bbb", margin:"0 0 10px", fontWeight:600 }}>INACTIVOS ({inactivos.length})</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {inactivos.map(u => (
              <div key={u.id} style={{ background:"#f8f9fa", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", opacity:.7 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:"#aaa" }}>{u.nombre}</div>
                  <div style={{ display:"flex", gap:8, marginTop:3, alignItems:"center" }}>
                    {u.facultad_nombre && <span style={{ fontSize:11, color:"#bbb" }}>📍 {u.facultad_nombre}</span>}
                    <span style={{ fontSize:12, fontFamily:"monospace", color:"#bbb" }}>{u.codigo}</span>
                  </div>
                </div>
                <Btn sm variant="ghost" onClick={()=>toggle(u.id, true)}>Reactivar</Btn>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GestionConfig({ user, facultadesIniciales, bancasIniciales, onSaved }) {
  const [draft,  setDraft]  = useState(()=>JSON.parse(JSON.stringify(facultadesIniciales||[])));
  const [bancas, setBancas] = useState(bancasIniciales||8);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  function showToast(msg,ok=true){ setToast({msg,ok}); setTimeout(()=>setToast(null),3000); }

  const addFac   = () => setDraft([...draft, { id:"f"+Date.now(), nombre:"", mesas_centro:3, mesas_consejo:3, dias:3, listas:[], orden:draft.length }]);
  const delFac   = fid => setDraft(draft.filter(f=>f.id!==fid));
  const updFac   = (fid,k,v) => setDraft(draft.map(f=>f.id===fid?{...f,[k]:v}:f));
  const addLista = fid => setDraft(draft.map(f=>f.id===fid?{...f,listas:[...f.listas,{id:"l"+Date.now(),nombre:"",color:COLORS[f.listas.length%COLORS.length],orden:f.listas.length}]}:f));
  const delLista = (fid,lid) => setDraft(draft.map(f=>f.id===fid?{...f,listas:f.listas.filter(l=>l.id!==lid)}:f));
  const updLista = (fid,lid,k,v) => setDraft(draft.map(f=>f.id===fid?{...f,listas:f.listas.map(l=>l.id===lid?{...l,[k]:v}:l)}:f));

  async function guardar(){
    setSaving(true);
    try { await guardarConfig(user.codigo,{facultades:draft,bancas}); showToast("✓ Configuración guardada"); onSaved(); }
    catch(e){ showToast("❌ "+e.message,false); }
    finally{ setSaving(false); }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <div style={{ background:"#fff8e1",border:"1.5px solid #ffe082",borderRadius:10,padding:"11px 14px",marginBottom:18,fontSize:12,color:"#7a5c00" }}>
        ⚠️ Los cambios en nombres no borran resultados ya cargados.
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:18,background:"#fff",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 8px #0001" }}>
        <span style={{ fontSize:14,fontWeight:700,color:"#1a1a2e",flex:1 }}>Consejeros — Consejo Directivo</span>
        <input type="number" min="1" max="50" value={bancas} onChange={e=>setBancas(parseInt(e.target.value)||8)}
          style={{ width:64,padding:"7px 10px",border:"2px solid #eee",borderRadius:8,fontSize:16,fontWeight:800,fontFamily:"inherit",outline:"none",textAlign:"center",color:"#8e44ad" }} />
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:14,marginBottom:18 }}>
        {draft.map(f=>(
          <Card key={f.id} style={{ border:"2px solid #eee" }}>
            <div style={{ display:"flex",gap:8,marginBottom:10 }}>
              <input value={f.nombre} onChange={e=>updFac(f.id,"nombre",e.target.value)} placeholder="Facultad"
                style={{ flex:1,padding:"7px 10px",border:"2px solid #eee",borderRadius:8,fontSize:14,fontWeight:700,fontFamily:"inherit",outline:"none" }} />
              <Btn sm variant="danger" onClick={()=>delFac(f.id)}>✕</Btn>
            </div>

            {/* Mesas CE, Mesas CD, Días */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:11,color:"#aaa",marginBottom:4 }}>Mesas CE</div>
                <input type="number" min="0" value={f.mesas_centro||0} onChange={e=>updFac(f.id,"mesas_centro",parseInt(e.target.value)||0)}
                  style={{ width:"100%",padding:"6px 8px",border:"1.5px solid #eee",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box" }} />
              </div>
              <div>
                <div style={{ fontSize:11,color:"#aaa",marginBottom:4 }}>Mesas CD</div>
                <input type="number" min="0" value={f.mesas_consejo||0} onChange={e=>updFac(f.id,"mesas_consejo",parseInt(e.target.value)||0)}
                  style={{ width:"100%",padding:"6px 8px",border:"1.5px solid #eee",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box" }} />
              </div>
              <div>
                <div style={{ fontSize:11,color:"#aaa",marginBottom:4 }}>Días</div>
                <select value={f.dias||3} onChange={e=>updFac(f.id,"dias",parseInt(e.target.value))}
                  style={{ width:"100%",padding:"6px 8px",border:"1.5px solid #eee",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:"#fff" }}>
                  {[1,2,3,4].map(d=><option key={d} value={d}>{d} día{d!==1?"s":""}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:"flex",flexDirection:"column",gap:7,marginBottom:10 }}>
              {f.listas.map(l=>(
                <div key={l.id} style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <input type="color" value={l.color} onChange={e=>updLista(f.id,l.id,"color",e.target.value)}
                    style={{ width:28,height:28,border:"none",borderRadius:4,cursor:"pointer",padding:0 }} />
                  <input value={l.nombre} onChange={e=>updLista(f.id,l.id,"nombre",e.target.value)} placeholder="Agrupación"
                    style={{ flex:1,padding:"6px 10px",border:"1.5px solid #eee",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none" }} />
                  <Btn sm variant="ghost" onClick={()=>delLista(f.id,l.id)}>✕</Btn>
                </div>
              ))}
            </div>
            <Btn sm variant="ghost" onClick={()=>addLista(f.id)}>+ Agrupación</Btn>
          </Card>
        ))}
      </div>
      <div style={{ display:"flex",gap:10 }}>
        <Btn variant="ghost" onClick={addFac} style={{ flex:1 }}>+ Facultad</Btn>
        <Btn variant="success" onClick={guardar} disabled={saving} style={{ flex:1 }}>{saving?"Guardando…":"Guardar configuración"}</Btn>
      </div>
    </div>
  );
}

function GestionDatos({ user, exportURL }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);

  function showToast(msg,ok=true){ setToast({msg,ok}); setTimeout(()=>setToast(null),3000); }

  async function handleBorrar(){
    if(!confirm){ setConfirm(true); setTimeout(()=>setConfirm(false),5000); return; }
    setLoading(true);
    try{ await borrarResultados(user.codigo); showToast("✓ Resultados borrados"); setConfirm(false); }
    catch(e){ showToast("❌ "+e.message,false); }
    finally{ setLoading(false); }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <Card style={{ marginBottom:16 }}>
        <h3 style={{ margin:"0 0 12px",fontSize:16,color:"#1a1a2e" }}>Exportar resultados</h3>
        <p style={{ fontSize:13,color:"#888",margin:"0 0 16px" }}>CSV con todos los datos: facultad, tipo, día, mesa, agrupación, votos, blancos, nulos y quién cargó.</p>
        <a href={exportURL} download style={{ textDecoration:"none" }}>
          <Btn variant="excel" style={{ width:"100%" }}>⬇ Descargar CSV / Excel</Btn>
        </a>
      </Card>
      <Card style={{ border:"1.5px solid #fdecea" }}>
        <h3 style={{ margin:"0 0 12px",fontSize:16,color:"#e74c3c" }}>⚠️ Zona de peligro</h3>
        <p style={{ fontSize:13,color:"#888",margin:"0 0 16px" }}>Borra permanentemente todos los resultados. Usuarios y configuración no se ven afectados.</p>
        <Btn variant="danger" onClick={handleBorrar} disabled={loading} style={{ width:"100%" }}>
          {loading?"Borrando…":confirm?"⚠️ ¿Confirmar? Tocá de nuevo":"🗑 Borrar todos los resultados"}
        </Btn>
      </Card>
    </div>
  );
}
