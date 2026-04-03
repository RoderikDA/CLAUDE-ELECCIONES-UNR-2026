require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { Pool } = require("pg");
const path    = require("path");

const app  = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mesas (
      id          SERIAL PRIMARY KEY,
      facultad_id TEXT NOT NULL,
      facultad    TEXT NOT NULL,
      tipo        TEXT NOT NULL CHECK (tipo IN ('centro','consejo')),
      dia         INTEGER NOT NULL CHECK (dia IN (1,2,3)),
      mesa        INTEGER NOT NULL,
      lista_id    TEXT NOT NULL,
      lista       TEXT NOT NULL,
      votos       INTEGER NOT NULL DEFAULT 0,
      blancos     INTEGER NOT NULL DEFAULT 0,
      nulos       INTEGER NOT NULL DEFAULT 0,
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(facultad_id, tipo, dia, mesa, lista_id)
    );

    CREATE TABLE IF NOT EXISTS log (
      id          SERIAL PRIMARY KEY,
      facultad    TEXT NOT NULL,
      tipo        TEXT NOT NULL,
      dia         INTEGER NOT NULL,
      mesa        INTEGER NOT NULL,
      ts          TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("DB lista");
}

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
}

// GET /api/resultados
app.get("/api/resultados", async (req, res) => {
  try {
    const { rows: totales } = await pool.query(`
      SELECT facultad_id, tipo, lista_id, lista,
             SUM(votos) AS votos, SUM(blancos) AS blancos, SUM(nulos) AS nulos
      FROM mesas
      GROUP BY facultad_id, tipo, lista_id, lista
      ORDER BY facultad_id, tipo, lista
    `);

    const { rows: cargadas } = await pool.query(`
      SELECT DISTINCT facultad_id, tipo, dia, mesa
      FROM mesas ORDER BY facultad_id, tipo, dia, mesa
    `);

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

// POST /api/resultados
app.post("/api/resultados", async (req, res) => {
  const { facultad_id, facultad, tipo, dia, mesa, listas, blancos, nulos } = req.body;
  if (!facultad_id || !tipo || !dia || !mesa || !listas)
    return res.status(400).json({ error: "Datos incompletos" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const l of listas) {
      await client.query(`
        INSERT INTO mesas (facultad_id, facultad, tipo, dia, mesa, lista_id, lista, votos, blancos, nulos, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
        ON CONFLICT (facultad_id, tipo, dia, mesa, lista_id)
        DO UPDATE SET votos=EXCLUDED.votos, blancos=EXCLUDED.blancos, nulos=EXCLUDED.nulos, updated_at=NOW()
      `, [facultad_id, facultad, tipo, dia, mesa, l.id, l.nombre, l.votos||0, blancos||0, nulos||0]);
    }
    await client.query("INSERT INTO log (facultad,tipo,dia,mesa) VALUES ($1,$2,$3,$4)", [facultad,tipo,dia,mesa]);
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

// GET /api/log
app.get("/api/log", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM log ORDER BY ts DESC LIMIT 300");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/resultados
app.delete("/api/resultados", async (req, res) => {
  const { clave } = req.body;
  if (clave !== process.env.ADMIN_KEY) return res.status(403).json({ error: "Sin permiso" });
  try {
    await pool.query("DELETE FROM mesas");
    await pool.query("DELETE FROM log");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/export/csv
app.get("/api/export/csv", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT facultad, tipo, dia, mesa, lista, votos, blancos, nulos
      FROM mesas ORDER BY facultad, tipo, dia, mesa, lista
    `);
    const lines = ["Facultad,Tipo,Dia,Mesa,Agrupacion,Votos,Blancos,Nulos"];
    for (const r of rows) {
      lines.push([
        '"'+r.facultad+'"',
        '"'+(r.tipo==="centro"?"Centro de Estudiantes":"Consejo Directivo")+'"',
        r.dia, r.mesa, '"'+r.lista+'"', r.votos, r.blancos, r.nulos
      ].join(","));
    }
    res.setHeader("Content-Type","text/csv; charset=utf-8");
    res.setHeader("Content-Disposition","attachment; filename=resultados_unr.csv");
    res.send("\uFEFF"+lines.join("\n"));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

initDB().then(() => {
  app.listen(port, () => console.log("Servidor en puerto " + port));
}).catch(e => { console.error("Error iniciando DB:", e); process.exit(1); });
