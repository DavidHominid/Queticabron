import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapCita, toDBEstado, toFEEstado, recordAudit, normalizeHora } from '../helpers/utils.js';
import { broadcast } from '../helpers/sse.js';

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
    const eventoIdVal = c.eventoId && c.eventoId !== 'general' ? c.eventoId : null;
    if (eventoIdVal) {
      const evRes = await pool.query(
        `SELECT
           estado,
           fecha_inicio,
           fecha_fin,
           fecha_inicio_inscripcion,
           (estado = 'cancelado') AS cancelado,
           (fecha_fin IS NOT NULL AND CURRENT_DATE > fecha_fin) AS finalizado,
           (fecha_inicio_inscripcion IS NOT NULL AND CURRENT_DATE < fecha_inicio_inscripcion) AS insc_no_inicia,
           (fecha_inicio_inscripcion IS NULL OR fecha_fin IS NULL OR (CURRENT_DATE >= fecha_inicio_inscripcion AND CURRENT_DATE <= fecha_fin)) AS ventana_activa,
           ($2::date >= fecha_inicio AND $2::date <= fecha_fin) AS fecha_cita_valida
         FROM "${SCHEMA}".eventos
         WHERE id = $1
         LIMIT 1`,
        [eventoIdVal, fechaCita],
      );
      if (!evRes.rows?.length) {
        return res.status(400).json({ error: 'El evento seleccionado no existe.' });
      }
      const ev = evRes.rows[0];
      if (ev.cancelado) {
        return res.status(403).json({ error: 'Este evento está cancelado. No se pueden agendar citas.' });
      }
      if (ev.finalizado) {
        return res.status(403).json({ error: 'Este evento ya finalizó. No se pueden agendar citas.' });
      }
      if (ev.insc_no_inicia) {
        return res.status(403).json({ error: 'Aún no inician las inscripciones de este evento. No se pueden agendar citas.' });
      }
      if (!ev.ventana_activa) {
        return res.status(403).json({ error: 'Este evento no está activo. No se pueden agendar citas.' });
      }
      if (!ev.fecha_cita_valida) {
        return res.status(400).json({ error: 'La fecha de la cita está fuera de las fechas del evento.' });
      }
    }
    const conflict = await pool.query(
      `SELECT id_cita
       FROM "${SCHEMA}".citas
       WHERE id_paciente = $1
         AND fecha_cita = $2
         AND LEFT(hora::text, 5) = $3
         AND estado <> 'cancelada'
         AND ($4::text IS NULL OR evento_id = $4)
       LIMIT 1`,
      [pacienteId, fechaCita, horaCita, eventoIdVal],
    );
    if (conflict.rows?.length) {
      return res.status(409).json({ error: 'El paciente ya tiene una cita en esa fecha y hora en este evento.' });
    }
    const tipoIdRaw = c.tipoCitaId;
    const tipoId = Number.isFinite(Number(tipoIdRaw)) ? Number(tipoIdRaw) : null;
    const tipoRef = await detectCitasTipoCitaRef();

    let medicoEncargado = c.medicoEncargado || null;
    let consultorio = c.consultorio || 'Consultorio 1';
    let costoPagado = Number.isFinite(Number(c.costoPagado)) ? Number(c.costoPagado) : 0;
    let duracionMinutos = Number.isFinite(Number(c.duracionMinutos)) ? Math.max(1, Math.floor(Number(c.duracionMinutos))) : 60;
    let tipoIdToInsert = null;
    let requiereTriageEsp = true;
    if (eventoIdVal) {
      try {
        const espRow = await pool.query(
          `SELECT COALESCE(requiere_triage, true) AS requiere_triage
           FROM "${SCHEMA}".evento_especialidad
           WHERE evento_id = $1 AND lower(especialidad) = lower($2)
           ORDER BY id LIMIT 1`,
          [eventoIdVal, especialidad],
        );
        if (espRow.rows?.length) requiereTriageEsp = !(espRow.rows[0].requiere_triage === false || espRow.rows[0].requiere_triage === 'f');
      } catch (_) {
        requiereTriageEsp = true;
      }
    }
    const saltadoTriage = !requiereTriageEsp;

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
        (id_paciente, evento_id, fecha_cita, hora, estado, especialidad, medico_encargado, consultorio, costo_pagado, tipo_cita_id, duracion_minutos, saltado_triage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        saltadoTriage,
      ],
    );

    await recordAudit({
      paciente_id: pacienteId,
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
    broadcast('operacional'); // ⚡ notifica a todos los clientes
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
           AND LEFT(hora::text, 5) = $3
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
    broadcast('operacional'); // ⚡ notifica a todos los clientes
  } catch (err) {
    console.error('❌ Error en PUT /api/citas/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const extraeAuditMetaCitas = (req, bodyExtra = {}) => {
  const usuario = req.user || req.headers['x-usuario'] || {};
  const nombre = bodyExtra?.usuario_solicitante || bodyExtra?.nombre_usuario || usuario?.nombre || (typeof usuario === 'string' ? usuario : null);
  const rol = bodyExtra?.rol_solicitante || usuario?.rol || 'recepcion';
  return {
    usuario_id: bodyExtra?.usuarioId || usuario?.id ? String(bodyExtra?.usuarioId ?? usuario?.id) : null,
    nombre_usuario: nombre ? String(nombre) : 'Sistema',
    rol: rol ? String(rol) : '---',
    ciudad: bodyExtra?.ciudad || usuario?.ciudad || 'Sonoyta',
  };
};

const getEspecialidadEventoConfig = async (eventoId, especialidad) => {
  if (!eventoId || eventoId === 'general' || !especialidad) {
    return { requiereTriage: true, poolMedicosIds: [], legacyMedicoId: null };
  }
  const rows = await pool.query(
    `SELECT medico_usuario_ids, medico_usuario_id, COALESCE(requiere_triage, true) AS requiere_triage
     FROM "${SCHEMA}".evento_especialidad
     WHERE evento_id = $1 AND lower(especialidad) = lower($2)
     ORDER BY id LIMIT 1`,
    [String(eventoId), String(especialidad)],
  );
  if (!rows.rows?.length) return { requiereTriage: true, poolMedicosIds: [], legacyMedicoId: null };
  const r = rows.rows[0];
  const raw = Array.isArray(r.medico_usuario_ids)
    ? r.medico_usuario_ids
    : typeof r.medico_usuario_ids === 'string'
      ? r.medico_usuario_ids.replace(/^\{/, '').replace(/\}$/, '').split(',').map(s => s.trim()).filter(Boolean)
      : [];
  let poolIds = raw.map(x => String(x)).filter(Boolean);
  const legacy = r.medico_usuario_id ? String(r.medico_usuario_id) : null;
  if (poolIds.length === 0 && legacy) poolIds = [legacy];
  return {
    requiereTriage: !(r.requiere_triage === false || r.requiere_triage === 'f' || r.requiere_triage === 0),
    poolMedicosIds: poolIds,
    legacyMedicoId: legacy,
  };
};

router.put('/checkin/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const idNum = parseInt(id);
    if (!Number.isFinite(idNum)) return res.status(400).json({ error: 'ID de cita inválido.' });
    const current = await pool.query(
      `SELECT id_cita, id_paciente, evento_id, especialidad, fecha_cita, estado, saltado_triage, hora_llegada
       FROM "${SCHEMA}".citas WHERE id_cita = $1 LIMIT 1`,
      [idNum],
    );
    if (!current.rows?.length) return res.status(404).json({ error: 'Cita no encontrada.' });
    const c = current.rows[0];
    const meta = extraeAuditMetaCitas(req, req.body || {});
    const eventosRow = c.evento_id
      ? await pool.query(`SELECT id FROM "${SCHEMA}".eventos WHERE id = $1 LIMIT 1`, [c.evento_id]).then(r => r.rows?.[0] || null)
      : null;
    if (c.evento_id && !eventosRow) return res.status(400).json({ error: 'Evento de la cita no encontrado.' });

    const estadoActual = String(c.estado || '');
    const ya = ['llegada_registrada', 'en_triage', 'triage_completado', 'asignando_medico', 'en_consulta', 'completada'].includes(toFEEstado(estadoActual));
    if (ya && toFEEstado(estadoActual) !== 'programada' && toFEEstado(estadoActual) !== 'confirmada' && toFEEstado(estadoActual) !== 'pendiente') {
      const estadoAnterior = toFEEstado(estadoActual);
      if (estadoAnterior === 'en_consulta' || estadoAnterior === 'completada' ||
          estadoAnterior === 'asignando_medico' || estadoAnterior === 'triage_completado' ||
          estadoAnterior === 'en_triage' || estadoAnterior === 'llegada_registrada') {
        // idempotencia: si ya está llegada_registrada, responder OK pero con warning
      }
    }

    const { requiereTriage } = await getEspecialidadEventoConfig(c.evento_id, c.especialidad);
    const saltaTriaje = !(requiereTriage);
    const ahora = new Date();
    const ordenRes = await pool.query(
      `SELECT COALESCE(MAX(orden_llegada), 0) AS max_orden
       FROM "${SCHEMA}".citas
       WHERE fecha_cita = $1 AND evento_id IS NOT DISTINCT FROM $2 AND especialidad = $3`,
      [c.fecha_cita, c.evento_id || null, c.especialidad],
    );
    const ordenLlegada = Number(ordenRes.rows?.[0]?.max_orden || 0) + 1;

    const estadoDespues = saltaTriaje ? 'asignando_medico' : 'llegada_registrada';
    const updated = await pool.query(
      `UPDATE "${SCHEMA}".citas
       SET hora_llegada = COALESCE($1, hora_llegada),
           orden_llegada = $2,
           saltado_triage = $3,
           estado = $4
       WHERE id_cita = $5
       RETURNING *`,
      [ahora, ordenLlegada, saltaTriaje, estadoDespues, idNum],
    );
    if (!updated.rows?.length) return res.status(404).json({ error: 'Cita no encontrada al actualizar.' });

    await recordAudit({
      ...meta,
      paciente_id: c.id_paciente,
      accion: saltaTriaje ? 'CheckIn Cita (Saltó Triage)' : 'CheckIn Cita',
      detalles: `Cita #${idNum} orden de llegada #${ordenLlegada}. Especialidad: ${c.especialidad}. ${saltaTriaje ? 'Especialidad marcada sin triaje.' : 'Pendiente de pasar a triage.'}`,
    });

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
      [updated.rows[0].id_cita],
    );
    res.json({
      ...mapCita(enriched.rows[0] || updated.rows[0]),
      _meta: { saltoTriage: saltaTriaje, ordenLlegada, requiereTriage },
    });
    broadcast('operacional');
  } catch (err) {
    console.error('❌ Error en PUT /api/citas/checkin/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/asignar-medico/:id', async (req, res) => {
  const { id } = req.params;
  const { medicoId, prioridadTriage } = req.body ?? {};
  try {
    const idNum = parseInt(id);
    if (!Number.isFinite(idNum)) return res.status(400).json({ error: 'ID de cita inválido.' });
    const idMedico = medicoId ? String(medicoId).trim() : '';
    if (!idMedico) return res.status(400).json({ error: 'medicoId es obligatorio.' });
    const current = await pool.query(
      `SELECT c.id_cita, c.id_paciente, c.evento_id, c.especialidad, c.estado, c.medico_encargado, c.saltado_triage, c.prioridad_triage
       FROM "${SCHEMA}".citas c WHERE c.id_cita = $1 LIMIT 1`,
      [idNum],
    );
    if (!current.rows?.length) return res.status(404).json({ error: 'Cita no encontrada.' });
    const c = current.rows[0];
    const meta = extraeAuditMetaCitas(req, req.body || {});

    const estadosValidos = ['llegada_registrada', 'triage_completado', 'asignando_medico', 'en_triage'];
    const estadoActualFE = toFEEstado(String(c.estado || ''));
    if (!estadosValidos.includes(estadoActualFE)) {
      return res.status(409).json({
        error: `No se puede asignar médico en estado actual: ${estadoActualFE}.`,
      });
    }

    const { poolMedicosIds, legacyMedicoId } = await getEspecialidadEventoConfig(c.evento_id, c.especialidad);
    const poolLookup = new Set([...(poolMedicosIds || []), legacyMedicoId].filter(Boolean).map(x => String(x)));
    if (poolLookup.size > 0 && !poolLookup.has(idMedico)) {
      return res.status(400).json({
        error: `El médico ${idMedico} no pertenece al pool de la especialidad "${c.especialidad}" de este evento.`,
        pool: Array.from(poolLookup),
      });
    }

    const userRow = await pool.query(
      `SELECT id, nombre, rol FROM "${SCHEMA}".usuarios WHERE id::text = $1 LIMIT 1`,
      [idMedico],
    );
    if (!userRow.rows?.length) return res.status(404).json({ error: 'Médico (usuario) no encontrado.' });
    const u = userRow.rows[0];
    const esMedicoValido = (u.rol || '').toString().toLowerCase() === 'medico' || poolLookup.size === 0;
    if (!esMedicoValido) {
      return res.status(400).json({ error: `El usuario ${u.nombre} no tiene rol médico.` });
    }
    if (c.medico_encargado && String(c.medico_encargado) !== idMedico) {
      return res.status(409).json({
        error: `La cita ya tiene asignado el médico ${c.medico_encargado}. Reasignación no permitida en este endpoint.`,
      });
    }

    const pTriage = Number.isFinite(Number(prioridadTriage)) ? Math.max(1, Math.min(5, Math.floor(Number(prioridadTriage))))
                    : (Number.isFinite(Number(c.prioridad_triage)) ? Number(c.prioridad_triage) : 3);
    const ahora = new Date();
    const updated = await pool.query(
      `UPDATE "${SCHEMA}".citas
       SET medico_encargado = $1,
           hora_asignacion = $2,
           medico_asignado_por = $3,
           prioridad_triage = $4,
           estado = 'en_consulta'
       WHERE id_cita = $5
       RETURNING *`,
      [idMedico, ahora, meta.usuario_id || null, pTriage, idNum],
    );

    await recordAudit({
      ...meta,
      paciente_id: c.id_paciente,
      accion: 'Asignacion Medico Cita',
      detalles: `Cita #${idNum} · asignado a ${u.nombre || idMedico} (${u.id}). Anterior medico_encargado: ${c.medico_encargado || '(ninguno)'}. Prioridad triaje: ${pTriage}.`,
    });

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
      [updated.rows[0].id_cita],
    );
    res.json({
      ...mapCita(enriched.rows[0] || updated.rows[0]),
      _meta: { medicoAsignado: u.nombre, medicoId: u.id, prioridadTriage: pTriage },
    });
    broadcast('operacional');
  } catch (err) {
    console.error('❌ Error en PUT /api/citas/asignar-medico/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const colaCitaBaseSelect = () => `
  SELECT c.id_cita, c.id_paciente, c.evento_id, c.especialidad, c.fecha_cita, c.hora, c.estado, c.consultorio, c.medico_encargado,
         c.bloque_id, c.hora_llegada, c.orden_llegada, c.prioridad_triage, c.hora_asignacion, c.medico_asignado_por, c.saltado_triage,
         c.origen, c.fecha_captura_cita, c.duracion_minutos, c.costo_pagado,
         ee.medico_usuario_ids, ee.intervalo_minutos_default, ee.cupo_por_bloque_default, ee.requiere_triage,
         p.nombre AS paciente_nombre, p.apellido AS paciente_apellido, p.numero_expediente AS paciente_numero_expediente,
         p.telefono AS paciente_telefono, p.fecha_de_nacimiento AS paciente_fecha_nacimiento, p.sexo AS paciente_sexo,
         t.id_triaje, COALESCE(t.temperatura, cta.temperatura) AS t_temperatura, COALESCE(t.presion_arterial, cta.presion_arterial) AS t_presion_arterial,
         COALESCE(t.ritmo_cardiaco, cta.ritmo_cardiaco) AS t_ritmo_cardiaco, COALESCE(t.saturacion_oxigeno, cta.saturacion_oxigeno) AS t_saturacion_oxigeno,
         COALESCE(t.azucar_en_sangre, cta.azucar_en_sangre) AS t_azucar_en_sangre
  FROM "${SCHEMA}".citas c
  LEFT JOIN "${SCHEMA}".paciente p ON p.id_paciente = c.id_paciente
  LEFT JOIN "${SCHEMA}".evento_especialidad ee
    ON ee.evento_id IS NOT DISTINCT FROM c.evento_id AND lower(ee.especialidad) = lower(c.especialidad)
  LEFT JOIN (
    SELECT id_cita, id_triaje, temperatura, presion_arterial, ritmo_cardiaco, saturacion_oxigeno, azucar_en_sangre
    FROM "${SCHEMA}".triaje
  ) t ON t.id_cita = c.id_cita
  LEFT JOIN LATERAL (
    SELECT temperatura, presion_arterial, ritmo_cardiaco, saturacion_oxigeno, azucar_en_sangre
    FROM "${SCHEMA}".triaje t2 WHERE t2.id_cita = c.id_cita ORDER BY t2.id_triaje DESC NULLS LAST LIMIT 1
  ) cta ON true
`;

const mapColaCita = (r) => {
  const rawPool = Array.isArray(r.medico_usuario_ids) ? r.medico_usuario_ids :
    typeof r.medico_usuario_ids === 'string' ? r.medico_usuario_ids.replace(/^\{/, '').replace(/\}$/, '').split(',').map(s => s.trim()).filter(Boolean) : [];
  let poolIds = rawPool.map(x => String(x)).filter(Boolean);
  const legacy = r.medico_encargado && String(r.medico_encargado).trim();
  if (poolIds.length === 0 && legacy) poolIds = [legacy];
  const requiereTriage = !(r.requiere_triage === false || r.requiere_triage === 'f');
  const paciente = {
    id: String(r.id_paciente || ''),
    nombre: r.paciente_nombre || '',
    apellido: r.paciente_apellido || '',
    numeroExpediente: r.paciente_numero_expediente ? String(r.paciente_numero_expediente) : null,
    telefono: r.paciente_telefono || null,
    fechaNacimiento: r.paciente_fecha_nacimiento ? new Date(r.paciente_fecha_nacimiento).toISOString().slice(0, 10) : null,
    sexo: r.paciente_sexo || null,
  };
  return {
    id: String(r.id_cita || ''),
    paciente,
    eventoId: r.evento_id ? String(r.evento_id) : null,
    especialidad: r.especialidad,
    fecha: r.fecha_cita ? new Date(r.fecha_cita).toISOString().slice(0, 10) : null,
    hora: r.hora ? String(r.hora).slice(0, 5) : null,
    estado: toFEEstado(r.estado),
    consultorio: r.consultorio || null,
    medicoEncargado: r.medico_encargado ? String(r.medico_encargado) : null,
    bloqueId: r.bloque_id ? String(r.bloque_id) : null,
    horaLlegada: r.hora_llegada ? new Date(r.hora_llegada).toISOString() : null,
    ordenLlegada: Number.isFinite(Number(r.orden_llegada)) ? Number(r.orden_llegada) : null,
    prioridadTriage: Number.isFinite(Number(r.prioridad_triage)) ? Number(r.prioridad_triage) : 3,
    horaAsignacion: r.hora_asignacion ? new Date(r.hora_asignacion).toISOString() : null,
    medicoAsignadoPor: r.medico_asignado_por ? String(r.medico_asignado_por) : null,
    saltadoTriage: Boolean(r.saltado_triage),
    origen: r.origen || 'sistema',
    fechaCapturaCita: r.fecha_captura_cita ? new Date(r.fecha_captura_cita).toISOString() : null,
    duracionMinutos: Number.isFinite(Number(r.duracion_minutos)) ? Number(r.duracion_minutos) : null,
    costoPagado: Number.isFinite(Number(r.costo_pagado)) ? Number(r.costo_pagado) : 0,
    especialidadOtra: null,
    encargadoTriage: null,
    medicoUsuarioIds: poolIds,
    requiereTriage,
    triaje: r.id_triaje ? {
      id: String(r.id_triaje),
      temperatura: r.t_temperatura ?? null,
      presionArterial: r.t_presion_arterial ?? null,
      ritmoCardiaco: Number.isFinite(Number(r.t_ritmo_cardiaco)) ? Number(r.t_ritmo_cardiaco) : null,
      saturacionOxigeno: Number.isFinite(Number(r.t_saturacion_oxigeno)) ? Number(r.t_saturacion_oxigeno) : null,
      azucarEnSangre: Number.isFinite(Number(r.t_azucar_en_sangre)) ? Number(r.t_azucar_en_sangre) : null,
    } : null,
  };
};

router.get('/cola-triage/:eventoId', async (req, res) => {
  const { eventoId } = req.params;
  const { especialidad } = req.query;
  try {
    const params = [];
    params.push(eventoId);
    const espFilter = especialidad ? `AND lower(c.especialidad) = lower($${params.length + 1})` : '';
    if (especialidad) params.push(String(especialidad));
    const rows = await pool.query(
      `
      ${colaCitaBaseSelect()}
      WHERE c.evento_id = $1
        AND (COALESCE(ee.requiere_triage, true) = true OR c.saltado_triage = false)
        AND c.saltado_triage = false
        AND toFEEstado(c.estado) IN ('llegada_registrada', 'en_triage')
        ${espFilter}
      ORDER BY
        CASE toFEEstado(c.estado)
          WHEN 'en_triage' THEN 0
          WHEN 'llegada_registrada' THEN 1
          ELSE 9
        END ASC,
        COALESCE(c.prioridad_triage, 3) ASC,
        c.hora_llegada ASC NULLS LAST,
        c.orden_llegada ASC NULLS LAST,
        c.hora ASC NULLS LAST
      `,
      params,
    ).catch(async () => {
      // fallback: toFEEstado no es SQL; usar mapeo manual CASE
      return pool.query(
        `
        ${colaCitaBaseSelect()}
        WHERE c.evento_id = $1
          AND (COALESCE(ee.requiere_triage, true) = true OR c.saltado_triage = false)
          AND c.saltado_triage = false
          AND (
            c.estado IN ('llegada_registrada', 'en_triage', 'confirmada', 'pendiente')
          )
          ${espFilter}
        ORDER BY
          CASE
            WHEN c.estado = 'en_triage' THEN 0
            WHEN c.estado = 'confirmada' THEN 0
            WHEN c.estado = 'llegada_registrada' THEN 1
            WHEN c.estado = 'pendiente' THEN 1
            ELSE 9
          END ASC,
          COALESCE(c.prioridad_triage, 3) ASC,
          c.hora_llegada ASC NULLS LAST,
          c.orden_llegada ASC NULLS LAST,
          c.hora ASC NULLS LAST
        `,
        params,
      );
    });
    res.json((rows.rows || []).map(mapColaCita));
  } catch (err) {
    console.error('❌ Error en GET /api/citas/cola-triage/:eventoId:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/cola-asignacion/:eventoId', async (req, res) => {
  const { eventoId } = req.params;
  const { especialidad } = req.query;
  try {
    const params = [];
    params.push(eventoId);
    const espFilter = especialidad ? `AND lower(c.especialidad) = lower($${params.length + 1})` : '';
    if (especialidad) params.push(String(especialidad));
    const rows = await pool.query(
      `
      ${colaCitaBaseSelect()}
      WHERE c.evento_id = $1
        AND (
          (c.estado = 'triage_completado')
          OR (c.estado = 'asignando_medico')
          OR (c.saltado_triage = true AND c.estado IN ('llegada_registrada', 'confirmada', 'pendiente'))
          OR (COALESCE(ee.requiere_triage, true) = false AND c.estado IN ('llegada_registrada', 'confirmada', 'pendiente'))
        )
        ${espFilter}
      ORDER BY
        CASE
          WHEN c.saltado_triage = true OR COALESCE(ee.requiere_triage, true) = false THEN 0
          ELSE 1
        END ASC,
        COALESCE(c.prioridad_triage, 3) ASC,
        c.hora_llegada ASC NULLS LAST,
        c.orden_llegada ASC NULLS LAST,
        c.hora ASC NULLS LAST
      `,
      params,
    );
    res.json((rows.rows || []).map(mapColaCita));
  } catch (err) {
    console.error('❌ Error en GET /api/citas/cola-asignacion/:eventoId:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
