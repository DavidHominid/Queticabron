import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".auditoria ORDER BY fecha_hora DESC LIMIT 100`);
    const mapped = result.rows.map(r => ({
      id: String(r.id_auditoria || r.id || ''),
      usuarioId: String(r.usuario_id || ''),
      nombreUsuario: r.nombre_usuario || 'Sistema',
      rol: r.rol || '---',
      accion: r.accion || '---',
      detalles: r.detalles || '---',
      fechaHora: r.fecha_hora || r.fechaHora || new Date().toISOString(),
      ciudad: r.ciudad || '---'
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const a = req.body;
  console.log('📝 Auditoría recibida:', a.accion);
  try {
    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".auditoria LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);
    
    const incomingData = {
      usuario_id: String(a.usuarioId || ''),
      nombre_usuario: a.nombreUsuario || 'Sistema',
      rol: a.rol || 'triage',
      accion: a.accion,
      detalles: a.detalles || '',
      fecha_hora: a.fechaHora || new Date(),
      ciudad: a.ciudad || 'Sonoyta'
    };

    const finalData = {};
    for (const key in incomingData) {
      const dbColName = dbCols.find(c => c.trim().toLowerCase() === key.toLowerCase());
      if (dbColName) {
        finalData[dbColName] = incomingData[key];
      }
    }
    
    if (!finalData.detalles && !finalData.Detalles) {
      finalData['detalles'] = a.detalles || '';
    }

    if (!finalData.id && !finalData.Id) {
      const dbColId = dbCols.find(c => c.trim().toLowerCase() === 'id');
      if (dbColId) {
        finalData[dbColId] = a.id || `aud${Date.now()}-${Math.floor(Math.random()*10000)}`;
      }
    }

    const queryCols = Object.keys(finalData).map(c => `"${c}"`).join(', ');
    const placeholders = Object.keys(finalData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(finalData);

    const query = `INSERT INTO "${SCHEMA}".auditoria (${queryCols}) VALUES (${placeholders})`;
    try {
      await pool.query(query, values);
    } catch (auditErr) {
      console.warn('⚠️ Auditoría falló (no crítica):', auditErr.message);
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('❌ Error en endpoint auditoría:', err.message);
    res.status(200).json({ success: false, warning: 'Audit failed but operation proceeded' });
  }
});

export default router;
