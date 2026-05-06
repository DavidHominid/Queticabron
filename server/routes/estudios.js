import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

const ensureTable = async () => {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS "${SCHEMA}".estudios (
      id SERIAL PRIMARY KEY,
      id_paciente INTEGER,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    `,
  );
};

ensureTable().catch((err) => {
  console.error('❌ Error creando tabla estudios:', err.message);
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, id_paciente, payload FROM "${SCHEMA}".estudios ORDER BY id DESC`);
    const estudios = (result.rows || [])
      .map((r) => ({
        id: String(r.id),
        pacienteId: r.id_paciente != null ? String(r.id_paciente) : '',
        ...(r.payload || {}),
      }))
      .filter((x) => Boolean(x && (x.realizadoPor || x.realizado_por)));
    res.json(estudios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const estudio = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".estudios (id_paciente, payload, updated_at) VALUES ($1, $2::jsonb, NOW()) RETURNING id, id_paciente, payload`,
      [Number.isFinite(Number(estudio.pacienteId)) ? parseInt(String(estudio.pacienteId)) : null, JSON.stringify(estudio)]
    );
    const row = result.rows[0] || null;
    res.status(201).json({ ...(row?.payload || estudio), id: String(row?.id || ''), pacienteId: row?.id_paciente != null ? String(row.id_paciente) : '' });
  } catch (err) {
    console.error('❌ Error en POST /api/estudios:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
