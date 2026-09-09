import pool, { SCHEMA } from '../config/db.js';

// Helper para registrar auditoría de forma centralizada
export async function recordAudit(data) {
  try {
    const { usuario_id, nombre_usuario, rol, accion, detalles, ciudad, paciente_id } = data;
    const idValue = `aud${Date.now()}-${Math.floor(Math.random()*10000)}`;

    const pacienteIdValue = Number.isFinite(Number(paciente_id)) ? parseInt(String(paciente_id), 10) : null;
    if (pacienteIdValue !== null) {
      try {
        await pool.query(
          `INSERT INTO "${SCHEMA}".auditoria (id, usuario_id, nombre_usuario, rol, accion, detalles, fecha_hora, ciudad, paciente_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            idValue,
            usuario_id || null,
            nombre_usuario || 'Sistema',
            rol || '---',
            accion,
            detalles || '',
            new Date(),
            ciudad || 'Sonoyta',
            pacienteIdValue,
          ],
        );
        return;
      } catch {}
    }

    await pool.query(
      `INSERT INTO "${SCHEMA}".auditoria (id, usuario_id, nombre_usuario, rol, accion, detalles, fecha_hora, ciudad) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [idValue, usuario_id || null, nombre_usuario || 'Sistema', rol || '---', accion, detalles || '', new Date(), ciudad || 'Sonoyta'],
    );
  } catch (err) {
    console.error('⚠️ Fallo al registrar auditoría:', err.message);
  }
}

const safeDate = (raw) => {
  if (raw === null || raw === undefined || raw === '') return null;
  if (raw instanceof Date) {
    const t = raw.getTime();
    if (!Number.isFinite(t)) return null;
    return new Date(t);
  }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    const d = new Date(raw);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const s = String(raw);
  if (!s.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00.000Z');
    if (Number.isFinite(d.getTime())) return d;
  }
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
};

export const safeIso = (raw, fallback = null) => {
  const d = safeDate(raw);
  return d ? d.toISOString() : fallback;
};

// Helper para mapear columnas de paciente DB -> Frontend
export const formatDate = (date) => {
  const d = safeDate(date);
  if (!d) return null;
  return d.toISOString().split('T')[0];
};

export const calculateAge = (birthday) => {
  const b = safeDate(birthday);
  if (!b) return 0;
  const ageDifMs = Date.now() - b.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export const mapPaciente = (p) => ({
  id: String(p.id_paciente),
  nombre: p.nombre || '',
  apellido: p.apellido || '',
  fechaNacimiento: formatDate(p.fecha_de_nacimiento),
  sexo: p.sexo,
  telefono: p.telefono,
  numeroExpediente: p.numero_expediente,
  ciudad: p.ciudad,
  fechaRegistro: formatDate(p.fecha_registro),
  edad: p.edad || (p.fecha_de_nacimiento ? calculateAge(p.fecha_de_nacimiento) : 0),
  eliminado: Boolean(p.eliminado),
  eliminadoEn: safeIso(p.eliminado_en),
  eliminadoPor: p.eliminado_por ? String(p.eliminado_por) : null,
  origenExpediente: p.origen_expediente || 'sistema',
  fechaCapturaDigitalPaciente: safeIso(p.fecha_captura_digital_paciente),
  capturadoPorUsuarioId: p.capturado_por_usuario_id ? String(p.capturado_por_usuario_id) : null,
  observacionesCaptura: p.observaciones_captura ?? null,
});

// La BD usa texto libre para estado de citas
export const toFEEstado = (dbEstado) => {
  const map = {
    'pendiente':  'programada',
    'confirmada': 'en_triage',
    'completada': 'completada',
    'cancelada':  'cancelada',
    'atendida':   'completada',
    'noshow':     'no_asistio',
    'cedida':     'cedida',
    'en_triage':  'en_triage',
    'en_consulta':'en_consulta',
  };
  return map[dbEstado] ?? dbEstado;
};

export const toDBEstado = (feEstado) => {
  const map = {
    'programada':  'pendiente',
    'en_triage':   'confirmada',
    'en_consulta': 'confirmada',
    'completada':  'completada',
    'cancelada':   'cancelada',
    'cancelado':   'cancelada',
    'no_asistio':  'noshow',
    'cedida':      'cedida',
  };
  return map[feEstado] ?? 'pendiente';
};

export const normalizeHora = (hora) => {
  const s = String(hora || '').trim();
  if (!s) return null;
  const [hRaw, mRaw] = s.split(':');
  const hh = Number(hRaw);
  const mm = Number(mRaw ?? 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

export const mapCita = (c) => {
  if (!c) {
    const fallback = new Date();
    return {
      id: '',
      pacienteId: '',
      eventoId: 'general',
      fecha: formatDate(fallback),
      hora: '08:00',
      especialidad: undefined,
      tipoCitaId: undefined,
      tipoCitaNombre: undefined,
      duracionMinutos: undefined,
      medicoEncargado: undefined,
      consultorio: undefined,
      estado: 'programada',
      costoPagado: 0,
      origen: 'sistema',
      fechaCapturaCita: null,
      fechaCreacion: fallback.toISOString(),
    };
  }
  let feEstado = toFEEstado(c.estado);

  if (String(c.estado || '') === 'confirmada' && Boolean(c.id_triaje)) {
    feEstado = 'en_consulta';
  }

  const fechaFecha = safeDate(c.fecha_cita);
  let fechaCreacion = safeIso(c.created_at ?? c.fecha_registro ?? null);
  if (!fechaCreacion && fechaFecha) {
    const cloned = new Date(fechaFecha.getTime());
    cloned.setUTCHours(9, 0, 0, 0);
    fechaCreacion = cloned.toISOString();
  }
  if (!fechaCreacion) {
    fechaCreacion = new Date().toISOString();
  }

  return {
    id: String(c.id_cita ?? c.id ?? ''),
    pacienteId: String(c.id_paciente ?? ''),
    eventoId: c.evento_id ? String(c.evento_id) : 'general',
    fecha: formatDate(c.fecha_cita) ?? (c.fecha ? formatDate(c.fecha) : null),
    hora: normalizeHora(c.hora) || '08:00',
    especialidad: c.especialidad,
    tipoCitaId: c.tipo_cita_id != null ? String(c.tipo_cita_id) : undefined,
    tipoCitaNombre: c.tipo_cita_nombre ? String(c.tipo_cita_nombre) : undefined,
    duracionMinutos: Number.isFinite(Number(c.duracion_minutos))
      ? Number(c.duracion_minutos)
      : Number.isFinite(Number(c.tipo_cita_duracion_minutos))
        ? Number(c.tipo_cita_duracion_minutos)
        : undefined,
    medicoEncargado: c.medico_encargado,
    consultorio: c.consultorio,
    estado: feEstado,
    costoPagado: Number.isFinite(Number(c.costo_pagado)) ? Number(c.costo_pagado) : 0,
    origen: c.origen || 'sistema',
    fechaCapturaCita: safeIso(c.fecha_captura_cita),
    fechaCreacion,
  };
};

export const mapTriage = (t) => ({
  id: String(t?.id_triaje ?? ''),
  citaId: String(t?.id_cita ?? ''),
  pacienteId: String(t?.id_paciente ?? ''),
  fechaHora: safeIso(t?.fecha_triaje ?? null, new Date().toISOString()),
  signosVitales: {
    temperatura: t?.temperatura ?? null,
    presionArterial: t?.presion_arterial ?? null,
    ritmoCardiaco: t?.ritmo_cardiaco ?? null,
    frecuenciaRespiratoria: t?.frec_respiratoria ?? t?.frecuencia_respiratoria ?? null,
    altura: t?.altura ?? null,
    peso: t?.peso ?? null,
    saturacionOxigeno: t?.saturacion_oxigeno ?? t?.oxigenacion ?? null,
    azucarEnSangre: t?.azucar_en_sangre ?? t?.glucosa ?? null,
  },
  observaciones: t?.observaciones ?? null,
  realizadoPor: t?.realizado_por ?? t?.encargado_triaje ?? 'Sistema',
});

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const mapConsultaMedica = (n) => {
  const fechaRaw = n?.fecha_hora ?? n?.fecha ?? n?.fecha_nota ?? n?.fechaHora ?? n?.created_at ?? n?.createdAt ?? null;
  let fechaHora = safeIso(fechaRaw);
  if (!fechaHora && fechaRaw && typeof fechaRaw === 'string' && String(fechaRaw).length === 10) {
    fechaHora = safeIso(String(fechaRaw) + 'T12:00:00');
  }
  if (!fechaHora) fechaHora = new Date().toISOString();

  return {
    id: String(n?.id_nota ?? n?.id ?? ''),
    citaId: String(n?.id_cita ?? n?.cita_id ?? n?.citaId ?? ''),
    pacienteId: String(n?.id_paciente ?? n?.paciente_id ?? n?.pacienteId ?? ''),
    medicoEncargado: String(n?.medico_usuario_id ?? n?.id_doctor ?? n?.medico_encargado ?? n?.medicoEncargado ?? n?.medico ?? ''),
    especialidad: n?.especialidad ?? 'medicina_familiar',
    fechaHora,
    motivoConsulta: String(n?.motivo_consulta ?? n?.motivoConsulta ?? ''),
    padecimientoActual: String(n?.padecimiento_actual ?? n?.padecimientoActual ?? ''),
    exploracionFisica: String(n?.exploracion_fisica ?? n?.exploracionFisica ?? ''),
    diagnostico: String(n?.diagnostico ?? ''),
    tratamiento: String(n?.tratamiento ?? n?.plan_tratamiento ?? ''),
    medicamentosRecetados: parseJsonArray(n?.medicamentos ?? n?.medicamentos_recetados ?? n?.medicamentosRecetados),
    estudiosIndicados: parseJsonArray(n?.estudios_indicados ?? n?.estudiosIndicados),
    requiereCirugia: Boolean(n?.requiere_cirugia ?? n?.requiereCirugia),
    recomendaciones: String(n?.indicaciones ?? n?.recomendaciones ?? ''),
    proximaConsulta: n?.proxima_cita ?? n?.proximaConsulta ?? undefined,
    requiereSeguimiento: Boolean(n?.requiere_seguimiento ?? n?.requiereSeguimiento),
    notaSeguimiento: String(n?.nota_seguimiento ?? n?.notaSeguimiento ?? ''),
    eventoSeguimientoId: String(n?.evento_seguimiento_id ?? n?.eventoSeguimientoId ?? '').trim() || undefined,
  };
};

export const mapEvento = (e) => ({
  id: String(e?.id || ''),
  nombre: e?.titulo || '',
  ciudad: e?.ubicacion || 'sonoyta',
  fechaInicioInscripcion: (() => {
    try {
      const meta = typeof e?.descripcion === 'string' ? JSON.parse(e.descripcion) : {};
      return meta?.fechaInicioInscripcion ? formatDate(meta.fechaInicioInscripcion) : null;
    } catch {
      return null;
    }
  })(),
  fechaFinInscripcion: (() => {
    try {
      const meta = typeof e?.descripcion === 'string' ? JSON.parse(e.descripcion) : {};
      return meta?.fechaFinInscripcion ? formatDate(meta.fechaFinInscripcion) : null;
    } catch {
      return null;
    }
  })(),
  fechaInicio: e?.fecha_inicio ? formatDate(e.fecha_inicio) : null,
  fechaFin: e?.fecha_fin ? formatDate(e.fecha_fin) : null,
  fechaLimiteInscripcion: (() => {
    try {
      const meta = typeof e?.descripcion === 'string' ? JSON.parse(e.descripcion) : {};
      if (meta?.fechaFinInscripcion) return formatDate(meta.fechaFinInscripcion);
      return e?.fecha_inicio ? formatDate(e.fecha_inicio) : null;
    } catch {
      return e?.fecha_inicio ? formatDate(e.fecha_inicio) : null;
    }
  })(),
  especialidades: e?.especialidades || [],
  estado: e?.estado || 'activo',
});
