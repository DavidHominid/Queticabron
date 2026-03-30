import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapEvento } from '../helpers/utils.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const e = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".eventos (titulo, descripcion, ubicacion, fecha_inicio, fecha_fin, estado, especialidades) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [e.nombre, e.descripcion || '', e.ciudad || 'Sonoyta', e.fechaInicio, e.fechaFin, e.estado || 'activo', JSON.stringify(e.especialidades || [])]
    );
    res.status(201).json(mapEvento(result.rows[0]));
  } catch (err) {
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
    res.json(mapEvento(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".eventos`);
    res.json(result.rows.map(mapEvento));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
