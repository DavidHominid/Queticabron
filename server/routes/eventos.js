import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { formatDate } from '../helpers/utils.js';

const router = express.Router();

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
        e.ciudad || 'Sonoyta',
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
        e.ciudad,
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
