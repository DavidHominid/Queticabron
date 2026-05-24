import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapCita, toDBEstado, recordAudit, normalizeHora } from '../helpers/utils.js';

const router = express.Router();

const detectCitasTipoCitaRef = async () => {
  try {
    const res = await pool.query(
      `
      SELECT ccu.table_name AS ref_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = $1
        AND tc.table_name = 'citas'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name = 'citas_fk_tipo_cita'
      LIMIT 1
      `,
      [SCHEMA],
    );
    const t = String(res.rows?.[0]?.ref_table || '').trim();
    return t === 'tipos_cita' || t === 'evento_tipo_cita' ? t : null;
  } catch {
    return null;
  }
};

const ensureTipoCitaLegacy = async (payload) => {
  const nombre = String(payload.nombre || '').trim();
  if (!nombre) return null;
  const especialidad = String(payload.especialidad || '').trim();
  const found = await pool.query(
    `SELECT id FROM "${SCHEMA}".tipos_cita WHERE especialidad_codigo = $1 AND lower(nombre) = lower($2) ORDER BY id LIMIT 1`,
    [especialidad, nombre],
  );
  if (found.rows?.length) return Number(found.rows[0].id);
  const inserted = await pool.query(
    `INSERT INTO "${SCHEMA}".tipos_cita (especialidad_codigo, nombre, duracion_minutos, costo, activa)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id`,
    [
      especialidad,
      nombre,
      Number.isFinite(Number(payload.duracionMinutos)) ? Math.max(1, Math.floor(Number(payload.duracionMinutos))) : 60,
      Number.isFinite(Number(payload.costo)) ? Math.max(0, Math.floor(Number(payload.costo))) : 0,
    ],
  );
  return inserted.rows?.length ? Number(inserted.rows[0].id) : null;
};

router.get('/', async (req, res) => {
  try {
    const tipoRef = await detectCitasTipoCitaRef();
    const joinTipo =
      tipoRef === 'tipos_cita'
        ? `LEFT JOIN "${SCHEMA}".tipos_cita etc ON c.tipo_cita_id = etc.id`
        : `LEFT JOIN "${SCHEMA}".evento_tipo_cita etc ON c.tipo_cita_id = etc.id`;
    const precioCol = tipoRef === 'tipos_cita' ? 'etc.costo' : 'etc.precio';
    const durCol = 'etc.duracion_minutos';

    // Optional date range filters: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
    const { desde, hasta } = req.query;
    const params = [];
    let dateFilter = '';
    if (desde && hasta) {
      params.push(desde, hasta);
      dateFilter = `WHERE c.fecha_cita >= $1 AND c.fecha_cita <= $2`;
    } else if (desde) {
      params.push(desde);
      dateFilter = `WHERE c.fecha_cita >= $1`;
    } else if (hasta) {
      params.push(hasta);
      dateFilter = `WHERE c.fecha_cita <= $1`;
    }

    const query = `
      SELECT c.*, t.id_triaje,
             etc.nombre AS tipo_cita_nombre,
             ${durCol} AS tipo_cita_duracion_minutos,
             ${precioCol} AS tipo_cita_precio
      FROM "${SCHEMA}".citas c
      LEFT JOIN "${SCHEMA}".triaje t ON c.id_cita = t.id_cita
      ${joinTipo}
      ${dateFilter}
      ORDER BY c.id_cita DESC
    `;
    const result = await pool.query(query, params);
    res.json(result.rows.map(mapCita));
  } catch (err) {
    console.error('❌ Error en GET /api/citas:', err.message);
    res.status(500).json({ error: err.message });
  }
});


router.post('/', async (req, res) => {
  const c = req.body;
  try {
    const especialidad = String(c.especialidad || '').trim();
    if (!especialidad) {
      return res.status(400).json({ error: 'La especialidad es obligatoria.' });
    }
    const pacienteId = Number.isFinite(Number(c.pacienteId)) ? parseInt(c.pacienteId) : null;
    const fechaCita = c.fecha || null;
    const horaCita = normalizeHora(c.hora) || '08:00';
    if (!pacienteId || !fechaCita) {
      return res.status(400).json({ error: 'Paciente, fecha y hora son obligatorios.' });
    }
    const conflict = await pool.query(
      `SELECT id_cita
       FROM "${SCHEMA}".citas
       WHERE id_paciente = $1
         AND fecha_cita = $2
         AND hora = $3
         AND estado <> 'cancelada'
       LIMIT 1`,
      [pacienteId, fechaCita, horaCita],
    );
    if (conflict.rows?.length) {
      return res.status(409).json({ error: 'El paciente ya tiene una cita en esa fecha y hora.' });
    }
    const tipoIdRaw = c.tipoCitaId;
    const tipoId = Number.isFinite(Number(tipoIdRaw)) ? Number(tipoIdRaw) : null;
    const tipoRef = await detectCitasTipoCitaRef();

    let medicoEncargado = c.medicoEncargado || null;
    let consultorio = c.consultorio || 'Consultorio 1';
    let costoPagado = Number.isFinite(Number(c.costoPagado)) ? Number(c.costoPagado) : 0;
    let duracionMinutos = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
    let tipoIdToInsert = null;

    if (tipoId) {
      const tipoRes = await pool.query(
        `SELECT
           etc.id,
           etc.nombre,
           etc.duracion_minutos,
           etc.precio,
           etc.medico_usuario_id,
           ee.evento_id,
           ee.especialidad,
           ee.consultorio,
           ee.costo,
           ee.medico_usuario_id AS esp_medico_usuario_id
         FROM "${SCHEMA}".evento_tipo_cita etc
         JOIN "${SCHEMA}".evento_especialidad ee
           ON ee.id = etc.evento_especialidad_id
         WHERE etc.id = $1`,
        [tipoId],
      );
      if (!tipoRes.rows.length) {
        return res.status(400).json({ error: 'El tipo de cita seleccionado no existe.' });
      }
      const t = tipoRes.rows[0];
      if (String(t.evento_id || '') !== String(c.eventoId || '')) {
        return res.status(400).json({ error: 'El tipo de cita no pertenece a este evento.' });
      }
      if (String(t.especialidad || '') !== especialidad) {
        return res.status(400).json({ error: 'El tipo de cita no pertenece a esta especialidad.' });
      }
      duracionMinutos = Number.isFinite(Number(t.duracion_minutos)) ? Math.max(1, Math.floor(Number(t.duracion_minutos))) : duracionMinutos;
      costoPagado = Number.isFinite(Number(t.precio)) ? Number(t.precio) : costoPagado;
      consultorio = t.consultorio || consultorio;
      medicoEncargado = t.medico_usuario_id || t.esp_medico_usuario_id || medicoEncargado;
      if (tipoRef === 'tipos_cita') {
        tipoIdToInsert = await ensureTipoCitaLegacy({
          especialidad,
          nombre: String(t.nombre || '').trim(),
          duracionMinutos,
          costo: costoPagado,
        });
      } else {
        tipoIdToInsert = tipoId;
      }
    }

    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".citas
        (id_paciente, evento_id, fecha_cita, hora, estado, especialidad, medico_encargado, consultorio, costo_pagado, tipo_cita_id, duracion_minutos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        pacienteId,
        (c.eventoId === 'general' ? null : c.eventoId) || null,
        fechaCita,
        horaCita,
        toDBEstado(c.estado || 'programada'),
        especialidad,
        medicoEncargado,
        consultorio,
        costoPagado,
        tipoIdToInsert,
        duracionMinutos,
      ],
    );

    await recordAudit({
      usuario_id: c.usuarioId || null,
      nombre_usuario: c.usuario_solicitante || 'Sistema',
      rol: c.rol_solicitante || 'recepcion',
      accion: 'Nueva Cita',
      detalles: `Cita programada para paciente ID: ${c.pacienteId} el ${c.fecha}`,
      ciudad: c.ciudad || 'sonoyta'
    });

    const row = result.rows[0];
    const tipoRefAfter = await detectCitasTipoCitaRef();
    const joinTipo =
      tipoRefAfter === 'tipos_cita'
        ? `LEFT JOIN "${SCHEMA}".tipos_cita etc ON c.tipo_cita_id = etc.id`
        : `LEFT JOIN "${SCHEMA}".evento_tipo_cita etc ON c.tipo_cita_id = etc.id`;
    const precioCol = tipoRefAfter === 'tipos_cita' ? 'etc.costo' : 'etc.precio';
    const durCol = 'etc.duracion_minutos';
    const enriched = await pool.query(
      `SELECT c.*, t.id_triaje,
              etc.nombre AS tipo_cita_nombre,
              ${durCol} AS tipo_cita_duracion_minutos,
              ${precioCol} AS tipo_cita_precio
       FROM "${SCHEMA}".citas c
       LEFT JOIN "${SCHEMA}".triaje t ON c.id_cita = t.id_cita
       ${joinTipo}
       WHERE c.id_cita = $1`,
      [row.id_cita],
    );
    res.status(201).json(mapCita(enriched.rows[0] || row));
  } catch (err) {
    console.error('❌ Error en POST /api/citas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, fecha, hora, pacienteId } = req.body;

  try {
    const current = await pool.query(
      `SELECT id_paciente, fecha_cita, hora
       FROM "${SCHEMA}".citas
       WHERE id_cita = $1
       LIMIT 1`,
      [parseInt(id)],
    );
    if (!current.rows?.length) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }
    const cur = current.rows[0];
    const nextPacienteId = Number.isFinite(Number(pacienteId)) ? parseInt(pacienteId) : Number(cur.id_paciente);
    const nextFecha = fecha || cur.fecha_cita || null;
    const nextHora = normalizeHora(hora) || normalizeHora(cur.hora) || '08:00';

    if (nextPacienteId && nextFecha && nextHora) {
      const conflict = await pool.query(
        `SELECT id_cita
         FROM "${SCHEMA}".citas
         WHERE id_paciente = $1
           AND fecha_cita = $2
           AND hora = $3
           AND estado <> 'cancelada'
           AND id_cita <> $4
         LIMIT 1`,
        [nextPacienteId, nextFecha, nextHora, parseInt(id)],
      );
      if (conflict.rows?.length) {
        return res.status(409).json({ error: 'El paciente ya tiene una cita en esa fecha y hora.' });
      }
    }

    const result = await pool.query(
      `
      UPDATE "${SCHEMA}".citas
      SET 
        estado = COALESCE($1, estado),
        fecha_cita = COALESCE($2, fecha_cita),
        hora = COALESCE($3, hora),
        id_paciente = COALESCE($4, id_paciente)
      WHERE id_cita = $5
      RETURNING *
      `,
      [
        estado ? toDBEstado(estado) : null,
        fecha || null,
        normalizeHora(hora) || null,
        Number.isFinite(Number(pacienteId)) ? parseInt(pacienteId) : null,
        parseInt(id)
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const row = result.rows[0];
    const tipoRefAfter = await detectCitasTipoCitaRef();
    const joinTipo =
      tipoRefAfter === 'tipos_cita'
        ? `LEFT JOIN "${SCHEMA}".tipos_cita etc ON c.tipo_cita_id = etc.id`
        : `LEFT JOIN "${SCHEMA}".evento_tipo_cita etc ON c.tipo_cita_id = etc.id`;
    const precioCol = tipoRefAfter === 'tipos_cita' ? 'etc.costo' : 'etc.precio';
    const durCol = 'etc.duracion_minutos';
    const enriched = await pool.query(
      `SELECT c.*, t.id_triaje,
              etc.nombre AS tipo_cita_nombre,
              ${durCol} AS tipo_cita_duracion_minutos,
              ${precioCol} AS tipo_cita_precio
       FROM "${SCHEMA}".citas c
       LEFT JOIN "${SCHEMA}".triaje t ON c.id_cita = t.id_cita
       ${joinTipo}
       WHERE c.id_cita = $1`,
      [row.id_cita],
    );
    res.json(mapCita(enriched.rows[0] || row));
  } catch (err) {
    console.error('❌ Error en PUT /api/citas/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
