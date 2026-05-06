import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

const ensureTable = async () => {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS "${SCHEMA}".expediente (
      id SERIAL PRIMARY KEY,
      id_cita INTEGER NOT NULL,
      id_paciente INTEGER NOT NULL,
      triage JSONB,
      consulta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (id_cita)
    )
    `,
  );
};

ensureTable().catch((err) => {
  console.error('❌ Error creando tabla expediente:', err.message);
});

const mapRow = (r) => ({
  id: String(r.id),
  citaId: String(r.id_cita),
  pacienteId: String(r.id_paciente),
  triageData:
    r.triage && (r.triage.signosVitales || r.triage.signos_vitales)
      ? r.triage.signosVitales || r.triage.signos_vitales
      : r.triage || null,
  consultaData: r.consulta || null,
  createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
});

router.get('/', async (req, res) => {
  try {
    const pacienteIdRaw = req.query.pacienteId;
    const citaIdRaw = req.query.citaId;
    const pacienteId = Number.isFinite(Number(pacienteIdRaw)) ? parseInt(String(pacienteIdRaw)) : null;
    const citaId = Number.isFinite(Number(citaIdRaw)) ? parseInt(String(citaIdRaw)) : null;

    const where = [];
    const values = [];
    if (pacienteId) {
      values.push(pacienteId);
      where.push(`id_paciente = $${values.length}`);
    }
    if (citaId) {
      values.push(citaId);
      where.push(`id_cita = $${values.length}`);
    }

    const runSelect = async (table) => {
      if (table !== 'expediente' && table !== 'expediente_cita') {
        throw new Error('Tabla de expediente no soportada');
      }
      const sql = `
        SELECT id, id_cita, id_paciente, triage, consulta, created_at, updated_at
        FROM "${SCHEMA}"."${table}"
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY id_cita DESC
      `;
      return pool.query(sql, values);
    };

    let result;
    try {
      result = await runSelect('expediente');
    } catch (err) {
      const isUndefinedTable =
        err && (err.code === '42P01' || String(err.message || '').toLowerCase().includes('does not exist'));
      if (isUndefinedTable) {
        result = await runSelect('expediente_cita');
      } else {
        throw err;
      }
    }

    res.json((result.rows || []).map(mapRow));
  } catch (err) {
    console.error('❌ Error en GET /api/expediente:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
