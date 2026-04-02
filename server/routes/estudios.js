import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".expediente ORDER BY id_expediente DESC`);
    const estudios = result.rows
      .filter((row) => {
        try {
          const parsed = JSON.parse(row.notas || '');
          return parsed && parsed.realizadoPor;
        } catch {
          return false;
        }
      })
      .map((row) => {
        const parsed = JSON.parse(row.notas);
        return { ...parsed, id: String(row.id_expediente) };
      });
    res.json(estudios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const estudio = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".expediente (id_paciente, notas) VALUES ($1, $2) RETURNING *`,
      [parseInt(estudio.pacienteId) || null, JSON.stringify(estudio)]
    );
    const row = result.rows[0];
    res.status(201).json({ ...estudio, id: String(row.id_expediente) });
  } catch (err) {
    console.error('❌ Error en POST /api/estudios:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
