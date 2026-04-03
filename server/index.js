require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { Pool } = require("pg");
const path    = require("path");

const app  = express();
const port = process.env.PORT || 3001;

// ── DB ────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resultados (
      id          SERIAL PRIMARY KEY,
      facultad_id TEXT NOT NULL,
      facultad    TEXT NOT NULL,
      tipo        TEXT NOT NULL CHECK (tipo IN ('centro','consejo')),
      lista_id    TEXT NOT NULL,
      lista       TEXT NOT NULL,
      votos       INTEGER NOT NULL DEFAULT 0,
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(facultad_id, tipo, lista_id)
    );

    CREATE TABLE IF NOT EXISTS log (
      id         SERIAL PRIMARY KEY,
      facultad   TEXT NOT NULL,
      tipo       TEXT NOT NULL,
      ts         TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("✅ DB lista");
}

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve React build in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
}

// ── API ───────────────────────────────────────────────────────────

// GET /api/resultados → todos los resultados
app.get("/api/resultados", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM resultados ORDER BY facultad, tipo, lista");
    // Reshape to { facultad_id: { tipo: { lista_id: votos } } }
    const data = {};
    for (const row of rows) {
      if (!data[row.facultad_id]) data[row.facultad_id] = {};
      if (!data[row.facultad_id][row.tipo]) data[row.facultad_id][row.tipo] = {};
      data[row.facultad_id][row.tipo][row.lista_id] = row.votos;
    }
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/resultados → guardar resultados de una facultad/tipo
// body: { facultad_id, facultad, tipo, listas: [{ id, nombre, votos }] }
app.post("/api/resultados", async (req, res) => {
  const { facultad_id, facultad, tipo, listas } = req.body;
  if (!facultad_id || !tipo || !listas) return res.status(400).json({ error: "Datos incompletos" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const l of listas) {
      await client.query(`
        INSERT INTO resultados (facultad_id, facultad, tipo, lista_id, lista, votos, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT (facultad_id, tipo, lista_id)
        DO UPDATE SET votos=EXCLUDED.votos, updated_at=NOW()
      `, [facultad_id, facultad, tipo, l.id, l.nombre, l.votos]);
    }
    await client.query("INSERT INTO log (facultad, tipo) VALUES ($1,$2)", [facultad, tipo]);
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

// GET /api/log → historial
app.get("/api/log", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM log ORDER BY ts DESC LIMIT 200");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/resultados → reset (protegido por clave)
app.delete("/api/resultados", async (req, res) => {
  const { clave } = req.body;
  if (clave !== process.env.ADMIN_KEY) return res.status(403).json({ error: "Sin permiso" });
  try {
    await pool.query("DELETE FROM resultados");
    await pool.query("DELETE FROM log");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/export/csv → exportar CSV completo
app.get("/api/export/csv", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT facultad, tipo, lista, votos
      FROM resultados
      ORDER BY facultad, tipo, votos DESC
    `);
    const lines = ["Facultad,Tipo,Agrupación,Votos"];
    for (const r of rows) {
      lines.push(`"${r.facultad}","${r.tipo === "centro" ? "Centro de Estudiantes" : "Consejo Directivo"}","${r.lista}",${r.votos}`);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=resultados_unr.csv");
    res.send("\uFEFF" + lines.join("\n"));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback para React Router
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

// ── Start ─────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(port, () => console.log(`🚀 Servidor en puerto ${port}`));
}).catch(e => { console.error("Error iniciando DB:", e); process.exit(1); });
