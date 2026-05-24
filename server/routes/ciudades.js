import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

const normalizarCodigo = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

router.get('/buscar', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (query.length < 3) {
    return res.json([]);
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=40&countrycodes=mx,us`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WordsOfHopeScheduler/1.0 (info@wordsofhope.org)',
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Nominatim error: ${response.statusText}` });
    }
    const data = await response.json();
    const filtered = data
      .filter((item) => item.class === 'place' || item.class === 'boundary')
      .map((item) => {
        const city = item.address.city || item.address.town || item.address.village || item.address.municipality || item.name;
        const state = item.address.state;
        return city && state ? `${city}, ${state}` : item.display_name.split(',').slice(0, 2).join(',').trim();
      })
      .filter(Boolean);
    // Deduplicate and limit to 8
    const results = Array.from(new Set(filtered)).slice(0, 8);
    res.json(results);
  } catch (err) {
    console.error('Error buscando ciudades en Nominatim:', err.message);
    res.status(500).json({ error: 'Error al buscar ciudades' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT codigo, nombre, activa
       FROM "${SCHEMA}".ciudades
       ORDER BY nombre ASC`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const codigo = normalizarCodigo(req.body?.codigo);
  const nombre = String(req.body?.nombre || '').trim();

  if (!codigo) return res.status(400).json({ error: 'El código es obligatorio.' });
  if (codigo === 'otra' || codigo === 'otras') return res.status(400).json({ error: 'El código "otra" no está permitido.' });
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });

  try {
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".ciudades (codigo, nombre, activa)
       VALUES ($1, $2, true)
       RETURNING codigo, nombre, activa`,
      [codigo, nombre],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (String(err.message || '').toLowerCase().includes('duplicate')) {
      res.status(409).json({ error: 'Ya existe una ciudad con ese código.' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:codigo', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo);
  const nombre = req.body?.nombre !== undefined ? String(req.body?.nombre || '').trim() : undefined;
  const activa = req.body?.activa !== undefined ? Boolean(req.body.activa) : undefined;

  if (!codigo) return res.status(400).json({ error: 'Código inválido.' });
  if (nombre !== undefined && !nombre) return res.status(400).json({ error: 'El nombre no puede estar vacío.' });

  try {
    const sets = [];
    const values = [];
    let i = 1;
    if (nombre !== undefined) {
      sets.push(`nombre = $${i++}`);
      values.push(nombre);
    }
    if (activa !== undefined) {
      sets.push(`activa = $${i++}`);
      values.push(activa);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Sin cambios.' });

    values.push(codigo);
    const result = await pool.query(
      `UPDATE "${SCHEMA}".ciudades
       SET ${sets.join(', ')}
       WHERE codigo = $${i}
       RETURNING codigo, nombre, activa`,
      values,
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Ciudad no encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:codigo', async (req, res) => {
  const codigo = normalizarCodigo(req.params.codigo);
  if (!codigo) return res.status(400).json({ error: 'Código inválido.' });
  try {
    const result = await pool.query(
      `UPDATE "${SCHEMA}".ciudades
       SET activa = false
       WHERE codigo = $1
       RETURNING codigo, nombre, activa`,
      [codigo],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Ciudad no encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
