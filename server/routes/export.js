import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import * as XLSX from 'xlsx';

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

const ESTADOS_LABEL = {
  programada: 'Programada',
  llegada_registrada: 'Llegada Registrada',
  en_triage: 'En Triaje',
  triage_completado: 'Triaje OK',
  asignando_medico: 'Asignando Médico',
  en_consulta: 'En Consulta',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

const safeStr = (v, fallback = '') => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString().substring(0, 10);
  return String(v);
};

const ymd = (v) => {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().substring(0, 10);
  const s = String(v).split('T')[0];
  return s || '';
};

// Consulta base de citas para exportación con filtros
// Robusta ante variantes históricas del esquema:
//  - Tipos de cita: detectCitasTipoCitaRef detecta la tabla FK real; JOIN condicional.
//  - Triaje: columnas via to_jsonb->> (devuelve NULL si columna no existe, sin error de parseo).
const fetchCitasExport = async (q) => {
  const { fechaDesde, fechaHasta, eventoId, especialidad, estado, ciudad, medicoId } = q || {};
  const params = [];
  const where = [];

  if (fechaDesde) {
    params.push(fechaDesde);
    where.push(`c.fecha_cita >= $${params.length}::date`);
  }
  if (fechaHasta) {
    params.push(fechaHasta);
    where.push(`c.fecha_cita <= $${params.length}::date`);
  }
  if (eventoId) {
    params.push(String(eventoId).trim());
    where.push(`c.evento_id = $${params.length}`);
  }
  if (especialidad) {
    params.push(String(especialidad).trim());
    where.push(`lower(c.especialidad) = lower($${params.length})`);
  }
  if (estado) {
    params.push(String(estado).trim());
    where.push(`lower(c.estado) = lower($${params.length})`);
  }
  if (ciudad) {
    const c = String(ciudad)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_');
    params.push(c);
    where.push(`lower(regexp_replace(regexp_replace(COALESCE(p.ciudad,''), '\\s+', '_', 'g'), '-+', '_', 'g')) = $${params.length}`);
  }
  if (medicoId) {
    params.push(String(medicoId).trim());
    where.push(`lower(c.medico_encargado) = lower($${params.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const tipoRef = await detectCitasTipoCitaRef();
  const joinTipo = tipoRef
    ? `LEFT JOIN "${SCHEMA}".${tipoRef} tref ON c.tipo_cita_id = tref.id`
    : '';
  const colTipoNombre = tipoRef ? 'COALESCE(tref.nombre, \'\')' : '\'\'';

  const query = `
    SELECT
      c.id_cita AS id_cita,
      c.fecha_cita AS fecha,
      c.hora AS hora,
      c.duracion_minutos AS duracion_minutos,
      c.especialidad AS especialidad,
      c.estado AS estado,
      c.orden_llegada AS orden_llegada,
      c.saltado_triage AS saltado_triage,
      c.prioridad_triage AS prioridad_triage,
      c.medico_encargado AS medico_encargado,
      c.observaciones AS observaciones,
      c.evento_id AS evento_id,
      p.id_paciente AS paciente_id,
      p.nombre AS paciente_nombre,
      p.apellido AS paciente_apellido,
      p.telefono AS paciente_telefono,
      p.ciudad AS paciente_ciudad,
      e.titulo AS evento_nombre,
      e.ubicacion AS evento_ciudad,
      ${colTipoNombre} AS tipo_cita_nombre,
      COALESCE(pu.nombre_usuario, pu.correo, c.medico_encargado) AS medico_nombre_completo,
      COALESCE(t.fecha_triaje, t.fecha_hora, t.fecha) AS triaje_fecha,
      COALESCE(t.realizado_por, t.encargado_triaje, '') AS triaje_realizado_por,
      to_jsonb(c)->>'origen' AS origen_cita,
      COALESCE(to_jsonb(c)->>'especialidad_otra', to_jsonb(c)->>'especialidadOtra') AS especialidad_otra_texto,
      to_jsonb(c)->>'costo_pagado' AS costo_pagado,
      to_jsonb(c)->>'fecha_captura_cita' AS fecha_captura_cita,
      COALESCE(to_jsonb(c)->>'encargado_triaje', to_jsonb(c)->>'encargadoTriage') AS encargado_triaje_cita
    FROM "${SCHEMA}".citas c
    LEFT JOIN "${SCHEMA}".paciente p ON c.id_paciente = p.id_paciente
    LEFT JOIN "${SCHEMA}".eventos e ON c.evento_id = e.id
    ${joinTipo}
    LEFT JOIN public.usuarios pu ON c.medico_encargado = pu.id_usuario::text
    LEFT JOIN (
      SELECT DISTINCT ON (id_cita)
        id_cita,
        (to_jsonb(tj)->>'fecha_triaje')::timestamp AS fecha_triaje,
        (to_jsonb(tj)->>'fecha_hora')::timestamp AS fecha_hora,
        (to_jsonb(tj)->>'fecha')::timestamp AS fecha,
        to_jsonb(tj)->>'realizado_por' AS realizado_por,
        to_jsonb(tj)->>'encargado_triaje' AS encargado_triaje
      FROM "${SCHEMA}".triaje tj
      ORDER BY id_cita, COALESCE( (to_jsonb(tj)->>'fecha_triaje')::timestamp, (to_jsonb(tj)->>'fecha_hora')::timestamp, (to_jsonb(tj)->>'fecha')::timestamp ) DESC NULLS LAST
    ) t ON c.id_cita = t.id_cita
    ${whereClause}
    ORDER BY c.fecha_cita DESC, c.hora DESC, c.id_cita DESC
    LIMIT 20000
  `;

  const res = await pool.query(query, params);
  return (res.rows || []).map((r) => {
    const paciente = [safeStr(r.paciente_nombre), safeStr(r.paciente_apellido)].filter(Boolean).join(' ').trim();
    const medico = safeStr(r.medico_nombre_completo) || safeStr(r.medico_encargado);
    const evento = safeStr(r.evento_nombre) || (r.evento_id === 'general' ? 'General' : safeStr(r.evento_id));
    const prioridadIdx = Number(r.prioridad_triage) - 1;
    const prioridadLabel = ['Urgente', 'Prioritario', 'Normal', ''][prioridadIdx] || '';
    const origenRaw = safeStr(r.origen_cita).trim();
    const origenLabel = origenRaw === 'captura_fisica' ? 'Histórico (captura física)' : origenRaw ? origenRaw : 'Sistema';
    const costoPagadoNum = Number(safeStr(r.costo_pagado).trim() || '0');
    return {
      'ID Cita': safeStr(r.id_cita),
      Fecha: ymd(r.fecha),
      Hora: safeStr(r.hora),
      'Duración (min)': Number.isFinite(Number(r.duracion_minutos)) ? String(r.duracion_minutos) : '',
      Paciente: paciente || '-',
      'Teléfono Paciente': safeStr(r.paciente_telefono),
      'Ciudad Paciente': String(safeStr(r.paciente_ciudad)).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()),
      Evento: evento,
      'Ciudad Evento': safeStr(r.evento_ciudad).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()),
      Especialidad: String(safeStr(r.especialidad)).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()),
      'Tipo Cita': safeStr(r.tipo_cita_nombre),
      Estado: ESTADOS_LABEL[safeStr(r.estado)] || safeStr(r.estado),
      'Orden Llegada': Number.isFinite(Number(r.orden_llegada)) && Number(r.orden_llegada) > 0 ? `#${r.orden_llegada}` : '',
      'Saltado Triaje': safeStr(r.saltado_triage) === 'true' || r.saltado_triage === true ? 'Sí' : 'No',
      'Prioridad Triaje': prioridadLabel || (r.prioridad_triage ? safeStr(r.prioridad_triage) : ''),
      'Médico Asignado': medico || '-',
      'Fecha Triaje': ymd(r.triaje_fecha),
      'Triaje Realizado por': safeStr(r.triaje_realizado_por),
      Observaciones: safeStr(r.observaciones),
      'Origen Cita': origenLabel,
      'Especialidad (Otro Texto)': safeStr(r.especialidad_otra_texto),
      'Duración min (campo raw)': Number.isFinite(Number(r.duracion_minutos)) ? String(r.duracion_minutos) : '',
      'Costo Pagado': Number.isFinite(costoPagadoNum) ? costoPagadoNum.toFixed(2) : '',
      'Fecha Captura Cita': ymd(r.fecha_captura_cita),
      'Encargado Triaje (Cita)': safeStr(r.encargado_triaje_cita),
    };
  });
};

const fechaNombreSafe = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

const escapeCsv = (v) => {
  const s = safeStr(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const buildXlsxBuffer = (rows) => {
  const HEADER = [
    'ID Cita',
    'Fecha',
    'Hora',
    'Duración (min)',
    'Paciente',
    'Teléfono Paciente',
    'Ciudad Paciente',
    'Evento',
    'Ciudad Evento',
    'Especialidad',
    'Tipo Cita',
    'Estado',
    'Orden Llegada',
    'Saltado Triaje',
    'Prioridad Triaje',
    'Médico Asignado',
    'Fecha Triaje',
    'Triaje Realizado por',
    'Observaciones',
    'Origen Cita',
    'Especialidad (Otro Texto)',
    'Duración min (campo raw)',
    'Costo Pagado',
    'Fecha Captura Cita',
    'Encargado Triaje (Cita)',
  ];
  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADER });
  ws['!cols'] = [
    { wch: 9 }, { wch: 12 }, { wch: 7 }, { wch: 13 }, { wch: 28 },
    { wch: 15 }, { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 20 },
    { wch: 18 }, { wch: 16 }, { wch: 13 }, { wch: 13 }, { wch: 15 },
    { wch: 26 }, { wch: 12 }, { wch: 22 }, { wch: 40 },
    { wch: 24 }, { wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 26 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Citas');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
};

// GET /api/export/citas.xlsx
router.get('/citas.xlsx', async (req, res) => {
  try {
    const rows = await fetchCitasExport(req.query);
    const buf = buildXlsxBuffer(rows);
    const fileName = `citas_words_of_hope_${fechaNombreSafe()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('X-Total-Rows', String(rows.length));
    res.end(buf);
  } catch (err) {
    console.error('❌ export/citas.xlsx:', err.message);
    res.status(500).json({ error: err?.message || 'Error al generar archivo xlsx.' });
  }
});

// GET /api/export/citas.csv
router.get('/citas.csv', async (req, res) => {
  try {
    const rows = await fetchCitasExport(req.query);
    const HEADER = [
      'ID Cita', 'Fecha', 'Hora', 'Duración (min)', 'Paciente', 'Teléfono Paciente', 'Ciudad Paciente',
      'Evento', 'Ciudad Evento', 'Especialidad', 'Tipo Cita', 'Estado', 'Orden Llegada', 'Saltado Triaje',
      'Prioridad Triaje', 'Médico Asignado', 'Fecha Triaje', 'Triaje Realizado por', 'Observaciones',
      'Origen Cita', 'Especialidad (Otro Texto)', 'Duración min (campo raw)', 'Costo Pagado', 'Fecha Captura Cita', 'Encargado Triaje (Cita)',
    ];
    const lines = [HEADER.map(escapeCsv).join(',')];
    for (const r of rows) {
      lines.push(HEADER.map((k) => escapeCsv(r[k])).join(','));
    }
    const fileName = `citas_words_of_hope_${fechaNombreSafe()}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8; header=present');
    res.setHeader('X-Total-Rows', String(rows.length));
    res.write('\uFEFF'); // BOM UTF-8 para que Excel lea acentos Ñ OK
    res.end(lines.join('\n'), 'utf-8');
  } catch (err) {
    console.error('❌ export/citas.csv:', err.message);
    res.status(500).json({ error: err?.message || 'Error al generar archivo csv.' });
  }
});

// GET /api/export/citas-preview
router.get('/citas-preview', async (req, res) => {
  try {
    const rows = await fetchCitasExport(req.query);
    const byEstado = new Map();
    for (const r of rows) {
      const e = String(r['Estado'] || '-');
      byEstado.set(e, (byEstado.get(e) || 0) + 1);
    }
    res.json({
      total: rows.length,
      porEstado: Object.fromEntries([...byEstado.entries()].sort((a, b) => b[1] - a[1])),
      fechaPrimera: rows.length ? String(rows[rows.length - 1]['Fecha']) : '',
      fechaUltima: rows.length ? String(rows[0]['Fecha']) : '',
    });
  } catch (err) {
    console.error('❌ export/citas-preview:', err.message);
    res.status(500).json({ error: err?.message || 'Error al obtener preview.' });
  }
});

export default router;
