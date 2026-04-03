const BASE = "/api";

function headers(codigo) {
  return { "Content-Type": "application/json", "x-codigo": codigo || "" };
}

export async function login(codigo, nombre) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo: codigo.trim().toUpperCase(), nombre }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Error");
  return data;
}

export async function getFacultades(codigo) {
  const r = await fetch(`${BASE}/facultades`, { headers: headers(codigo) });
  if (!r.ok) throw new Error("Error cargando facultades");
  return r.json();
}

export async function getResultados(codigo) {
  const r = await fetch(`${BASE}/resultados`, { headers: headers(codigo) });
  if (!r.ok) throw new Error("Error cargando resultados");
  return r.json();
}

export async function postResultados(codigo, payload) {
  const r = await fetch(`${BASE}/resultados`, {
    method: "POST",
    headers: headers(codigo),
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
  return r.json();
}

export async function getLog(codigo) {
  const r = await fetch(`${BASE}/log`, { headers: headers(codigo) });
  if (!r.ok) throw new Error("Error cargando historial");
  return r.json();
}

// Admin
export async function getUsuarios(codigo) {
  const r = await fetch(`${BASE}/admin/usuarios`, { headers: headers(codigo) });
  if (!r.ok) throw new Error("Sin permiso");
  return r.json();
}

export async function crearUsuario(codigo, nombre, rol, facultad_id) {
  const r = await fetch(`${BASE}/admin/usuarios`, {
    method: "POST", headers: headers(codigo),
    body: JSON.stringify({ nombre, rol, facultad_id }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}

export async function toggleUsuario(codigo, id, activo) {
  const r = await fetch(`${BASE}/admin/usuarios/${id}`, {
    method: "PATCH", headers: headers(codigo),
    body: JSON.stringify({ activo }),
  });
  return r.json();
}

export async function eliminarUsuario(codigo, id) {
  const r = await fetch(`${BASE}/admin/usuarios/${id}`, {
    method: "DELETE", headers: headers(codigo),
  });
  return r.json();
}

export async function guardarConfig(codigo, payload) {
  const r = await fetch(`${BASE}/admin/config`, {
    method: "POST", headers: headers(codigo),
    body: JSON.stringify(payload),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}

export async function borrarResultados(codigo) {
  const r = await fetch(`${BASE}/admin/resultados`, {
    method: "DELETE", headers: headers(codigo),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}

export function exportURL(codigo) {
  return `${BASE}/admin/export/csv?codigo=${encodeURIComponent(codigo)}`;
}
