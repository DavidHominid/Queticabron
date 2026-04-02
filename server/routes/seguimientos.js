import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

const mapSeguimiento = (row) => ({
  id: String(row.id_nota),
  pacienteId: String(row.id_paciente || ''),
  citaId: null,
  diagnostico: row.diagnostico || '',
  observaciones: row.indicaciones || row.tratamiento || '',
  fechaCita: row.proxima_cita
    ? new Date(row.proxima_cita).toISOString().split('T')[0]
    : null,
  fechaCreacion: row.fecha
    ? new Date(row.fecha).toISOString()
    : new Date().toISOString(),
  medicoEncargado: null,
  estado: row.proxima_cita ? 'agendada' : 'pendiente',
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "${SCHEMA}".nota_medica ORDER BY id_nota DESC LIMIT 50`
    );

    res.json(result.rows.map(mapSeguimiento));
  } catch (err) {
    console.error('❌ Error en GET /api/seguimientos:', err.message);
    res.json([]);
  }
});

router.post('/', async (req, res) => {
  const s = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".nota_medica 
      (id_paciente, diagnostico, indicaciones, proxima_cita, fecha)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        parseInt(s.pacienteId) || null,
        s.diagnostico || '',
        s.observaciones || '',
        s.fechaCita || null,
        new Date(),
      ]
    );

    res.status(201).json(mapSeguimiento(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en POST /api/seguimientos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const s = req.body;

  try {
    const result = await pool.query(
      `UPDATE "${SCHEMA}".nota_medica
       SET diagnostico = $1,
           indicaciones = $2,
           proxima_cita = $3
       WHERE id_nota = $4
       RETURNING *`,
      [
        s.diagnostico || '',
        s.observaciones || '',
        s.fechaCita || null,
        parseInt(id),
      ]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: 'Seguimiento no encontrado' });

    res.json(mapSeguimiento(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en PUT /api/seguimientos/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;