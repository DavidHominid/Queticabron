import { Router } from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = Router();

// Auto-migration: ensure the table and columns exist
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}".sedes_quirurgicas (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      tipo VARCHAR(20) DEFAULT 'subrogada',
      costo_renta_estimado NUMERIC,
      ciudad VARCHAR(100),
      activa BOOLEAN DEFAULT true
    )
  `);
};

const mapRow = (row) => ({
  id: String(row.id),
  nombre: row.nombre || '',
  tipo: row.tipo || 'subrogada',
  costoRentaEstimado: row.costo_renta_estimado ? Number(row.costo_renta_estimado) : undefined,
  ciudad: row.ciudad || '',
  activa: Boolean(row.activa),
});

// GET /api/sedes — all (activas first)
router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT * FROM "${SCHEMA}".sedes_quirurgicas ORDER BY activa DESC, nombre ASC`
    );
    res.json(result.rows.map(mapRow));
  } catch (err) {
    console.error('Error GET /sedes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sedes — create
router.post('/', async (req, res) => {
  const { nombre, tipo, costoRentaEstimado, ciudad } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido.' });
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".sedes_quirurgicas (nombre, tipo, costo_renta_estimado, ciudad)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), tipo || 'subrogada', costoRentaEstimado || null, ciudad?.trim() || null]
    );
    res.status(201).json(mapRow(result.rows[0]));
  } catch (err) {
    console.error('Error POST /sedes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sedes/:id — update
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { nombre, tipo, costoRentaEstimado, ciudad, activa } = req.body;
  try {
    await ensureTable();
    const existing = await pool.query(
      `SELECT * FROM "${SCHEMA}".sedes_quirurgicas WHERE id = $1`, [id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Sede no encontrada' });
    const cur = existing.rows[0];
    const result = await pool.query(
      `UPDATE "${SCHEMA}".sedes_quirurgicas SET
         nombre = $1, tipo = $2, costo_renta_estimado = $3, ciudad = $4, activa = $5
       WHERE id = $6 RETURNING *`,
      [
        nombre?.trim() ?? cur.nombre,
        tipo ?? cur.tipo,
        costoRentaEstimado !== undefined ? costoRentaEstimado : cur.costo_renta_estimado,
        ciudad?.trim() ?? cur.ciudad,
        activa !== undefined ? Boolean(activa) : cur.activa,
        id,
      ]
    );
    res.json(mapRow(result.rows[0]));
  } catch (err) {
    console.error('Error PUT /sedes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sedes/:id — soft delete (set activa = false)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    await ensureTable();
    await pool.query(
      `UPDATE "${SCHEMA}".sedes_quirurgicas SET activa = false WHERE id = $1`, [id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error DELETE /sedes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
