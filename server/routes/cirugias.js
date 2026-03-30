import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const c = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".agenda_cirugias (id_paciente, procedimiento, fecha_cirugia, hora_cirugia, consultorio, estado, costo_total) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [parseInt(c.pacienteId), c.id_procedimiento || 1, c.fecha, c.hora, c.sala || 'Quirofano 1', c.estado || 'programada', c.costoTotal || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".agenda_cirugias ORDER BY id_agenda DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
