require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const { Pool } = require("pg");
const path     = require("path");
const crypto   = require("crypto");

const app  = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ── DB INIT ───────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         SERIAL PRIMARY KEY,
      codigo     TEXT NOT NULL UNIQUE,
      rol        TEXT NOT NULL CHECK (rol IN ('admin','fiscal','publico')),
      nombre     TEXT NOT NULL,
      activo     BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS facultades (
      id         TEXT PRIMARY KEY,
      nombre     TEXT NOT NULL,
      orden      INTEGER DEFAULT 0,
      activa     BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS listas (
      id          TEXT PRIMARY KEY,
      facultad_id TEXT NOT NULL REFERENCES facultades(id) ON DELETE CASCADE,
      nombre      TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#7f8c8d',
      orden       INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS config (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mesas (
      id          SERIAL PRIMARY KEY,
      facultad_id TEXT NOT NULL,
      tipo        TEXT NOT NULL CHECK (tipo IN ('centro','consejo')),
      dia         INTEGER NOT NULL CHECK (dia BETWEEN 1 AND 3),
      mesa        INTEGER NOT NULL,
      lista_id    TEXT NOT NULL,
      votos       INTEGER NOT NULL DEFAULT 0,
      blancos     INTEGER NOT NULL DEFAULT 0,
      nulos       INTEGER NOT NULL DEFAULT 0,
      cargado_por TEXT,
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(facultad_id, tipo, dia, mesa, lista_id)
    );

    CREATE TABLE IF NOT EXISTS log (
      id          SERIAL PRIMARY KEY,
      facultad    TEXT NOT NULL,
      tipo        TEXT NOT NULL,
      dia         INTEGER NOT NULL,
      mesa        INTEGER NOT NULL,
      usuario     TEXT,
      ts          TIMESTAMPTZ DEFAULT NOW()
    );

    -- Config defaults
    INSERT INTO config (clave, valor) VALUES
      ('bancas_dhondt', '8'),
      ('mesas_por_defecto', '3')
    ON CONFLICT DO NOTHING;
  `);

  // Crear admin por defecto si no existe
  const { rows } = await pool.query("SELECT 1 FROM usuarios WHERE rol='admin' LIMIT 1");
  if (!rows.length) {
    const adminKey = process.env.ADMIN_KEY || "admin2026";
    await pool.query(
      "INSERT INTO usuarios (codigo, rol, nombre) VALUES ($1, 'admin', 'Administrador') ON CONFLICT DO NOTHING",
      [adminKey]
    );
    console.log(`✅ Admin creado con código: ${adminKey}`);
  }

  console.log("✅ DB lista");
}

// ── MIDDLEWARE ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
}

// Auth middleware
async function requireAuth(roles) {
  return async (req, res, next) => {
    const codigo = req.headers["x-codigo"];
    if (!codigo) return res.status(401).json({ error: "Sin autenticación" });
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE codigo=$1 AND activo=TRUE", [codigo]
    );
    if (!rows.length) return res.status(403).json({ error: "Código inválido" });
    const user = rows[0];
    if (roles && !roles.includes(user.rol)) return res.status(403).json({ error: "Sin permiso" });
    req.user = user;
    next();
  };
}

// ── AUTH ──────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { codigo, nombre } = req.body;
  if (!codigo) return res.status(400).json({ error: "Código requerido" });
  const { rows } = await pool.query(
    "SELECT * FROM usuarios WHERE codigo=$1 AND activo=TRUE", [codigo.trim().toUpperCase()]
  );
  if (!rows.length) return res.status(403).json({ error: "Código incorrecto o sin acceso" });
  const user = rows[0];
  // Si es fiscal y mandó nombre, lo guardamos en sesión (no en DB)
  res.json({ ok: true, rol: user.rol, nombre: nombre || user.nombre, codigo: user.codigo });
});

// ── FACULTADES ────────────────────────────────────────────────────
app.get("/api/facultades", async (req, res) => {
  try {
    const { rows: facs } = await pool.query(
      "SELECT * FROM facultades WHERE activa=TRUE ORDER BY orden, nombre"
    );
    const { rows: listas } = await pool.query(
      "SELECT * FROM listas ORDER BY orden, nombre"
    );
    const { rows: cfg } = await pool.query(
      "SELECT * FROM config"
    );
    const config = Object.fromEntries(cfg.map(r => [r.clave, r.valor]));

    const result = facs.map(f => ({
      ...f,
      listas: listas.filter(l => l.facultad_id === f.id),
    }));
    res.json({ facultades: result, config });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Admin: guardar config completa (facultades + listas + config global)
app.post("/api/admin/config", async (req, res) => {
  const auth = await requireAuth(["admin"])(req, res, () => {});
  if (res.headersSent) return;

  const { facultades, bancas } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Actualizar bancas
    if (bancas) {
      await client.query(
        "INSERT INTO config(clave,valor) VALUES('bancas_dhondt',$1) ON CONFLICT(clave) DO UPDATE SET valor=$1",
        [String(bancas)]
      );
    }

    // Sync facultades
    for (const f of facultades) {
      await client.query(`
        INSERT INTO facultades (id, nombre, orden, activa)
        VALUES ($1,$2,$3,TRUE)
        ON CONFLICT(id) DO UPDATE SET nombre=$2, orden=$3, activa=TRUE
      `, [f.id, f.nombre, f.orden || 0]);

      // Marcar listas viejas para esta facultad como a eliminar
      await client.query("DELETE FROM listas WHERE facultad_id=$1", [f.id]);

      for (const l of (f.listas || [])) {
        await client.query(`
          INSERT INTO listas (id, facultad_id, nombre, color, orden)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT(id) DO UPDATE SET nombre=$3, color=$4, orden=$5
        `, [l.id, f.id, l.nombre, l.color || "#7f8c8d", l.orden || 0]);
      }
    }

    // Desactivar facultades no incluidas
    const ids = facultades.map(f => f.id);
    if (ids.length) {
      await client.query(
        `UPDATE facultades SET activa=FALSE WHERE id != ALL($1::text[])`,
        [ids]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── USUARIOS (admin) ──────────────────────────────────────────────
app.get("/api/admin/usuarios", async (req, res) => {
  const auth = await requireAuth(["admin"])(req, res, () => {});
  if (res.headersSent) return;
  const { rows } = await pool.query("SELECT id,codigo,rol,nombre,activo,created_at FROM usuarios ORDER BY created_at DESC");
  res.json(rows);
});

app.post("/api/admin/usuarios", async (req, res) => {
  const auth = await requireAuth(["admin"])(req, res, () => {});
  if (res.headersSent) return;
  const { nombre, rol } = req.body;
  if (!nombre || !rol) return res.status(400).json({ error: "Faltan datos" });
  const codigo = rol.toUpperCase().slice(0, 3) + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  await pool.query(
    "INSERT INTO usuarios (codigo, rol, nombre) VALUES ($1,$2,$3)",
    [codigo, rol, nombre]
  );
  res.json({ ok: true, codigo });
});

app.patch("/api/admin/usuarios/:id", async (req, res) => {
  const auth = await requireAuth(["admin"])(req, res, () => {});
  if (res.headersSent) return;
  const { activo } = req.body;
  await pool.query("UPDATE usuarios SET activo=$1 WHERE id=$2", [activo, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/admin/usuarios/:id", async (req, res) => {
  const auth = await requireAuth(["admin"])(req, res, () => {});
  if (res.headersSent) return;
  await pool.query("DELETE FROM usuarios WHERE id=$1 AND rol != 'admin'", [req.params.id]);
  res.json({ ok: true });
});

// ── RESULTADOS ────────────────────────────────────────────────────
app.get("/api/resultados", async (req, res) => {
  const codigo = req.headers["x-codigo"];
  if (!codigo) return res.status(401).json({ error: "Sin autenticación" });
  const { rows: u } = await pool.query("SELECT rol FROM usuarios WHERE codigo=$1 AND activo=TRUE", [codigo]);
  if (!u.length) return res.status(403).json({ error: "Sin acceso" });

  try {
    const { rows: totales } = await pool.query(`
      SELECT m.facultad_id, m.tipo, m.lista_id, l.nombre as lista,
             SUM(m.votos) AS votos, SUM(m.blancos) AS blancos, SUM(m.nulos) AS nulos
      FROM mesas m
      LEFT JOIN listas l ON l.id = m.lista_id
      GROUP BY m.facultad_id, m.tipo, m.lista_id, l.nombre
    `);
    const { rows: cargadas } = await pool.query(
      "SELECT DISTINCT facultad_id, tipo, dia, mesa FROM mesas ORDER BY facultad_id, tipo, dia, mesa"
    );

    const data = {};
    for (const r of totales) {
      if (!data[r.facultad_id]) data[r.facultad_id] = {};
      if (!data[r.facultad_id][r.tipo]) data[r.facultad_id][r.tipo] = {};
      data[r.facultad_id][r.tipo][r.lista_id] = {
        votos:   parseInt(r.votos)   || 0,
        blancos: parseInt(r.blancos) || 0,
        nulos:   parseInt(r.nulos)   || 0,
      };
    }

    const mesasCargadas = {};
    for (const r of cargadas) {
      if (!mesasCargadas[r.facultad_id]) mesasCargadas[r.facultad_id] = {};
      if (!mesasCargadas[r.facultad_id][r.tipo]) mesasCargadas[r.facultad_id][r.tipo] = [];
      mesasCargadas[r.facultad_id][r.tipo].push({ dia: r.dia, mesa: r.mesa });
    }

    res.json({ data, mesasCargadas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/resultados", async (req, res) => {
  const codigo = req.headers["x-codigo"];
  const { rows: u } = await pool.query(
    "SELECT * FROM usuarios WHERE codigo=$1 AND activo=TRUE AND rol IN ('admin','fiscal')", [codigo]
  );
  if (!u.length) return res.status(403).json({ error: "Sin permiso" });

  const { facultad_id, tipo, dia, mesa, listas, blancos, nulos, usuario } = req.body;
  if (!facultad_id || !tipo || !dia || !mesa || !listas)
    return res.status(400).json({ error: "Datos incompletos" });

  // Get facultad nombre
  const { rows: fRows } = await pool.query("SELECT nombre FROM facultades WHERE id=$1", [facultad_id]);
  const facultadNombre = fRows[0]?.nombre || facultad_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const l of listas) {
      await client.query(`
        INSERT INTO mesas (facultad_id, tipo, dia, mesa, lista_id, votos, blancos, nulos, cargado_por, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
        ON CONFLICT (facultad_id, tipo, dia, mesa, lista_id)
        DO UPDATE SET votos=EXCLUDED.votos, blancos=EXCLUDED.blancos, nulos=EXCLUDED.nulos,
                      cargado_por=EXCLUDED.cargado_por, updated_at=NOW()
      `, [facultad_id, tipo, dia, mesa, l.id, l.votos || 0, blancos || 0, nulos || 0, usuario || u[0].nombre]);
    }
    await client.query(
      "INSERT INTO log (facultad, tipo, dia, mesa, usuario) VALUES ($1,$2,$3,$4,$5)",
      [facultadNombre, tipo, dia, mesa, usuario || u[0].nombre]
    );
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── LOG ───────────────────────────────────────────────────────────
app.get("/api/log", async (req, res) => {
  const codigo = req.headers["x-codigo"];
  const { rows: u } = await pool.query(
    "SELECT rol FROM usuarios WHERE codigo=$1 AND activo=TRUE", [codigo]
  );
  if (!u.length) return res.status(403).json({ error: "Sin acceso" });
  const { rows } = await pool.query("SELECT * FROM log ORDER BY ts DESC LIMIT 300");
  res.json(rows);
});

// ── ADMIN: borrar resultados ──────────────────────────────────────
app.delete("/api/admin/resultados", async (req, res) => {
  const auth = await requireAuth(["admin"])(req, res, () => {});
  if (res.headersSent) return;
  await pool.query("DELETE FROM mesas");
  await pool.query("DELETE FROM log");
  res.json({ ok: true });
});

// ── EXPORT CSV (admin only) ───────────────────────────────────────
app.get("/api/admin/export/csv", async (req, res) => {
  const codigo = req.headers["x-codigo"] || req.query.codigo;
  const { rows: u } = await pool.query(
    "SELECT rol FROM usuarios WHERE codigo=$1 AND activo=TRUE AND rol='admin'", [codigo]
  );
  if (!u.length) return res.status(403).json({ error: "Solo admin" });

  const { rows } = await pool.query(`
    SELECT f.nombre as facultad, m.tipo, m.dia, m.mesa,
           l.nombre as lista, m.votos, m.blancos, m.nulos, m.cargado_por, m.updated_at
    FROM mesas m
    LEFT JOIN facultades f ON f.id = m.facultad_id
    LEFT JOIN listas l ON l.id = m.lista_id
    ORDER BY f.nombre, m.tipo, m.dia, m.mesa, l.nombre
  `);

  const lines = ["Facultad,Tipo,Dia,Mesa,Agrupacion,Votos,Blancos,Nulos,Cargado por,Fecha"];
  for (const r of rows) {
    lines.push([
      `"${r.facultad || ''}"`,
      `"${r.tipo === "centro" ? "Centro de Estudiantes" : "Consejo Directivo"}"`,
      r.dia, r.mesa,
      `"${r.lista || ''}"`,
      r.votos, r.blancos, r.nulos,
      `"${r.cargado_por || ''}"`,
      `"${r.updated_at ? new Date(r.updated_at).toLocaleString("es-AR") : ''}"`,
    ].join(","));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=resultados_unr.csv");
  res.send("\uFEFF" + lines.join("\n"));
});

// ── FALLBACK ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

initDB().then(() => {
  app.listen(port, () => console.log(`🚀 Puerto ${port}`));
}).catch(e => { console.error("Error DB:", e); process.exit(1); });
