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
  ssl: process.env.DISABLE_SSL ? false : (process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false),
});

async function initDB() {
  console.log("Verificando estructura DB...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          SERIAL PRIMARY KEY,
      codigo      TEXT NOT NULL UNIQUE,
      rol         TEXT NOT NULL CHECK (rol IN ('admin','fiscal','publico')),
      nombre      TEXT NOT NULL,
      facultad_id TEXT DEFAULT NULL,
      activo      BOOLEAN DEFAULT TRUE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Migración: agregar facultad_id si no existe
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS facultad_id TEXT DEFAULT NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS facultades (
      id            TEXT PRIMARY KEY,
      nombre        TEXT NOT NULL,
      mesas_centro  INTEGER DEFAULT 3,
      mesas_consejo INTEGER DEFAULT 3,
      orden         INTEGER DEFAULT 0,
      activa        BOOLEAN DEFAULT TRUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS listas (
      id          TEXT PRIMARY KEY,
      facultad_id TEXT NOT NULL REFERENCES facultades(id) ON DELETE CASCADE,
      nombre      TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#7f8c8d',
      orden       INTEGER DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS config (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    )
  `);

  await pool.query(`
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
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS log (
      id       SERIAL PRIMARY KEY,
      facultad TEXT NOT NULL,
      tipo     TEXT NOT NULL,
      dia      INTEGER NOT NULL,
      mesa     INTEGER NOT NULL,
      usuario  TEXT,
      ts       TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    INSERT INTO config (clave, valor) VALUES
      ('bancas_dhondt', '8'),
      ('mesas_por_defecto', '3')
    ON CONFLICT DO NOTHING
  `);

  const { rows: admins } = await pool.query("SELECT 1 FROM usuarios WHERE rol='admin' LIMIT 1");
  if (!admins.length) {
    const adminKey = (process.env.ADMIN_KEY || "ADMIN2026").toUpperCase();
    await pool.query(
      "INSERT INTO usuarios (codigo, rol, nombre) VALUES ($1, 'admin', 'Administrador') ON CONFLICT DO NOTHING",
      [adminKey]
    );
    console.log("Admin creado con codigo: " + adminKey);
  }

  const { rows: facRows } = await pool.query("SELECT 1 FROM facultades LIMIT 1");
  if (!facRows.length) await seedFacultades();

  console.log("DB lista.");
}

async function seedFacultades() {
  const facultades = [
    { id:"fcpolit",     nombre:"FCPolit",      mc:3,  mcd:3,  orden:1,
      listas:[["Franja Morada","#e74c3c"],["FEU","#2980b9"],["Frejuni","#1abc9c"],["FEP","#e67e22"],["CINCEL","#8e44ad"],["FIT","#c0392b"],["Alternativa","#f39c12"],["UPL","#16a085"]] },
    { id:"psico",       nombre:"Psicología",   mc:5,  mcd:5,  orden:2,
      listas:[["Pulsión","#9b59b6"],["FEU","#2980b9"],["Masotta","#2ecc71"],["Construcción","#e74c3c"],["Tupac","#d35400"],["FIT","#c0392b"]] },
    { id:"fapyd",       nombre:"FAPyD",        mc:4,  mcd:4,  orden:3,
      listas:[["Franja Morada","#e74c3c"],["Alde","#27ae60"],["Dominó","#2c3e50"],["Área","#7f8c8d"]] },
    { id:"fceia",       nombre:"FCEIA",        mc:4,  mcd:3,  orden:4,
      listas:[["Corriente Estudiantil","#3498db"],["Alde","#27ae60"],["15 de Junio","#e74c3c"],["UPL","#16a085"],["Alternativa","#f39c12"]] },
    { id:"medicina",    nombre:"Medicina",     mc:15, mcd:15, orden:5,
      listas:[["Impulso","#e74c3c"],["Alde","#27ae60"],["MNR","#8e44ad"],["ATP (K)","#2ecc71"],["JUP","#2980b9"]] },
    { id:"derecho",     nombre:"Derecho",      mc:2,  mcd:9,  orden:6,
      listas:[["Franja Morada","#e74c3c"],["Frente Patria","#f39c12"],["DNI","#1abc9c"],["1983","#e67e22"],["Alternativa","#f39c12"],["Universitarios x la Libertad","#7f8c8d"],["Alde","#27ae60"]] },
    { id:"eco",         nombre:"Económicas",   mc:12, mcd:12, orden:7,
      listas:[["Franja Morada","#e74c3c"],["GPS","#3498db"],["UPL","#16a085"],["Güemes","#c0392b"],["ALDE","#27ae60"],["Alberdi","#8e44ad"]] },
    { id:"humanidades", nombre:"Humanidades",  mc:8,  mcd:8,  orden:8,
      listas:[["SOMOS","#e74c3c"],["Pampillón","#2980b9"],["Oktubre + MUE","#27ae60"],["Mate Cocido","#e67e22"],["Tupac","#d35400"],["Frente de Estudiantes de Izquierda","#c0392b"]] },
    { id:"bioquimica",  nombre:"Bioquímica",   mc:4,  mcd:4,  orden:9,
      listas:[["Franja Morada","#e74c3c"],["Nueve de Julio","#3498db"]] },
    { id:"veterinaria", nombre:"Veterinaria",  mc:1,  mcd:1,  orden:10,
      listas:[["Unidad Veterinaria","#16a085"],["ADN","#e74c3c"]] },
    { id:"agrarias",    nombre:"Agrarias",     mc:1,  mcd:1,  orden:11,
      listas:[["Estudiantes Independientes","#7f8c8d"]] },
  ];

  for (const f of facultades) {
    await pool.query(
      "INSERT INTO facultades (id,nombre,mesas_centro,mesas_consejo,orden,activa) VALUES ($1,$2,$3,$4,$5,TRUE) ON CONFLICT DO NOTHING",
      [f.id, f.nombre, f.mc, f.mcd, f.orden]
    );
    for (let i = 0; i < f.listas.length; i++) {
      const [nombre, color] = f.listas[i];
      await pool.query(
        "INSERT INTO listas (id,facultad_id,nombre,color,orden) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [`${f.id}_l${i}`, f.id, nombre, color, i]
      );
    }
  }
  console.log("Facultades UNR cargadas");
}

app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
}

async function requireAuth(req, res, roles) {
  const codigo = req.headers["x-codigo"];
  if (!codigo) { res.status(401).json({ error: "Sin autenticación" }); return false; }
  const { rows } = await pool.query(
    "SELECT * FROM usuarios WHERE codigo=$1 AND activo=TRUE", [codigo]
  );
  if (!rows.length) { res.status(403).json({ error: "Código inválido o desactivado" }); return false; }
  if (roles && !roles.includes(rows[0].rol)) { res.status(403).json({ error: "Sin permiso" }); return false; }
  req.user = rows[0];
  return true;
}

// ── AUTH ──────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { codigo, nombre } = req.body;
    if (!codigo) return res.status(400).json({ error: "Código requerido" });
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE codigo=$1 AND activo=TRUE",
      [codigo.trim().toUpperCase()]
    );
    if (!rows.length) return res.status(403).json({ error: "Código incorrecto o sin acceso" });
    res.json({
      ok: true,
      rol: rows[0].rol,
      nombre: nombre || rows[0].nombre,
      codigo: rows[0].codigo,
      facultad_id: rows[0].facultad_id || null,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── FACULTADES ────────────────────────────────────────────────────
app.get("/api/facultades", async (req, res) => {
  try {
    if (!await requireAuth(req, res, null)) return;
    const user = req.user;

    // Fiscal: solo su facultad
    let facQuery = "SELECT * FROM facultades WHERE activa=TRUE ORDER BY orden,nombre";
    let facParams = [];
    if (user.rol === "fiscal" && user.facultad_id) {
      facQuery = "SELECT * FROM facultades WHERE id=$1 AND activa=TRUE";
      facParams = [user.facultad_id];
    }

    const { rows: facs }   = await pool.query(facQuery, facParams);
    const { rows: listas } = await pool.query("SELECT * FROM listas ORDER BY orden,nombre");
    const { rows: cfg }    = await pool.query("SELECT * FROM config");
    const config = Object.fromEntries(cfg.map(r => [r.clave, r.valor]));
    res.json({ facultades: facs.map(f => ({ ...f, listas: listas.filter(l => l.facultad_id===f.id) })), config });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── ADMIN CONFIG ──────────────────────────────────────────────────
app.post("/api/admin/config", async (req, res) => {
  try {
    if (!await requireAuth(req, res, ["admin"])) return;
    const { facultades, bancas } = req.body;
    if (!facultades) return res.status(400).json({ error: "Faltan facultades" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (bancas) {
        await client.query(
          "INSERT INTO config(clave,valor) VALUES('bancas_dhondt',$1) ON CONFLICT(clave) DO UPDATE SET valor=$1",
          [String(bancas)]
        );
      }
      for (const f of facultades) {
        await client.query(`
          INSERT INTO facultades (id,nombre,mesas_centro,mesas_consejo,orden,activa)
          VALUES ($1,$2,$3,$4,$5,TRUE)
          ON CONFLICT(id) DO UPDATE SET nombre=$2,mesas_centro=$3,mesas_consejo=$4,orden=$5,activa=TRUE
        `, [f.id, f.nombre, f.mesas_centro||3, f.mesas_consejo||3, f.orden||0]);
        await client.query("DELETE FROM listas WHERE facultad_id=$1", [f.id]);
        for (let i=0; i<(f.listas||[]).length; i++) {
          const l = f.listas[i];
          await client.query(
            "INSERT INTO listas (id,facultad_id,nombre,color,orden) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET nombre=$3,color=$4,orden=$5",
            [l.id, f.id, l.nombre, l.color||"#7f8c8d", i]
          );
        }
      }
      const ids = facultades.map(f => f.id);
      if (ids.length) await client.query("UPDATE facultades SET activa=FALSE WHERE id!=ALL($1::text[])", [ids]);
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── USUARIOS ──────────────────────────────────────────────────────
app.get("/api/admin/usuarios", async (req, res) => {
  try {
    if (!await requireAuth(req, res, ["admin"])) return;
    const { rows } = await pool.query(`
      SELECT u.id, u.codigo, u.rol, u.nombre, u.facultad_id, u.activo, u.created_at,
             f.nombre as facultad_nombre
      FROM usuarios u
      LEFT JOIN facultades f ON f.id = u.facultad_id
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/usuarios", async (req, res) => {
  try {
    if (!await requireAuth(req, res, ["admin"])) return;
    const { nombre, rol, facultad_id } = req.body;
    if (!nombre||!rol) return res.status(400).json({ error: "Faltan datos" });
    if (rol === "fiscal" && !facultad_id) return res.status(400).json({ error: "El fiscal necesita una facultad" });
    const codigo = rol.toUpperCase().slice(0,3)+"-"+crypto.randomBytes(3).toString("hex").toUpperCase();
    await pool.query(
      "INSERT INTO usuarios (codigo,rol,nombre,facultad_id) VALUES ($1,$2,$3,$4)",
      [codigo, rol, nombre, facultad_id || null]
    );
    res.json({ ok:true, codigo });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/admin/usuarios/:id", async (req, res) => {
  try {
    if (!await requireAuth(req, res, ["admin"])) return;
    const { activo } = req.body;
    await pool.query("UPDATE usuarios SET activo=$1 WHERE id=$2", [activo, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/admin/usuarios/:id", async (req, res) => {
  try {
    if (!await requireAuth(req, res, ["admin"])) return;
    await pool.query("DELETE FROM usuarios WHERE id=$1 AND rol!='admin'", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── RESULTADOS ────────────────────────────────────────────────────
app.get("/api/resultados", async (req, res) => {
  try {
    if (!await requireAuth(req, res, null)) return;
    const user = req.user;

    // Fiscal: filtrar por su facultad
    const facFilter = (user.rol === "fiscal" && user.facultad_id)
      ? "WHERE m.facultad_id = $1" : "";
    const facFilterSimple = (user.rol === "fiscal" && user.facultad_id)
      ? "WHERE facultad_id = $1" : "";
    const facParam  = (user.rol === "fiscal" && user.facultad_id)
      ? [user.facultad_id] : [];

    const { rows: totales } = await pool.query(`
      SELECT m.facultad_id, m.tipo, m.lista_id, l.nombre as lista,
             SUM(m.votos) AS votos, SUM(m.blancos) AS blancos, SUM(m.nulos) AS nulos
      FROM mesas m LEFT JOIN listas l ON l.id=m.lista_id
      ${facFilter}
      GROUP BY m.facultad_id, m.tipo, m.lista_id, l.nombre
    `, facParam);

    const { rows: cargadas } = await pool.query(`
      SELECT DISTINCT facultad_id, tipo, dia, mesa FROM mesas
      ${facFilterSimple}
      ORDER BY facultad_id,tipo,dia,mesa
    `, facParam);

    const data = {};
    for (const r of totales) {
      if (!data[r.facultad_id]) data[r.facultad_id] = {};
      if (!data[r.facultad_id][r.tipo]) data[r.facultad_id][r.tipo] = {};
      data[r.facultad_id][r.tipo][r.lista_id] = {
        votos:parseInt(r.votos)||0, blancos:parseInt(r.blancos)||0, nulos:parseInt(r.nulos)||0,
      };
    }
    const mesasCargadas = {};
    for (const r of cargadas) {
      if (!mesasCargadas[r.facultad_id]) mesasCargadas[r.facultad_id] = {};
      if (!mesasCargadas[r.facultad_id][r.tipo]) mesasCargadas[r.facultad_id][r.tipo] = [];
      mesasCargadas[r.facultad_id][r.tipo].push({ dia:r.dia, mesa:r.mesa });
    }
    res.json({ data, mesasCargadas });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.post("/api/resultados", async (req, res) => {
  try {
    if (!await requireAuth(req, res, ["admin","fiscal"])) return;
    const { facultad_id, tipo, dia, mesa, listas, blancos, nulos, usuario } = req.body;
    if (!facultad_id||!tipo||!dia||!mesa||!listas) return res.status(400).json({ error: "Datos incompletos" });

    // Fiscal solo puede cargar su facultad
    if (req.user.rol === "fiscal" && req.user.facultad_id && req.user.facultad_id !== facultad_id) {
      return res.status(403).json({ error: "Solo podés cargar tu facultad asignada" });
    }

    const { rows: fRows } = await pool.query("SELECT nombre FROM facultades WHERE id=$1", [facultad_id]);
    const facultadNombre = fRows[0]?.nombre || facultad_id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const l of listas) {
        await client.query(`
          INSERT INTO mesas (facultad_id,tipo,dia,mesa,lista_id,votos,blancos,nulos,cargado_por,updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
          ON CONFLICT (facultad_id,tipo,dia,mesa,lista_id)
          DO UPDATE SET votos=EXCLUDED.votos,blancos=EXCLUDED.blancos,nulos=EXCLUDED.nulos,
                        cargado_por=EXCLUDED.cargado_por,updated_at=NOW()
        `, [facultad_id,tipo,dia,mesa,l.id,l.votos||0,blancos||0,nulos||0,usuario||req.user.nombre]);
      }
      await client.query(
        "INSERT INTO log (facultad,tipo,dia,mesa,usuario) VALUES ($1,$2,$3,$4,$5)",
        [facultadNombre,tipo,dia,mesa,usuario||req.user.nombre]
      );
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── LOG ───────────────────────────────────────────────────────────
app.get("/api/log", async (req, res) => {
  try {
    if (!await requireAuth(req, res, null)) return;
    const user = req.user;

    // Fiscal: solo log de su facultad
    if (user.rol === "fiscal" && user.facultad_id) {
      const { rows: fRows } = await pool.query("SELECT nombre FROM facultades WHERE id=$1", [user.facultad_id]);
      const fNombre = fRows[0]?.nombre;
      const { rows } = await pool.query(
        "SELECT * FROM log WHERE facultad=$1 ORDER BY ts DESC LIMIT 300", [fNombre]
      );
      return res.json(rows);
    }

    const { rows } = await pool.query("SELECT * FROM log ORDER BY ts DESC LIMIT 300");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN BORRAR ──────────────────────────────────────────────────
app.delete("/api/admin/resultados", async (req, res) => {
  try {
    if (!await requireAuth(req, res, ["admin"])) return;
    await pool.query("DELETE FROM mesas");
    await pool.query("DELETE FROM log");
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── EXPORT CSV ────────────────────────────────────────────────────
app.get("/api/admin/export/csv", async (req, res) => {
  try {
    const codigo = req.headers["x-codigo"] || req.query.codigo;
    const { rows: u } = await pool.query(
      "SELECT rol FROM usuarios WHERE codigo=$1 AND activo=TRUE AND rol='admin'", [codigo]
    );
    if (!u.length) return res.status(403).json({ error: "Solo admin" });
    const { rows } = await pool.query(`
      SELECT f.nombre as facultad, m.tipo, m.dia, m.mesa,
             l.nombre as lista, m.votos, m.blancos, m.nulos, m.cargado_por, m.updated_at
      FROM mesas m
      LEFT JOIN facultades f ON f.id=m.facultad_id
      LEFT JOIN listas l ON l.id=m.lista_id
      ORDER BY f.nombre,m.tipo,m.dia,m.mesa,l.nombre
    `);
    const lines = ["Facultad,Tipo,Dia,Mesa,Agrupacion,Votos,Blancos,Nulos,Cargado por,Fecha"];
    for (const r of rows) {
      lines.push([
        `"${r.facultad||''}"`,
        `"${r.tipo==="centro"?"Centro de Estudiantes":"Consejo Directivo"}"`,
        r.dia, r.mesa, `"${r.lista||''}"`,
        r.votos, r.blancos, r.nulos,
        `"${r.cargado_por||''}"`,
        `"${r.updated_at?new Date(r.updated_at).toLocaleString("es-AR"):''}"`,
      ].join(","));
    }
    res.setHeader("Content-Type","text/csv; charset=utf-8");
    res.setHeader("Content-Disposition","attachment; filename=resultados_unr.csv");
    res.send("\uFEFF"+lines.join("\n"));
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

initDB().then(() => {
  app.listen(port, () => console.log("Servidor en puerto " + port));
}).catch(e => { console.error("Error iniciando DB:", e); process.exit(1); });
