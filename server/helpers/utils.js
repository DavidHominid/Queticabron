import pool, { SCHEMA } from '../config/db.js';

// Helper para registrar auditoría de forma centralizada
export async function recordAudit(data) {
  try {
    const { usuario_id, nombre_usuario, rol, accion, detalles, ciudad } = data;
    const idValue = `aud${Date.now()}-${Math.floor(Math.random()*10000)}`;
    await pool.query(
      `INSERT INTO "${SCHEMA}".auditoria (id, usuario_id, nombre_usuario, rol, accion, detalles, fecha_hora, ciudad) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [idValue, usuario_id || null, nombre_usuario || 'Sistema', rol || '---', accion, detalles || '', new Date(), ciudad || 'Sonoyta']
    );
  } catch (err) {
    console.error('⚠️ Fallo al registrar auditoría:', err.message);
  }
}

// Helper para mapear columnas de paciente DB -> Frontend
export const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const calculateAge = (birthday) => {
  if (!birthday) return 0;
  const ageDifMs = Date.now() - new Date(birthday).getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export const mapPaciente = (p) => ({
  id: String(p.id_paciente),
  nombre: `${p.nombre} ${p.apellido || ''}`.trim(),
  fechaNacimiento: formatDate(p.fecha_de_nacimiento),
  sexo: p.sexo,
  telefono: p.telefono,
  numeroExpediente: p.numero_expediente,
  ciudad: p.ciudad,
  fechaRegistro: formatDate(p.fecha_registro),
  edad: p.edad || (p.fecha_de_nacimiento ? calculateAge(p.fecha_de_nacimiento) : 0),
  imagen: p.imagen,
  nacionalidad: p.nacionalidad || 'Mexicana',
  identificacion: p.identificacion || ''
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

export const mapCita = (c) => {
  let feEstado = toFEEstado(c.estado);
  
  if (c.estado === 'confirmada' && c.id_triaje) {
    feEstado = 'en_consulta';
  }

  return {
    id: String(c.id_cita || c.id || ''),
    pacienteId: String(c.id_paciente || ''),
    eventoId: c.evento_id ? String(c.evento_id) : '',
    fecha: c.fecha_cita ? formatDate(c.fecha_cita) : c.fecha,
    hora: c.hora || '08:00',
    especialidad: c.especialidad,
    tipoCitaId: c.tipo_cita_id ? String(c.tipo_cita_id) : undefined,
    tipoCitaNombre: c.tipo_cita_nombre ? String(c.tipo_cita_nombre) : undefined,
    duracionMinutos: Number.isFinite(Number(c.duracion_minutos))
      ? Number(c.duracion_minutos)
      : Number.isFinite(Number(c.tipo_cita_duracion_minutos))
        ? Number(c.tipo_cita_duracion_minutos)
        : undefined,
    medicoEncargado: c.medico_encargado,
    consultorio: c.consultorio,
    estado: feEstado,
    costoPagado: c.costo_pagado || 0
  };
};

export const mapTriage = (t) => ({
  id: String(t.id_triaje),
  citaId: String(t.id_cita || ''),
  pacienteId: String(t.id_paciente || ''),
  fechaHora: t.fecha_triaje || new Date().toISOString(),
  signosVitales: {
    temperatura: t.temperatura,
    presionArterial: t.presion_arterial,
    ritmoCardiaco: t.ritmo_cardiaco,
    frecuenciaRespiratoria: t.frec_respiratoria || t.frecuencia_respiratoria,
    altura: t.altura,
    peso: t.peso,
    saturacionOxigeno: t.saturacion_oxigeno || t.oxigenacion || 98,
    azucarEnSangre: t.azucar_en_sangre || t.glucosa || 100
  },
  observaciones: t.observaciones,
  realizadoPor: t.realizado_por || t.encargado_triaje || 'Sistema'
});

export const mapEvento = (e) => ({
  id: String(e.id || ''),
  nombre: e.titulo || '',
  ciudad: e.ubicacion || 'sonoyta',
  fechaInicioInscripcion: (() => {
    try {
      const meta = typeof e.descripcion === 'string' ? JSON.parse(e.descripcion) : {};
      return meta.fechaInicioInscripcion || null;
    } catch {
      return null;
    }
  })(),
  fechaFinInscripcion: (() => {
    try {
      const meta = typeof e.descripcion === 'string' ? JSON.parse(e.descripcion) : {};
      return meta.fechaFinInscripcion || null;
    } catch {
      return null;
    }
  })(),
  fechaInicio: e.fecha_inicio ? formatDate(e.fecha_inicio) : null,
  fechaFin: e.fecha_fin ? formatDate(e.fecha_fin) : null,
  fechaLimiteInscripcion: (() => {
    try {
      const meta = typeof e.descripcion === 'string' ? JSON.parse(e.descripcion) : {};
      return meta.fechaFinInscripcion || (e.fecha_inicio ? formatDate(e.fecha_inicio) : null);
    } catch {
      return e.fecha_inicio ? formatDate(e.fecha_inicio) : null;
    }
  })(),
  especialidades: e.especialidades || [],
  estado: e.estado || 'activo'
});
