import { Router } from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = Router();

// ── Auto-migration ──────────────────────────────────────────────────────────
const ensureTable = async () => {
  // Main sedes table — activa=false by default so new sedes start inactive
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}".sedes_quirurgicas (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      tipo VARCHAR(20) DEFAULT 'subrogada',
      costo_renta_estimado NUMERIC,
      ciudad VARCHAR(100),
      activa BOOLEAN DEFAULT false
    )
  `);

  // Migration: if existing table has activa DEFAULT true, keep existing rows as-is
  // but ensure the column exists
  await pool.query(`
    ALTER TABLE "${SCHEMA}".sedes_quirurgicas
      ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT false
  `).catch(() => {});

  // Periodos de disponibilidad
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}".sedes_disponibilidad (
      id SERIAL PRIMARY KEY,
      sede_id INTEGER NOT NULL REFERENCES "${SCHEMA}".sedes_quirurgicas(id) ON DELETE CASCADE,
      fecha_inicio DATE NOT NULL,
      fecha_fin DATE NOT NULL,
      notas VARCHAR(255),
      CONSTRAINT chk_fechas CHECK (fecha_fin >= fecha_inicio)
    )
  `);
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const mapRow = (row, disponibleHoy = false, periodos = undefined) => ({
  id: String(row.id),
  nombre: row.nombre || '',
  tipo: row.tipo || 'subrogada',
  costoRentaEstimado: row.costo_renta_estimado ? Number(row.costo_renta_estimado) : undefined,
  ciudad: row.ciudad || '',
  activa: Boolean(row.activa),
  disponibleHoy,
  ...(periodos !== undefined ? { periodos } : {}),
});

const mapPeriodo = (row) => ({
  id: String(row.id),
  sedeId: String(row.sede_id),
  fechaInicio: row.fecha_inicio instanceof Date
    ? row.fecha_inicio.toISOString().slice(0, 10)
    : String(row.fecha_inicio).slice(0, 10),
  fechaFin: row.fecha_fin instanceof Date
    ? row.fecha_fin.toISOString().slice(0, 10)
    : String(row.fecha_fin).slice(0, 10),
  notas: row.notas || '',
});

// Resolve if a sede is available on a given date (default: today)
const isDisponible = async (sedeId, dateStr) => {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  const res = await pool.query(
    `SELECT 1 FROM "${SCHEMA}".sedes_disponibilidad
     WHERE sede_id = $1
       AND fecha_inicio <= $2::date
       AND fecha_fin    >= $2::date
     LIMIT 1`,
    [sedeId, date]
  );
  return res.rows.length > 0;
};

// ── GET /api/sedes — all sedes, with disponibleHoy computed ─────────────────
router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT s.*,
              EXISTS (
                SELECT 1 FROM "${SCHEMA}".sedes_disponibilidad d
                WHERE d.sede_id = s.id
                  AND d.fecha_inicio <= $1::date
                  AND d.fecha_fin    >= $1::date
              ) AS disponible_hoy
       FROM "${SCHEMA}".sedes_quirurgicas s
       ORDER BY disponible_hoy DESC, s.activa DESC, s.nombre ASC`,
      [today]
    );
    res.json(result.rows.map(r => mapRow(r, Boolean(r.disponible_hoy))));
  } catch (err) {
    console.error('Error GET /sedes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sedes — create (activa = false until a period is added) ────────
router.post('/', async (req, res) => {
  const { nombre, tipo, costoRentaEstimado, ciudad } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido.' });
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".sedes_quirurgicas (nombre, tipo, costo_renta_estimado, ciudad, activa)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [nombre.trim(), tipo || 'subrogada', costoRentaEstimado || null, ciudad?.trim() || null]
    );
    res.status(201).json(mapRow(result.rows[0], false));
  } catch (err) {
    console.error('Error POST /sedes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/sedes/:id — update metadata ────────────────────────────────────
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
    const today = new Date().toISOString().slice(0, 10);
    const disp = await isDisponible(id, today);
    res.json(mapRow(result.rows[0], disp));
  } catch (err) {
    console.error('Error PUT /sedes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/sedes/:id — soft delete (activa = false) ────────────────────
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

// ── GET /api/sedes/:id/periodos ──────────────────────────────────────────────
router.get('/:id/periodos', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT * FROM "${SCHEMA}".sedes_disponibilidad
       WHERE sede_id = $1
       ORDER BY fecha_inicio ASC`,
      [id]
    );
    res.json(result.rows.map(mapPeriodo));
  } catch (err) {
    console.error('Error GET /sedes/:id/periodos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sedes/:id/periodos — add availability period ──────────────────
router.post('/:id/periodos', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { fechaInicio, fechaFin, notas } = req.body;
  if (!fechaInicio || !fechaFin) return res.status(400).json({ error: 'fechaInicio y fechaFin son requeridas.' });
  if (fechaFin < fechaInicio) return res.status(400).json({ error: 'fechaFin debe ser >= fechaInicio.' });
  try {
    await ensureTable();
    // Verify sede exists
    const check = await pool.query(`SELECT id FROM "${SCHEMA}".sedes_quirurgicas WHERE id = $1`, [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Sede no encontrada.' });
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".sedes_disponibilidad (sede_id, fecha_inicio, fecha_fin, notas)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, fechaInicio, fechaFin, notas?.trim() || null]
    );
    res.status(201).json(mapPeriodo(result.rows[0]));
  } catch (err) {
    console.error('Error POST /sedes/:id/periodos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/sedes/periodos/:periodoId — remove a period ─────────────────
router.delete('/periodos/:periodoId', async (req, res) => {
  const periodoId = parseInt(req.params.periodoId);
  if (isNaN(periodoId)) return res.status(400).json({ error: 'ID de periodo inválido' });
  try {
    await ensureTable();
    await pool.query(`DELETE FROM "${SCHEMA}".sedes_disponibilidad WHERE id = $1`, [periodoId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error DELETE /sedes/periodos/:periodoId:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
