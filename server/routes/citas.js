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
    console.error('❌ Error en GET /api/citas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const c = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".citas (id_paciente, evento_id, fecha_cita, hora, estado, especialidad, medico_encargado, consultorio, costo_pagado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        parseInt(c.pacienteId) || null,
        c.eventoId || null,
        c.fecha || null,
        c.hora || '08:00',
        toDBEstado(c.estado || 'programada'),
        c.especialidad || 'medicina_familiar',
        c.medicoEncargado || null,
        c.consultorio || 'Consultorio 1',
        c.costoPagado || 0
      ]
    );

    await recordAudit({
      usuario_id: c.usuarioId || null,
      nombre_usuario: c.usuario_solicitante || 'Sistema',
      rol: c.rol_solicitante || 'recepcion',
      accion: 'Nueva Cita',
      detalles: `Cita programada para paciente ID: ${c.pacienteId} el ${c.fecha}`,
      ciudad: c.ciudad || 'sonoyta'
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
      `UPDATE "${SCHEMA}".citas SET estado = $1 WHERE id_cita = $2 RETURNING *`,
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
