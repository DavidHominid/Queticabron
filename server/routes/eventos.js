import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { formatDate } from '../helpers/utils.js';

const router = express.Router();

const EVENTOS_MODO_PRUEBAS = String(process.env.EVENTOS_MODO_PRUEBAS || '').trim().toLowerCase() === 'true';
const wantsForce = (value) => {
  const v = String(value || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'si' || v === 'sí';
};

const SELECT_EVENTOS = `
  SELECT
    e.id,
    e.titulo,
    e.descripcion,
    e.ubicacion,
    e.fecha_inicio,
    e.fecha_fin,
    e.fecha_inicio_inscripcion,
    e.fecha_fin_inscripcion,
    e.estado,
    e.tipo,
    ee.id AS evento_especialidad_id,
    ee.especialidad,
    ee.medico_usuario_id,
    ee.consultorio,
    ee.costo,
    etc.id AS tipo_cita_id,
    etc.nombre AS tipo_cita_nombre,
    etc.duracion_minutos AS tipo_cita_duracion_minutos,
    etc.precio AS tipo_cita_precio,
    etc.medico_usuario_id AS tipo_cita_medico_usuario_id,
    eep.usuario_id AS practicante_usuario_id,
    eh.id AS horario_id,
    eh.dia,
    eh.hora_inicio,
    eh.hora_fin,
    eh.intervalo_minutos,
    eh.cupo_total,
    eh.evento_tipo_cita_id AS horario_tipo_cita_id
  FROM "${SCHEMA}".eventos e
  LEFT JOIN "${SCHEMA}".evento_especialidad ee
    ON ee.evento_id = e.id
  LEFT JOIN "${SCHEMA}".evento_tipo_cita etc
    ON etc.evento_especialidad_id = ee.id
  LEFT JOIN "${SCHEMA}".evento_especialidad_practicante eep
    ON eep.evento_especialidad_id = ee.id
  LEFT JOIN "${SCHEMA}".evento_horario eh
    ON eh.evento_especialidad_id = ee.id
`;

const parseMetadata = (raw) => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const mapRowsToEventos = (rows) => {
  const eventosMap = new Map();

  for (const row of rows) {
    if (!eventosMap.has(row.id)) {
      const metadata = parseMetadata(row.descripcion);
      eventosMap.set(row.id, {
        id: String(row.id || ''),
        nombre: row.titulo || '',
        ciudad: row.ubicacion || 'sonoyta',
        fechaInicioInscripcion: row.fecha_inicio_inscripcion ? formatDate(row.fecha_inicio_inscripcion) : (metadata.fechaInicioInscripcion || null),
        fechaFinInscripcion: row.fecha_fin_inscripcion ? formatDate(row.fecha_fin_inscripcion) : (metadata.fechaFinInscripcion || null),
        fechaInicio: row.fecha_inicio ? formatDate(row.fecha_inicio) : null,
        fechaFin: row.fecha_fin ? formatDate(row.fecha_fin) : null,
        fechaLimiteInscripcion:
          (row.fecha_fin_inscripcion ? formatDate(row.fecha_fin_inscripcion) : null) ||
          metadata.fechaFinInscripcion ||
          (row.fecha_inicio ? formatDate(row.fecha_inicio) : null),
        estado: row.estado || 'activo',
        especialidades: [],
        _especialidadesMap: new Map(),
      });
    }

    const evento = eventosMap.get(row.id);
    if (!row.evento_especialidad_id) {
      continue;
    }

    if (!evento._especialidadesMap.has(row.evento_especialidad_id)) {
      const especialidad = {
        especialidad: row.especialidad || '',
        medicoEncargado: row.medico_usuario_id || '',
        practicantes: [],
        consultorio: row.consultorio || '',
        costo: Number.isFinite(Number(row.costo)) ? Number(row.costo) : 0,
        tiposCita: [],
        horarios: [],
        _practicantesSet: new Set(),
        _tiposSet: new Set(),
        _horariosSet: new Set(),
      };
      evento._especialidadesMap.set(row.evento_especialidad_id, especialidad);
      evento.especialidades.push(especialidad);
    }

    const especialidad = evento._especialidadesMap.get(row.evento_especialidad_id);

    if (row.tipo_cita_id) {
      const key = String(row.tipo_cita_id);
      if (!especialidad._tiposSet.has(key)) {
        especialidad._tiposSet.add(key);
        especialidad.tiposCita.push({
          id: key,
          nombre: row.tipo_cita_nombre || '',
          duracionMinutos: Number.isFinite(Number(row.tipo_cita_duracion_minutos)) ? Number(row.tipo_cita_duracion_minutos) : 60,
          precio: Number.isFinite(Number(row.tipo_cita_precio)) ? Number(row.tipo_cita_precio) : 0,
          medicoEncargado: row.tipo_cita_medico_usuario_id || '',
        });
      }
    }

    if (row.practicante_usuario_id && !especialidad._practicantesSet.has(row.practicante_usuario_id)) {
      especialidad._practicantesSet.add(row.practicante_usuario_id);
      especialidad.practicantes.push(String(row.practicante_usuario_id));
    }

    if (row.horario_id) {
      const key = String(row.horario_id);
      if (!especialidad._horariosSet.has(key)) {
        especialidad._horariosSet.add(key);
        especialidad.horarios.push({
          dia: row.dia ? formatDate(row.dia) : '',
          horaInicio: String(row.hora_inicio || '').slice(0, 5),
          horaFin: String(row.hora_fin || '').slice(0, 5),
          intervalo: Number.isFinite(Number(row.intervalo_minutos)) ? Number(row.intervalo_minutos) : 60,
          cupoTotal: Number.isFinite(Number(row.cupo_total)) ? Number(row.cupo_total) : 1,
          tipoCitaId: row.horario_tipo_cita_id ? String(row.horario_tipo_cita_id) : undefined,
        });
      }
    }
  }

  return Array.from(eventosMap.values()).map((evento) => ({
    id: evento.id,
    nombre: evento.nombre,
    ciudad: evento.ciudad,
    fechaInicioInscripcion: evento.fechaInicioInscripcion,
    fechaFinInscripcion: evento.fechaFinInscripcion,
    fechaInicio: evento.fechaInicio,
    fechaFin: evento.fechaFin,
    fechaLimiteInscripcion: evento.fechaLimiteInscripcion,
    estado: evento.estado,
    especialidades: evento.especialidades.map((esp) => ({
      especialidad: esp.especialidad,
      medicoEncargado: esp.medicoEncargado,
      practicantes: esp.practicantes,
      consultorio: esp.consultorio,
      costo: esp.costo,
      tiposCita: Array.isArray(esp.tiposCita) ? esp.tiposCita : [],
      horarios: esp.horarios,
    })),
  }));
};

const fetchEventos = async (client, eventId = null) => {
  const query = `${SELECT_EVENTOS}
    ${eventId ? 'WHERE e.id = $1' : ''}
    ORDER BY e.fecha_inicio DESC, ee.especialidad ASC, eh.dia ASC NULLS LAST, eh.hora_inicio ASC NULLS LAST
  `;
  const result = eventId ? await client.query(query, [eventId]) : await client.query(query);
  return mapRowsToEventos(result.rows);
};

const buildMetadata = (evento) =>
  JSON.stringify({
    fechaInicioInscripcion: evento.fechaInicioInscripcion || '',
    fechaFinInscripcion: evento.fechaFinInscripcion || evento.fechaLimiteInscripcion || '',
  });

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const normalizeTime = (value) => String(value || '').slice(0, 5) || '08:00';

const timeToMinutes = (t) => {
  const parts = String(t || '').split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const computeDefaultCupo = (horario) => {
  const intervalo = Number.isFinite(Number(horario?.intervalo)) ? Math.max(1, Math.floor(Number(horario.intervalo))) : 60;
  const dur = Math.max(0, timeToMinutes(horario?.horaFin) - timeToMinutes(horario?.horaInicio));
  return intervalo ? Math.floor(dur / intervalo) : 0;
};

const computeCupoForHorario = (horario) => {
  const direct = Number.isFinite(Number(horario?.cupoTotal)) ? Math.max(0, Math.floor(Number(horario.cupoTotal))) : 0;
  return direct || computeDefaultCupo(horario);
};

const citaCoveredByEspecialidades = (cita, especialidadesPayload) => {
  const espList = Array.isArray(especialidadesPayload) ? especialidadesPayload : [];
  const esp = espList.find((e) => e && e.especialidad === cita.especialidad);
  if (!esp) return false;
  const horarios = Array.isArray(esp.horarios) ? esp.horarios : [];
  const horaMin = timeToMinutes(cita.hora);
  const durMin = Number.isFinite(Number(cita.duracionMinutos)) ? Math.max(0, Math.floor(Number(cita.duracionMinutos))) : 0;
  return horarios.some((h) => {
    if (!h || !h.dia) return false;
    if (String(h.dia) !== String(cita.fecha)) return false;
    if (cita.tipoCitaId && String(h.tipoCitaId || '') !== String(cita.tipoCitaId)) return false;
    const start = timeToMinutes(h.horaInicio);
    const end = timeToMinutes(h.horaFin);
    const endCita = horaMin + durMin;
    return horaMin >= start && (durMin ? endCita <= end : horaMin < end);
  });
};

const countCitasInWindow = (citas, day, start, end) => {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return citas.filter((c) => {
    if (String(c.fecha) !== String(day)) return false;
    const m = timeToMinutes(c.hora);
    return m >= s && m < e;
  }).length;
};

const persistEspecialidades = async (client, eventId, especialidades) => {
  const allIds = new Set();
  for (const esp of especialidades || []) {
    if (esp?.medicoEncargado) allIds.add(String(esp.medicoEncargado));
    for (const pract of esp?.practicantes || []) {
      if (pract) allIds.add(String(pract));
    }
    for (const tipo of esp?.tiposCita || []) {
      if (tipo?.medicoEncargado) allIds.add(String(tipo.medicoEncargado));
    }
  }

  const ids = Array.from(allIds);
  const existingUserIds = new Set();
  if (ids.length > 0) {
    const usersResult = await client.query(`SELECT id_usuario AS id FROM public.usuarios WHERE id_usuario::text = ANY($1::text[])`, [ids]);
    for (const row of usersResult.rows) {
      existingUserIds.add(String(row.id));
    }
  }

  const medicoEspecialidades = new Set();
  if (ids.length > 0) {
    try {
      await client.query('SAVEPOINT sp_especialidades');
      const relRes = await client.query(
        `SELECT usuario_id::text AS usuario_id, especialidad_codigo::text AS especialidad_codigo
         FROM "${SCHEMA}".usuario_especialidades
         WHERE usuario_id = ANY($1::text[])`,
        [ids],
      );
      await client.query('RELEASE SAVEPOINT sp_especialidades');
      for (const row of relRes.rows || []) {
        medicoEspecialidades.add(`${String(row.usuario_id)}|${String(row.especialidad_codigo)}`);
      }
    } catch {
      try { await client.query('ROLLBACK TO SAVEPOINT sp_especialidades'); } catch { /* ignorar */ }
    }
  }

  for (const esp of especialidades || []) {
    const medicoEncargado = String(esp?.medicoEncargado || '').trim();
    const medicoUsuarioId =
      existingUserIds.has(medicoEncargado) && medicoEspecialidades.size > 0 && medicoEspecialidades.has(`${medicoEncargado}|${String(esp?.especialidad || '')}`)
        ? medicoEncargado
        : null;

    const insertEspecialidad = await client.query(
      `INSERT INTO "${SCHEMA}".evento_especialidad
        (evento_id, especialidad, medico_usuario_id, consultorio, costo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        eventId,
        esp?.especialidad || '',
        medicoUsuarioId,
        esp?.consultorio || null,
        Number.isFinite(Number(esp?.costo)) ? Number(esp.costo) : 0,
      ],
    );

    const eventoEspecialidadId = insertEspecialidad.rows[0].id;

    for (const practicante of Array.isArray(esp?.practicantes) ? esp.practicantes : []) {
      const usuarioId = String(practicante || '').trim();
      if (!existingUserIds.has(usuarioId)) continue;
      await client.query(
        `INSERT INTO "${SCHEMA}".evento_especialidad_practicante (evento_especialidad_id, usuario_id)
         VALUES ($1, $2)
         ON CONFLICT (evento_especialidad_id, usuario_id) DO NOTHING`,
        [eventoEspecialidadId, usuarioId],
      );
    }

    const tipoIdMap = new Map();
    for (const tipo of Array.isArray(esp?.tiposCita) ? esp.tiposCita : []) {
      const nombre = String(tipo?.nombre || '').trim();
      if (!nombre) continue;
      const clientTipoId = String(tipo?.id || '').trim();
      const medicoEncargado = String(tipo?.medicoEncargado || '').trim();
      const medicoUsuarioId =
        existingUserIds.has(medicoEncargado) && medicoEspecialidades.size > 0 && medicoEspecialidades.has(`${medicoEncargado}|${String(esp?.especialidad || '')}`)
          ? medicoEncargado
          : null;
      const inserted = await client.query(
        `INSERT INTO "${SCHEMA}".evento_tipo_cita
          (evento_especialidad_id, nombre, duracion_minutos, precio, medico_usuario_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          eventoEspecialidadId,
          nombre,
          Number.isFinite(Number(tipo?.duracionMinutos)) ? Math.max(5, Math.floor(Number(tipo.duracionMinutos))) : 60,
          Number.isFinite(Number(tipo?.precio)) ? Number(tipo.precio) : 0,
          medicoUsuarioId,
        ],
      );
      const newId = inserted.rows?.[0]?.id;
      if (clientTipoId && newId) tipoIdMap.set(clientTipoId, Number(newId));
    }

    for (const horario of Array.isArray(esp?.horarios) ? esp.horarios : []) {
      const diaValue = String(horario?.dia || '').trim();
      const key = String(horario?.tipoCitaId || '').trim();
      const mapped = tipoIdMap.has(key) ? tipoIdMap.get(key) : null;
      const numeric = Number.isFinite(Number(key)) ? Number(key) : null;
      const tipoCitaId = mapped || numeric || null;
      await client.query(
        `INSERT INTO "${SCHEMA}".evento_horario
          (evento_especialidad_id, dia, hora_inicio, hora_fin, intervalo_minutos, cupo_total, evento_tipo_cita_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          eventoEspecialidadId,
          isIsoDate(diaValue) ? diaValue : null,
          normalizeTime(horario?.horaInicio),
          normalizeTime(horario?.horaFin),
          Number.isFinite(Number(horario?.intervalo)) ? Math.max(1, Math.floor(Number(horario.intervalo))) : 60,
          Number.isFinite(Number(horario?.cupoTotal)) ? Math.max(1, Math.floor(Number(horario.cupoTotal))) : 1,
          tipoCitaId,
        ],
      );
    }
  }
};

router.post('/', async (req, res) => {
  const e = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eventId = e.id || `evt${Date.now()}`;
    const metadata = buildMetadata(e);

    await client.query(
      `INSERT INTO "${SCHEMA}".eventos
        (id, titulo, descripcion, ubicacion, fecha_inicio_inscripcion, fecha_fin_inscripcion, fecha_inicio, fecha_fin, tipo, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        eventId,
        e.nombre,
        metadata,
        String(e.ciudad || 'sonoyta').toLowerCase(),
        e.fechaInicioInscripcion || null,
        e.fechaFinInscripcion || e.fechaLimiteInscripcion || null,
        e.fechaInicio,
        e.fechaFin,
        e.tipo || 'general',
        e.estado || 'activo',
      ],
    );

    await persistEspecialidades(client, eventId, e.especialidades || []);
    await client.query('COMMIT');

    const [saved] = await fetchEventos(pool, eventId);
    res.status(201).json(saved);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en POST /api/eventos:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const e = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockRes = await client.query(
      `SELECT fecha_fin, (fecha_fin IS NOT NULL AND CURRENT_DATE > fecha_fin) AS locked
       FROM "${SCHEMA}".eventos
       WHERE id = $1`,
      [id],
    );
    if (!lockRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    const locked = Boolean(lockRes.rows[0].locked);
    const force = EVENTOS_MODO_PRUEBAS && wantsForce(req.query?.force);
    if (locked && !force) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Este evento ya finalizó. No se puede modificar.' });
    }

    const citasResult = await client.query(
      `SELECT id_cita, fecha_cita, hora, especialidad, estado, tipo_cita_id, duracion_minutos
       FROM "${SCHEMA}".citas
       WHERE evento_id = $1 AND estado != 'cancelada'`,
      [id],
    );
    const citasEvento = (citasResult.rows || []).map((row) => ({
      id: String(row.id_cita),
      fecha: formatDate(row.fecha_cita) || null,
      hora: row.hora || '08:00',
      especialidad: row.especialidad,
      estado: row.estado,
      tipoCitaId: row.tipo_cita_id ? String(row.tipo_cita_id) : null,
      duracionMinutos: Number.isFinite(Number(row.duracion_minutos)) ? Number(row.duracion_minutos) : null,
    }));
    const citasValidas = citasEvento.filter((c) => c.fecha && c.especialidad);

    const especialidadesPayload = Array.isArray(e.especialidades) ? e.especialidades : [];
    const invalidas = citasValidas.filter((c) => !citaCoveredByEspecialidades(c, especialidadesPayload));
    if (invalidas.length > 0) {
      await client.query('ROLLBACK');
      const sample = invalidas.slice(0, 3).map((c) => `${c.especialidad} ${c.fecha} ${c.hora}`).join(', ');
      return res.status(400).json({
        error:
          `No puedes guardar el evento porque dejarías citas sin horario. ` +
          `Asegura que estos horarios sigan existiendo: ${sample}${invalidas.length > 3 ? '…' : ''}`,
      });
    }

    for (const esp of especialidadesPayload) {
      const horarios = Array.isArray(esp?.horarios) ? esp.horarios : [];
      const citasEsp = citasValidas.filter((c) => c.especialidad === esp?.especialidad);
      for (const h of horarios) {
        if (!h?.dia || !h?.horaInicio || !h?.horaFin) continue;
        if (!isIsoDate(h.dia)) continue;
        const cupo = computeCupoForHorario(h);
        const ocupadas = countCitasInWindow(
          citasEsp.filter((c) => c.fecha === h.dia),
          h.dia,
          h.horaInicio,
          h.horaFin,
        );
        if (ocupadas > cupo) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error:
              `No puedes reducir cupos por debajo de las citas existentes. ` +
              `${esp.especialidad} ${h.dia} ${h.horaInicio}-${h.horaFin} tiene ${ocupadas} cita(s) pero el cupo es ${cupo}.`,
          });
        }
      }
    }

    const metadata = buildMetadata(e);
    const updateResult = await client.query(
      `UPDATE "${SCHEMA}".eventos
       SET titulo = $1,
           descripcion = $2,
           ubicacion = $3,
           fecha_inicio_inscripcion = $4,
           fecha_fin_inscripcion = $5,
           fecha_inicio = $6,
           fecha_fin = $7,
           tipo = $8,
           estado = $9
       WHERE id = $10
       RETURNING id`,
      [
        e.nombre,
        metadata,
        String(e.ciudad || 'sonoyta').toLowerCase(),
        e.fechaInicioInscripcion || null,
        e.fechaFinInscripcion || e.fechaLimiteInscripcion || null,
        e.fechaInicio,
        e.fechaFin,
        e.tipo || 'general',
        e.estado,
        id,
      ],
    );

    if (!updateResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    await client.query(`DELETE FROM "${SCHEMA}".evento_especialidad WHERE evento_id = $1`, [id]);
    await persistEspecialidades(client, id, e.especialidades || []);
    await client.query('COMMIT');

    const [saved] = await fetchEventos(pool, id);
    res.json(saved);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en PUT /api/eventos:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockRes = await client.query(
      `SELECT fecha_fin, (fecha_fin IS NOT NULL AND CURRENT_DATE > fecha_fin) AS locked
       FROM "${SCHEMA}".eventos
       WHERE id = $1`,
      [id],
    );
    if (!lockRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    const locked = Boolean(lockRes.rows[0].locked);
    const force = EVENTOS_MODO_PRUEBAS && wantsForce(req.query?.force);
    if (locked && !force) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Este evento ya finalizó. No se puede eliminar.' });
    }

    const citasRes = await client.query(`SELECT id_cita FROM "${SCHEMA}".citas WHERE evento_id = $1`, [id]);
    const citaIds = (citasRes.rows || [])
      .map((r) => Number(r.id_cita))
      .filter((n) => Number.isFinite(n));

    let deletedExpedienteCita = 0;
    let deletedTriage = 0;
    let deletedNotas = 0;
    let deletedCitas = 0;

    if (citaIds.length > 0) {
      const expDel = await client.query(`DELETE FROM "${SCHEMA}".expediente WHERE id_cita = ANY($1::int[])`, [citaIds]);
      deletedExpedienteCita = expDel.rowCount || 0;

      const triageDel = await client.query(`DELETE FROM "${SCHEMA}".triaje WHERE id_cita = ANY($1::int[])`, [citaIds]);
      deletedTriage = triageDel.rowCount || 0;

      const notaColRes = await client.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = $1
           AND table_name = 'nota_medica'
           AND column_name IN ('id_cita', 'cita_id')
         LIMIT 1`,
        [SCHEMA],
      );

      if (notaColRes.rows.length) {
        const col = String(notaColRes.rows[0].column_name);
        const citaIdsText = citaIds.map(String);
        const notasDel = await client.query(
          `DELETE FROM "${SCHEMA}".nota_medica WHERE "${col}"::text = ANY($1::text[])`,
          [citaIdsText],
        );
        deletedNotas = notasDel.rowCount || 0;
      }

      const citasDel = await client.query(`DELETE FROM "${SCHEMA}".citas WHERE id_cita = ANY($1::int[])`, [citaIds]);
      deletedCitas = citasDel.rowCount || 0;
    }

    const espRes = await client.query(`SELECT id FROM "${SCHEMA}".evento_especialidad WHERE evento_id = $1`, [id]);
    const espIds = (espRes.rows || []).map((r) => String(r.id)).filter(Boolean);

    let deletedHorarios = 0;
    let deletedPracticantes = 0;

    if (espIds.length > 0) {
      const horariosDel = await client.query(
        `DELETE FROM "${SCHEMA}".evento_horario WHERE evento_especialidad_id = ANY($1::bigint[])`,
        [espIds],
      );
      deletedHorarios = horariosDel.rowCount || 0;

      const practDel = await client.query(
        `DELETE FROM "${SCHEMA}".evento_especialidad_practicante WHERE evento_especialidad_id = ANY($1::bigint[])`,
        [espIds],
      );
      deletedPracticantes = practDel.rowCount || 0;
    }

    const espDel = await client.query(`DELETE FROM "${SCHEMA}".evento_especialidad WHERE evento_id = $1`, [id]);
    const deletedEspecialidades = espDel.rowCount || 0;

    const evDel = await client.query(`DELETE FROM "${SCHEMA}".eventos WHERE id = $1`, [id]);
    const deletedEventos = evDel.rowCount || 0;

    await client.query('COMMIT');
    res.json({
      success: true,
      deleted: {
        eventos: deletedEventos,
        especialidades: deletedEspecialidades,
        horarios: deletedHorarios,
        practicantes: deletedPracticantes,
        citas: deletedCitas,
        notas_medicas: deletedNotas,
        triaje: deletedTriage,
        expediente_cita: deletedExpedienteCita,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en DELETE /api/eventos/:id:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/', async (_req, res) => {
  try {
    const eventos = await fetchEventos(pool);
    res.json(eventos);
  } catch (err) {
    console.error('❌ Error en GET /api/eventos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
