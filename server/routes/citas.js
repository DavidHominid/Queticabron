import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapCita, toDBEstado, recordAudit } from '../helpers/utils.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT c.*, t.id_triaje 
      FROM "${SCHEMA}".citas c
      LEFT JOIN "${SCHEMA}".triaje t ON c.id_cita = t.id_cita
      ORDER BY c.id_cita DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows.map(mapCita));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const c = req.body;
  try {
    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".citas LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);

    const incomingData = {
      id_paciente: parseInt(c.pacienteId),
      pacienteId: parseInt(c.pacienteId),
      evento_id: c.eventoId ?? null,
      eventoId: c.eventoId ?? null,
      fecha_cita: c.fecha,
      fecha: c.fecha,
      hora: c.hora ?? '08:00',
      estado: toDBEstado(c.estado || 'programada'),
      especialidad: c.especialidad ?? 'medicina_familiar',
      medico_encargado: c.medicoEncargado ?? null,
      medicoEncargado: c.medicoEncargado ?? null,
      consultorio: c.consultorio ?? 'Consultorio 1',
      costo_pagado: c.costoPagado ?? 0,
      costoPagado: c.costoPagado ?? 0
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

    const query = `INSERT INTO "${SCHEMA}".citas (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);

    await recordAudit({
      accion: 'Nueva Cita',
      detalles: `Cita programada para paciente ID: ${c.pacienteId} el ${c.fecha}`,
      rol: c.rol_solicitante || 'recepcion',
      nombre_usuario: c.usuario_solicitante || 'Administrador'
    });

    res.status(201).json(mapCita(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en POST /api/citas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "${SCHEMA}".citas SET estado = $1::"${SCHEMA}".estado_cita WHERE id_cita = $2 RETURNING *`,
      [toDBEstado(estado), parseInt(id)]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(mapCita(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en PUT /api/citas/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
