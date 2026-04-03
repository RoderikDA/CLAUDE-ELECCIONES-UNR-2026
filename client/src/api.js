const BASE = "/api";

export async function getResultados() {
  const r = await fetch(`${BASE}/resultados`);
  if (!r.ok) throw new Error("Error cargando resultados");
  return r.json();
}

export async function postResultados(payload) {
  const r = await fetch(`${BASE}/resultados`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Error guardando resultados");
  return r.json();
}

export async function getLog() {
  const r = await fetch(`${BASE}/log`);
  if (!r.ok) throw new Error("Error cargando log");
  return r.json();
}

export async function deleteResultados(clave) {
  const r = await fetch(`${BASE}/resultados`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clave }),
  });
  if (!r.ok) throw new Error("Clave incorrecta o error del servidor");
  return r.json();
}

export function exportCSVUrl() {
  return `${BASE}/export/csv`;
}
