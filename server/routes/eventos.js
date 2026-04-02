import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapEvento } from '../helpers/utils.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const e = req.body;
  try {
    const eventId = e.id || `evt${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".eventos (id, titulo, descripcion, ubicacion, fecha_inicio, fecha_fin, estado, especialidades) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [eventId, e.nombre, e.descripcion || '', e.ciudad || 'Sonoyta', e.fechaInicio, e.fechaFin, e.estado || 'activo', JSON.stringify(e.especialidades || [])]
    );
    res.status(201).json(mapEvento(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en POST /api/eventos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const e = req.body;
  try {
    const result = await pool.query(
      `UPDATE "${SCHEMA}".eventos SET titulo = $1, ubicacion = $2, fecha_inicio = $3, fecha_fin = $4, estado = $5, especialidades = $6 WHERE id = $7 RETURNING *`,
      [e.nombre, e.ciudad, e.fechaInicio, e.fechaFin, e.estado, JSON.stringify(e.especialidades || []), id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(mapEvento(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en PUT /api/eventos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".eventos ORDER BY fecha_inicio DESC`);
    res.json(result.rows.map(mapEvento));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
