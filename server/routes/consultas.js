import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const c = req.body;
  console.log('📝 Consulta recibida para paciente:', c.pacienteId);
  try {
    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".nota_medica LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);

    const incomingData = {
      id_cita: parseInt(c.citaId),
      id_paciente: parseInt(c.pacienteId),
      motivo_consulta: c.motivoConsulta,
      padecimiento_actual: c.padecimientoActual,
      exploracion_fisica: c.exploracionFisica,
      diagnostico: c.diagnostico,
      tratamiento: c.tratamiento,
      plan_tratamiento: c.planTratamiento || c.tratamiento,
      medicamentos: JSON.stringify(c.medicamentosRecetados || []),
      indicaciones: c.recomendaciones || '',
      proxima_cita: c.proximaConsulta || null,
      fecha_nota: new Date()
    };

    const finalData = {};
    for (const key in incomingData) {
      const dbColName = dbCols.find(col => col.trim().toLowerCase() === key.toLowerCase() || col.trim().toLowerCase().includes(key.toLowerCase()));
      if (dbColName && finalData[dbColName] === undefined) {
        finalData[dbColName] = incomingData[key];
      }
    }

    const queryCols = Object.keys(finalData).map(col => `"${col}"`).join(', ');
    const placeholders = Object.keys(finalData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(finalData);

    const query = `INSERT INTO "${SCHEMA}".nota_medica (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    
    // Auditoría automática
    const idValue = `aud${Date.now()}-${Math.floor(Math.random()*10000)}`;
    await pool.query(`INSERT INTO "${SCHEMA}".auditoria (id, nombre_usuario, rol, accion, detalles, fecha_hora, ciudad) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
       [idValue, c.medicoEncargado || 'Medico', 'medico', 'Consulta Médica', `Completó consulta para paciente ID: ${c.pacienteId}`, new Date(), 'Sonoyta']);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error en POST /api/consultas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".nota_medica ORDER BY id_nota DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
