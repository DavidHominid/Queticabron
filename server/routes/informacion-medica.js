import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

router.get('/:pacienteId', async (req, res) => {
  const { pacienteId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM "${SCHEMA}".antecedentes WHERE id_paciente = $1 AND tipo = 'infomed'`,
      [parseInt(pacienteId)]
    );
    if (result.rows.length === 0) return res.json(null);
    try {
      const data = JSON.parse(result.rows[0].descripcion);
      res.json({ ...data, pacienteId: String(pacienteId) });
    } catch {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const infoData = req.body;
  const pacienteId = parseInt(infoData.pacienteId);
  try {
    const existing = await pool.query(
      `SELECT id_antecedentes FROM "${SCHEMA}".antecedentes WHERE id_paciente = $1 AND tipo = 'infomed'`,
      [pacienteId]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE "${SCHEMA}".antecedentes SET descripcion = $1 WHERE id_paciente = $2 AND tipo = 'infomed'`,
        [JSON.stringify(infoData), pacienteId]
      );
    } else {
      await pool.query(
        `INSERT INTO "${SCHEMA}".antecedentes (id_paciente, tipo, descripcion) VALUES ($1, $2, $3)`,
        [pacienteId, 'infomed', JSON.stringify(infoData)]
      );
    }
    res.status(201).json({ ...infoData });
  } catch (err) {
    console.error('❌ Error en POST /api/informacion-medica:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:pacienteId', async (req, res) => {
  const { pacienteId } = req.params;
  const infoData = req.body;
  try {
    const existing = await pool.query(
      `SELECT id_antecedentes FROM "${SCHEMA}".antecedentes WHERE id_paciente = $1 AND tipo = 'infomed'`,
      [parseInt(pacienteId)]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE "${SCHEMA}".antecedentes SET descripcion = $1 WHERE id_paciente = $2 AND tipo = 'infomed'`,
        [JSON.stringify(infoData), parseInt(pacienteId)]
      );
    } else {
      await pool.query(
        `INSERT INTO "${SCHEMA}".antecedentes (id_paciente, tipo, descripcion) VALUES ($1, $2, $3)`,
        [parseInt(pacienteId), 'infomed', JSON.stringify(infoData)]
      );
    }
    res.json({ ...infoData, pacienteId: String(pacienteId) });
  } catch (err) {
    console.error('❌ Error en PUT /api/informacion-medica/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
