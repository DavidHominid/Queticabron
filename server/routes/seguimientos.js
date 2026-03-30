import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".nota_medica ORDER BY id_nota DESC LIMIT 20`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error en GET /api/seguimientos:', err.message);
    res.json([]);
  }
});

export default router;
