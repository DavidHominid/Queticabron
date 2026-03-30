import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { recordAudit } from '../helpers/utils.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT id, nombre, usuario, rol, ciudad FROM "${SCHEMA}".usuarios WHERE usuario = $1 AND password = $2`,
      [usuario, password]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".usuarios`);
    res.json(result.rows.map(u => ({
      ...u,
      id: String(u.id),
      email: u.email || u.usuario || '',
      usuario: u.usuario || u.email || ''
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const u = req.body;
  try {
    const maxIdRes = await pool.query(`SELECT MAX(CAST(id AS INTEGER)) as max_id FROM "${SCHEMA}".usuarios`);
    const nextId = (maxIdRes.rows[0].max_id || 0) + 1;

    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".usuarios LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);

    const incomingData = {
      id: nextId,
      nombre: u.nombre,
      usuario: u.email || u.usuario,
      email: u.email || u.usuario,
      password: u.password,
      rol: u.rol,
      ciudad: u.ciudad,
      especialidad: u.especialidad || null,
      activo: u.activo ?? true
    };

    const finalData = {};
    for (const key in incomingData) {
      const dbColName = dbCols.find(col => col.trim().toLowerCase() === key.toLowerCase());
      if (dbColName && finalData[dbColName] === undefined) {
        finalData[dbColName] = incomingData[key];
      }
    }

    const queryCols = Object.keys(finalData).map(col => `"${col}"`).join(', ');
    const placeholders = Object.keys(finalData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(finalData);

    const query = `INSERT INTO "${SCHEMA}".usuarios (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    const created = result.rows[0];

    await recordAudit({
      accion: 'Creación de Usuario',
      detalles: `Se creó el usuario: ${u.nombre} con el rol: ${u.rol}`,
      rol: 'administrador',
      nombre_usuario: 'Administrador Sistema'
    });

    res.status(201).json({ ...created, id: String(created.id), email: created.email || created.usuario });
  } catch (err) {
    console.error('❌ Error en POST /api/usuarios:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".usuarios LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);

    const incomingData = {
      nombre: u.nombre,
      usuario: u.email || u.usuario,
      email: u.email || u.usuario,
      password: u.password,
      rol: u.rol,
      ciudad: u.ciudad,
      especialidad: u.especialidad,
      activo: u.activo
    };

    const sets = [];
    const values = [];
    let i = 1;
    for (const key in incomingData) {
      if (incomingData[key] === undefined) continue;
      const dbColName = dbCols.find(col => col.trim().toLowerCase() === key.toLowerCase());
      if (dbColName) {
        sets.push(`"${dbColName}" = $${i++}`);
        values.push(incomingData[key]);
      }
    }
    
    values.push(parseInt(id) || id);
    const query = `UPDATE "${SCHEMA}".usuarios SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await pool.query(query, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const updated = result.rows[0];
    res.json({ ...updated, id: String(updated.id), email: updated.email || updated.usuario });
  } catch (err) {
    console.error('❌ Error en PUT /api/usuarios/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM "${SCHEMA}".usuarios WHERE id = $1`, [parseInt(id) || id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
