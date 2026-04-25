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
    e.especialidades AS especialidades_legacy,
    ee.id AS evento_especialidad_id,
    ee.especialidad,
    ee.medico_usuario_id,
    ee.medico_nombre_legacy,
    ee.consultorio,
    ee.costo,
    eep.usuario_id AS practicante_usuario_id,
    eh.id AS horario_id,
    eh.dia,
    eh.dia_texto_legacy,
    eh.hora_inicio,
    eh.hora_fin,
    eh.intervalo_minutos,
    eh.cupo_total
  FROM "${SCHEMA}".eventos e
  LEFT JOIN "${SCHEMA}".evento_especialidad ee
    ON ee.evento_id = e.id
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

const normalizeLegacyEspecialidades = (legacy) => {
  if (!Array.isArray(legacy)) return [];
  return legacy.map((esp) => ({
    especialidad: esp?.especialidad || '',
    medicoEncargado: esp?.medicoEncargado || '',
    practicantes: Array.isArray(esp?.practicantes) ? esp.practicantes.map((p) => String(p)).filter(Boolean) : [],
    consultorio: esp?.consultorio || '',
    costo: Number.isFinite(Number(esp?.costo)) ? Number(esp.costo) : 0,
    horarios: Array.isArray(esp?.horarios)
      ? esp.horarios.map((h) => ({
          dia: h?.dia || '',
          horaInicio: String(h?.horaInicio || '').slice(0, 5),
          horaFin: String(h?.horaFin || '').slice(0, 5),
          intervalo: Number.isFinite(Number(h?.intervalo)) ? Number(h.intervalo) : 60,
          cupoTotal: Number.isFinite(Number(h?.cupoTotal)) ? Number(h.cupoTotal) : 1,
        }))
      : [],
  }));
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
        _legacyEspecialidades: row.especialidades_legacy,
      });
    }

    const evento = eventosMap.get(row.id);
    if (!row.evento_especialidad_id) {
      continue;
    }

    if (!evento._especialidadesMap.has(row.evento_especialidad_id)) {
      const especialidad = {
        especialidad: row.especialidad || '',
        medicoEncargado: row.medico_usuario_id || row.medico_nombre_legacy || '',
        practicantes: [],
        consultorio: row.consultorio || '',
        costo: Number.isFinite(Number(row.costo)) ? Number(row.costo) : 0,
        horarios: [],
        _practicantesSet: new Set(),
        _horariosSet: new Set(),
      };
      evento._especialidadesMap.set(row.evento_especialidad_id, especialidad);
      evento.especialidades.push(especialidad);
    }

    const especialidad = evento._especialidadesMap.get(row.evento_especialidad_id);

    if (row.practicante_usuario_id && !especialidad._practicantesSet.has(row.practicante_usuario_id)) {
      especialidad._practicantesSet.add(row.practicante_usuario_id);
      especialidad.practicantes.push(String(row.practicante_usuario_id));
    }

    if (row.horario_id) {
      const key = String(row.horario_id);
      if (!especialidad._horariosSet.has(key)) {
        especialidad._horariosSet.add(key);
        especialidad.horarios.push({
          dia: row.dia ? formatDate(row.dia) : row.dia_texto_legacy || '',
          horaInicio: String(row.hora_inicio || '').slice(0, 5),
          horaFin: String(row.hora_fin || '').slice(0, 5),
          intervalo: Number.isFinite(Number(row.intervalo_minutos)) ? Number(row.intervalo_minutos) : 60,
          cupoTotal: Number.isFinite(Number(row.cupo_total)) ? Number(row.cupo_total) : 1,
        });
      }
    }
  }

  return Array.from(eventosMap.values()).map((evento) => {
    const especialidades =
      evento.especialidades.length > 0 ? evento.especialidades : normalizeLegacyEspecialidades(evento._legacyEspecialidades);

    return {
      id: evento.id,
      nombre: evento.nombre,
      ciudad: evento.ciudad,
      fechaInicioInscripcion: evento.fechaInicioInscripcion,
      fechaFinInscripcion: evento.fechaFinInscripcion,
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin,
      fechaLimiteInscripcion: evento.fechaLimiteInscripcion,
      estado: evento.estado,
      especialidades: especialidades.map((esp) => ({
        especialidad: esp.especialidad,
        medicoEncargado: esp.medicoEncargado,
        practicantes: esp.practicantes,
        consultorio: esp.consultorio,
        costo: esp.costo,
        horarios: esp.horarios,
      })),
    };
  });
};

const fetchEventos = async (client, eventId = null) => {
  const query = `${SELECT_EVENTOS}
    ${eventId ? 'WHERE e.id = $1' : ''}
    ORDER BY e.fecha_inicio DESC, ee.especialidad ASC, eh.dia ASC NULLS LAST, eh.dia_texto_legacy ASC NULLS LAST, eh.hora_inicio ASC NULLS LAST
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
  return horarios.some((h) => {
    if (!h || !h.dia) return false;
    if (String(h.dia) !== String(cita.fecha)) return false;
    const start = timeToMinutes(h.horaInicio);
    const end = timeToMinutes(h.horaFin);
    return horaMin >= start && horaMin < end;
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
  }

  const ids = Array.from(allIds);
  const existingUserIds = new Set();
  if (ids.length > 0) {
    const usersResult = await client.query(`SELECT id FROM "${SCHEMA}".usuarios WHERE id = ANY($1::text[])`, [ids]);
    for (const row of usersResult.rows) {
      existingUserIds.add(String(row.id));
    }
  }

  for (const esp of especialidades || []) {
    const medicoEncargado = String(esp?.medicoEncargado || '').trim();
    const medicoUsuarioId = existingUserIds.has(medicoEncargado) ? medicoEncargado : null;
    const medicoNombreLegacy = medicoUsuarioId ? null : medicoEncargado || null;

    const insertEspecialidad = await client.query(
      `INSERT INTO "${SCHEMA}".evento_especialidad
        (evento_id, especialidad, medico_usuario_id, medico_nombre_legacy, consultorio, costo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        eventId,
        esp?.especialidad || '',
        medicoUsuarioId,
        medicoNombreLegacy,
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

    for (const horario of Array.isArray(esp?.horarios) ? esp.horarios : []) {
      const diaValue = String(horario?.dia || '').trim();
      await client.query(
        `INSERT INTO "${SCHEMA}".evento_horario
          (evento_especialidad_id, dia, dia_texto_legacy, hora_inicio, hora_fin, intervalo_minutos, cupo_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          eventoEspecialidadId,
          isIsoDate(diaValue) ? diaValue : null,
          isIsoDate(diaValue) ? null : (diaValue || null),
          normalizeTime(horario?.horaInicio),
          normalizeTime(horario?.horaFin),
          Number.isFinite(Number(horario?.intervalo)) ? Math.max(1, Math.floor(Number(horario.intervalo))) : 60,
          Number.isFinite(Number(horario?.cupoTotal)) ? Math.max(1, Math.floor(Number(horario.cupoTotal))) : 1,
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
        (id, titulo, descripcion, ubicacion, fecha_inicio_inscripcion, fecha_fin_inscripcion, fecha_inicio, fecha_fin, tipo, estado, especialidades)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
        JSON.stringify(e.especialidades || []),
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
      `SELECT id_cita, fecha_cita, hora, especialidad, estado
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
           estado = $9,
           especialidades = $10
       WHERE id = $11
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
        JSON.stringify(e.especialidades || []),
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

    let deletedTriage = 0;
    let deletedNotas = 0;
    let deletedCitas = 0;

    if (citaIds.length > 0) {
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
