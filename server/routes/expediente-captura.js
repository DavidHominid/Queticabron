import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapPaciente, recordAudit } from '../helpers/utils.js';

const router = express.Router();

const columnExists = async (table, col) => {
  try {
    const res = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3 LIMIT 1`,
      [SCHEMA, table, col],
    );
    return Boolean(res.rows?.length);
  } catch {
    return false;
  }
};

const ensureColumnTypeText = async (table, col) => {
  try {
    if (!(await columnExists(table, col))) return;
    await pool.query(
      `ALTER TABLE "${SCHEMA}".${table} ALTER COLUMN ${col} TYPE TEXT USING ${col}::TEXT`,
    );
  } catch {
    // ignore: podría ser ya TEXT, o permiso insuficiente, en ese caso se truncará al insertar
  }
};

const ensureTriajeColumns = async () => {
  const cols = [
    'encargado_triaje',
  ];
  for (const c of cols) {
    try {
      if (!(await columnExists('triaje', c))) {
        await pool.query(`ALTER TABLE "${SCHEMA}".triaje ADD COLUMN IF NOT EXISTS ${c} TEXT NULL`);
      }
    } catch {
      // ignore
    }
  }
};

const ensureCitaColumns = async () => {
  const cols = [
    { name: 'observaciones', type: 'TEXT NULL' },
    { name: 'costo_pagado', type: 'NUMERIC NOT NULL DEFAULT 0' },
    { name: 'duracion_minutos', type: 'INTEGER NOT NULL DEFAULT 15' },
  ];
  for (const c of cols) {
    try {
      if (!(await columnExists('citas', c.name))) {
        await pool.query(
          `ALTER TABLE "${SCHEMA}".citas ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}`,
        );
      }
    } catch {
      // ignore
    }
  }
};

const ensureLongTextColumns = async () => {
  const triajeTextCols = [
    'observaciones',
    'realizado_por',
    'encargado_triaje',
    'presion_arterial',
  ];
  const notaTextCols = [
    'motivo_consulta',
    'padecimiento_actual',
    'exploracion_fisica',
    'diagnostico',
    'tratamiento',
    'plan_tratamiento',
    'medicamentos',
    'medicamentos_recetados',
    'indicaciones',
    'recomendaciones',
    'observaciones',
    'proxima_cita',
    'especialidad',
    'estado_seguimiento',
    'id_doctor',
    'medico_usuario_id',
    'nota',
    'conclusiones',
  ];
  const citasTextCols = [
    'medico_encargado',
    'consultorio',
    'tipo_cita_nombre',
    'especialidad',
    'observaciones',
  ];
  const antecedentesTextCols = [
    'descripcion',
    'antecedente',
  ];
  for (const c of triajeTextCols) {
    await ensureColumnTypeText('triaje', c);
  }
  for (const c of notaTextCols) {
    await ensureColumnTypeText('nota_medica', c);
  }
  for (const c of citasTextCols) {
    await ensureColumnTypeText('citas', c);
  }
  for (const c of antecedentesTextCols) {
    await ensureColumnTypeText('antecedentes', c);
  }
};

const truncateText = (val, maxChars = 50000) => {
  if (val === null || val === undefined) return null;
  const s = typeof val === 'string' ? val : String(val);
  return s.length > maxChars ? s.substring(0, maxChars) : s;
};

const dedupeArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const s = String(v || '').trim().toLowerCase();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(typeof v === 'string' ? String(v).trim() : v);
  }
  return out;
};

router.post('/expediente-captura', async (req, res) => {
  await ensureCitaColumns();
  await ensureTriajeColumns();
  await ensureLongTextColumns();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const body = req.body || {};
    const reqAny = req;
    const bodyAny = body;
    const pacienteData = body.paciente || {};
    const infoMedica = body.infoMedica || null;
    const citasPayload = Array.isArray(body.citas) ? body.citas : [];

    const nombre = String(pacienteData.nombre || '').trim().substring(0, 200);
    const apellido = String(pacienteData.apellido || '').trim().substring(0, 200);
    const fn = pacienteData.fechaNacimiento || null;
    const sexo = pacienteData.sexo || 'Masculino';
    const tel = String(pacienteData.telefono || '').trim().substring(0, 50) || null;
    const ciudad = pacienteData.ciudad || 'sonoyta';
    const mergeIdRaw = pacienteData.id || pacienteData.id_paciente || null;
    const mergeId = mergeIdRaw ? parseInt(String(mergeIdRaw), 10) : null;

    const hasMinForDedupe = nombre && apellido && fn && tel;
    if (!hasMinForDedupe) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Nombre(s), Apellidos, Fecha de nacimiento y Teléfono son obligatorios.',
      });
    }
    if (citasPayload.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Se requiere al menos una cita histórica.' });
    }

    for (let i = 0; i < citasPayload.length; i++) {
      const c = citasPayload[i];
      if (!c.fechaCita) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Cita ${i + 1}: Fecha es obligatoria.` });
      }
      const today = new Date().toISOString().slice(0, 10);
      if (String(c.fechaCita).slice(0, 10) > today) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Cita ${i + 1}: La fecha no puede ser futura.` });
      }
    }

    const usuarioCapturadorId = (() => {
      const u =
        reqAny.user?.id_usuario ??
        reqAny.user?.id ??
        bodyAny.usuarioId ??
        bodyAny.usuarioCapturadorId ??
        (body.paciente ? body.paciente.capturadoPorUsuarioId : null) ??
        null;
      if (!u) return null;
      const n = Number(u);
      return Number.isFinite(n) ? n : null;
    })();

    let idPaciente = null;

    if (mergeId && Number.isFinite(mergeId)) {
      const updRes = await client.query(
        `UPDATE "${SCHEMA}".paciente
         SET
           origen_expediente = CASE WHEN origen_expediente = 'sistema' THEN 'captura_fisica' ELSE COALESCE(origen_expediente,'captura_fisica') END,
           fecha_captura_digital_paciente = COALESCE(fecha_captura_digital_paciente, NOW()),
           capturado_por_usuario_id = COALESCE(capturado_por_usuario_id, $1),
           observaciones_captura = COALESCE(observaciones_captura, '{}'::jsonb)
         WHERE id_paciente = $2
         RETURNING *`,
        [usuarioCapturadorId, mergeId],
      );
      if (!updRes.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Paciente a mergear no existe.' });
      }
      idPaciente = updRes.rows[0].id_paciente;
    } else {
      const dup = await client.query(
        `SELECT id_paciente FROM "${SCHEMA}".paciente
         WHERE nombre = $1
           AND COALESCE(apellido, '') = $2
           AND fecha_de_nacimiento = $3::date
           AND COALESCE(telefono, '') = $4
           AND eliminado IS NOT TRUE
         LIMIT 1`,
        [nombre, apellido, fn, tel || ''],
      );
      if (dup.rows.length) {
        idPaciente = dup.rows[0].id_paciente;
        await client.query(
          `UPDATE "${SCHEMA}".paciente
           SET
             origen_expediente = CASE WHEN origen_expediente = 'sistema' THEN 'captura_fisica' ELSE COALESCE(origen_expediente,'captura_fisica') END,
             fecha_captura_digital_paciente = COALESCE(fecha_captura_digital_paciente, NOW()),
             capturado_por_usuario_id = COALESCE(capturado_por_usuario_id, $1)
           WHERE id_paciente = $2`,
          [usuarioCapturadorId, idPaciente],
        );
      } else {
        const hoy = new Date().toISOString().slice(0, 10);
        const countHoy = await client.query(
          `SELECT COUNT(*)::int AS c FROM "${SCHEMA}".paciente WHERE fecha_registro::date = $1::date`,
          [hoy],
        );
        const sec = String((countHoy.rows[0]?.c || 0) + 1).padStart(3, '0');
        const yyyy = new Date().getFullYear();
        const mm = String(new Date().getMonth() + 1).padStart(2, '0');
        const dd = String(new Date().getDate()).padStart(2, '0');
        const numExp = `EXP-${yyyy}${mm}${dd}-${sec}`;

        const ins = await client.query(
          `INSERT INTO "${SCHEMA}".paciente
             (nombre, apellido, fecha_de_nacimiento, sexo, telefono, ciudad, fecha_registro, numero_expediente,
              origen_expediente, fecha_captura_digital_paciente, capturado_por_usuario_id, observaciones_captura)
           VALUES ($1, $2, $3::date, $4, $5, $6, $7::date, $8,
                   'captura_fisica', NOW(), $9, '{}'::jsonb)
           RETURNING *`,
          [nombre, apellido, fn, sexo, tel, ciudad, hoy, numExp, usuarioCapturadorId],
        );
        idPaciente = ins.rows[0].id_paciente;
      }
    }

    if (infoMedica) {
      const alergiasNew = dedupeArray((infoMedica.alergias || []).map((a) => truncateText(a, 500)));
      const medsNew = dedupeArray((infoMedica.medicamentosActuales || []).map((a) => truncateText(a, 500)));
      let alergiasFinal = alergiasNew;
      let medsFinal = medsNew;
      let antecedentesFinal = infoMedica.antecedentes || null;
      let psicosocialesFinal = truncateText(infoMedica.antecedentesPsicosociales || '', 50000);
      let notasFinal = truncateText(infoMedica.notas || '', 50000);

      const existingInfomed = await client.query(
        `SELECT descripcion FROM "${SCHEMA}".antecedentes WHERE id_paciente = $1 AND tipo = 'infomed' LIMIT 1`,
        [idPaciente],
      );
      if (existingInfomed.rows.length) {
        try {
          const parsed = JSON.parse(existingInfomed.rows[0].descripcion);
          alergiasFinal = dedupeArray([...(parsed.alergias || []), ...alergiasNew]);
          medsFinal = dedupeArray([...(parsed.medicamentosActuales || []), ...medsNew]);
          const prevAnt = parsed.antecedentes || {};
          antecedentesFinal = antecedentesFinal ?? prevAnt ?? null;
          if (antecedentesFinal && typeof antecedentesFinal === 'object' && prevAnt && typeof prevAnt === 'object') {
            antecedentesFinal = { ...prevAnt, ...antecedentesFinal };
          }
          if (parsed.antecedentesPsicosociales && !psicosocialesFinal) psicosocialesFinal = parsed.antecedentesPsicosociales;
          else if (parsed.antecedentesPsicosociales && psicosocialesFinal && psicosocialesFinal !== parsed.antecedentesPsicosociales) {
            psicosocialesFinal = `${parsed.antecedentesPsicosociales}\n---\n${psicosocialesFinal}`;
          }
          if (parsed.notas && !notasFinal) notasFinal = parsed.notas;
          else if (parsed.notas && notasFinal && notasFinal !== parsed.notas) {
            notasFinal = `${parsed.notas}\n---\n${notasFinal}`;
          }
        } catch {
          // ignore parse error
        }
      }

      const payloadToSave = {};
      if (alergiasFinal.length) payloadToSave.alergias = alergiasFinal;
      if (medsFinal.length) payloadToSave.medicamentosActuales = medsFinal;
      if (antecedentesFinal) payloadToSave.antecedentes = antecedentesFinal;
      if (psicosocialesFinal) payloadToSave.antecedentesPsicosociales = psicosocialesFinal;
      if (notasFinal) payloadToSave.notas = notasFinal;

      if (Object.keys(payloadToSave).length) {
        payloadToSave.pacienteId = String(idPaciente);
        const existingCount = await client.query(
          `SELECT id_antecedentes FROM "${SCHEMA}".antecedentes WHERE id_paciente = $1 AND tipo = 'infomed'`,
          [idPaciente],
        );
        if (existingCount.rows.length) {
          await client.query(
            `UPDATE "${SCHEMA}".antecedentes SET descripcion = $1 WHERE id_paciente = $2 AND tipo = 'infomed'`,
            [JSON.stringify(payloadToSave), idPaciente],
          );
        } else {
          await client.query(
            `INSERT INTO "${SCHEMA}".antecedentes (id_paciente, tipo, descripcion) VALUES ($1, 'infomed', $2)`,
            [idPaciente, JSON.stringify(payloadToSave)],
          );
        }
      }
    }

    const citaIds = [];
    const ESPECIALIDAD_FK_DEFAULT = 'medicina_familiar';
    let codigosEspecialidadesValidas = null;
    let citaColsCache = null;
    let triajeColsCache = null;
    const safeColCita = async (col) => {
      if (!citaColsCache) {
        try {
          const r = await pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'citas'`,
            [SCHEMA],
          );
          citaColsCache = new Set((r.rows || []).map((x) => String(x.column_name)));
        } catch {
          citaColsCache = new Set();
        }
      }
      return citaColsCache.has(String(col)) ? String(col) : null;
    };
    const safeColTriaje = async (col) => {
      if (!triajeColsCache) {
        try {
          const r = await pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'triaje'`,
            [SCHEMA],
          );
          triajeColsCache = new Set((r.rows || []).map((x) => String(x.column_name)));
        } catch {
          triajeColsCache = new Set();
        }
      }
      return triajeColsCache.has(String(col)) ? String(col) : null;
    };
    const safeColTriajeAlias = async (preferred, fallback) => {
      const p = await safeColTriaje(preferred);
      if (p) return p;
      return safeColTriaje(fallback);
    };

    for (let i = 0; i < citasPayload.length; i++) {
      const c = citasPayload[i];
      const fechaCita = c.fechaCita;
      const especialidadRaw = truncateText(String(c.especialidad || ESPECIALIDAD_FK_DEFAULT).trim(), 200);
      const especialidadOtra = truncateText(String(c.especialidadOtra || '').trim(), 500) || null;
      if (!codigosEspecialidadesValidas) {
        try {
          const r = await client.query(`SELECT codigo FROM "${SCHEMA}".especialidades WHERE activa IS TRUE`);
          codigosEspecialidadesValidas = new Set((r.rows || []).map((x) => String(x.codigo)));
        } catch {
          codigosEspecialidadesValidas = new Set([
            'General', 'chequeo', 'dentista', 'fisioterapia',
            ESPECIALIDAD_FK_DEFAULT, 'oncologo', 'pediatria', 'podologo', 'vacunas',
          ]);
        }
      }
      let especialidad = codigosEspecialidadesValidas.has(especialidadRaw) ? especialidadRaw : ESPECIALIDAD_FK_DEFAULT;
      let textoEspecialidadNoCatalogada = '';
      if (especialidad !== especialidadRaw && especialidadRaw !== '__otra__') {
        textoEspecialidadNoCatalogada = `[Especialidad no catalogada: ${especialidadRaw}]`;
      }
      if (especialidadOtra) {
        textoEspecialidadNoCatalogada = (
          textoEspecialidadNoCatalogada
            ? `${textoEspecialidadNoCatalogada} ${especialidadOtra}`
            : `[Especialidad: ${especialidadOtra}]`
        );
      }
      const encargadoTriage = truncateText(String(c.encargadoTriage || '').trim(), 500) || null;
      const doctor = truncateText(String(c.doctorProveedor || c.doctor || '').trim(), 500) || null;
      const motivoConsulta = truncateText(String(c.motivoConsulta || '').trim(), 50000);
      const observacionesHpi = truncateText(String(c.observacionesHpi || '').trim(), 50000);
      const padecimientoActual = truncateText(String(c.padecimientoActual || '').trim(), 50000);
      const medicamentos = truncateText(String(c.medicamentosRx || c.medicamentos || '').trim(), 50000);
      const tratamiento = truncateText(String(c.tratamientoPt || c.tratamiento || '').trim(), 50000);
      const planSeguimiento = truncateText(String(c.planSeguimiento || '').trim(), 50000);
      const citaObservacionesFinal = truncateText(
        textoEspecialidadNoCatalogada ? `${textoEspecialidadNoCatalogada}` : null,
        1000,
      );

      const citaCols = [];
      const citaVals = [];
      let citaIdx = 1;
      const pushCita = async (col, val) => {
        const realCol = await safeColCita(col);
        if (!realCol) return;
        citaCols.push(`"${realCol}"`);
        citaVals.push(val);
        citaIdx += 1;
      };
      await pushCita('id_paciente', idPaciente);
      await pushCita('fecha_cita', fechaCita);
      await pushCita('hora', '09:00');
      await pushCita('estado', 'completada');
      await pushCita('especialidad', especialidad);
      await pushCita('medico_encargado', doctor);
      await pushCita('consultorio', 'Consultorio 1');
      await pushCita('costo_pagado', 0);
      await pushCita('duracion_minutos', 15);
      await pushCita('evento_id', null);
      await pushCita('origen', 'captura_fisica');
      await pushCita('fecha_captura_cita', new Date());
      await pushCita('especialidad_otra', especialidadOtra);
      await pushCita('encargado_triaje', encargadoTriage);
      await pushCita('observaciones', citaObservacionesFinal);

      const citaPlaceholders = citaCols.map((_, idx) => `$${idx + 1}`).join(', ');
      const insCita = await client.query(
        `INSERT INTO "${SCHEMA}".citas (${citaCols.join(', ')}) VALUES (${citaPlaceholders}) RETURNING id_cita`,
        citaVals,
      );
      const idCita = insCita.rows[0].id_cita;
      citaIds.push(idCita);

      const sv = c.signosVitales || {};
      const svKeys = Object.keys(sv);
      const hasSv = svKeys.some((k) => sv[k] !== null && sv[k] !== undefined && String(sv[k]).trim() !== '');
      if (hasSv) {
        const toNum = (v, fallback = null) => {
          if (v === null || v === undefined || v === '') return fallback;
          const n = Number(v);
          return Number.isFinite(n) ? n : fallback;
        };
        const toInt = (v) => {
          const n = toNum(v);
          return n === null ? null : Math.trunc(n);
        };
        const triajeCols = [];
        const triajeVals = [];
        let triajeIdx = 1;
        const pushTriaje = async (col, val) => {
          const realCol = await safeColTriaje(col);
          if (!realCol) return;
          triajeCols.push(`"${realCol}"`);
          triajeVals.push(val);
          triajeIdx += 1;
        };
        await pushTriaje('id_cita', idCita);
        await pushTriaje('id_paciente', idPaciente);
        await pushTriaje('temperatura', toNum(sv.temperatura));
        await pushTriaje('presion_arterial', truncateText(sv.presionArterial ?? null, 200));
        await pushTriaje('ritmo_cardiaco', toInt(sv.ritmoCardiaco));
        await pushTriaje(
          (await safeColTriajeAlias('frecuencia_respiratoria', 'frec_respiratoria')),
          toInt(sv.frecuenciaRespiratoria),
        );
        await pushTriaje('altura', toInt(sv.altura));
        await pushTriaje('peso', toNum(sv.peso));
        await pushTriaje('saturacion_oxigeno', toNum(sv.saturacionOxigeno));
        await pushTriaje('azucar_en_sangre', toInt(sv.azucarEnSangre));
        await pushTriaje('razon_consulta', truncateText(motivoConsulta, 250) || null);
        await pushTriaje('observaciones', truncateText(observacionesHpi, 50000) || null);
        await pushTriaje('realizado_por', truncateText(encargadoTriage || 'Captura Histórica', 500));
        await pushTriaje('encargado_triaje', truncateText(encargadoTriage, 500));
        if (triajeCols.length) {
          const triajePlaceholders = triajeCols.map((_, i) => `$${i + 1}`).join(', ');
          await client.query(
            `INSERT INTO "${SCHEMA}".triaje (${triajeCols.join(', ')}) VALUES (${triajePlaceholders}) RETURNING id_triaje`,
            triajeVals,
          );
        }
      }

      const tieneMedicamentosArray = typeof medicamentos === 'string' && medicamentos.trim()
        ? medicamentos.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
        : [];
      const planText = tratamiento && planSeguimiento
        ? truncateText(`${tratamiento}\n\nPlan y seguimiento:\n${planSeguimiento}`, 100000)
        : truncateText(tratamiento || planSeguimiento || '', 100000);

      const tColsTable = await pool.query(`SELECT * FROM "${SCHEMA}".nota_medica LIMIT 0`);
      const tCols = tColsTable.fields.map((f) => f.name);
      const pickCol = (preferred, fallback) => {
        for (const c of [preferred, fallback].filter(Boolean)) {
          const found = tCols.find((x) => x.toLowerCase() === String(c).toLowerCase());
          if (found) return found;
        }
        return null;
      };

      const colIdCita = pickCol('id_cita');
      const colIdPaciente = pickCol('id_paciente');
      const colFecha = pickCol('fecha', 'fecha_nota');
      const colFechaHora = pickCol('fecha_hora');
      const colMotivo = pickCol('motivo_consulta');
      const colPadec = pickCol('padecimiento_actual');
      const colExpl = pickCol('exploracion_fisica');
      const colDiag = pickCol('diagnostico');
      const colTrat = pickCol('tratamiento');
      const colPlan = pickCol('plan_tratamiento');
      const colMeds = pickCol('medicamentos', 'medicamentos_recetados');
      const colInd = pickCol('indicaciones', 'recomendaciones');
      const colObs = pickCol('observaciones');
      const colProxCita = pickCol('proxima_cita');
      const colEsp = pickCol('especialidad');
      const colIdDoctor = pickCol('id_doctor', 'medico_usuario_id');
      const colEstadoSeg = pickCol('estado_seguimiento');
      const colReqSeg = pickCol('requiere_seguimiento');

      const cols = [];
      const vals = [];
      let idx = 1;
      const push = (col, val) => {
        if (!col) return;
        cols.push(`"${col}"`);
        vals.push(val);
        idx += 1;
      };
      if (colIdCita) push(colIdCita, idCita);
      if (colIdPaciente) push(colIdPaciente, idPaciente);
      if (colFecha) push(colFecha, fechaCita);
      if (colFechaHora) push(colFechaHora, new Date(fechaCita + 'T09:00:00'));
      if (colMotivo) push(colMotivo, truncateText(motivoConsulta, 50000));
      if (colPadec) push(colPadec, truncateText(padecimientoActual, 50000));
      if (colExpl) push(colExpl, '');
      if (colDiag) push(colDiag, '');
      if (colTrat) push(colTrat, truncateText(tratamiento, 50000));
      if (colPlan) push(colPlan, truncateText(planText, 100000));
      if (colMeds) push(colMeds, JSON.stringify(tieneMedicamentosArray));
      if (colInd) push(colInd, '');
      if (colObs) push(colObs, truncateText(observacionesHpi, 50000));
      if (colProxCita) push(colProxCita, null);
      if (colEsp) push(colEsp, truncateText(especialidad, 200));
      if (colIdDoctor) push(colIdDoctor, truncateText(doctor, 500));
      if (colEstadoSeg) push(colEstadoSeg, null);
      if (colReqSeg) push(colReqSeg, false);

      if (cols.length) {
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
          `INSERT INTO "${SCHEMA}".nota_medica (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id_nota`,
          vals,
        );
      }
    }

    try {
      await client.query({ text: 'COMMIT' });
    } catch {
      try {
        await pool.query({ text: 'COMMIT' });
      } catch {
        // ignore
      }
    }

    try {
      await recordAudit({
        paciente_id: idPaciente ?? undefined,
        usuario_id: usuarioCapturadorId ? String(usuarioCapturadorId) : null,
        nombre_usuario: bodyAny.nombreUsuario || reqAny.user?.nombre || 'Captura',
        rol: bodyAny.rol || reqAny.user?.rol || 'administrador',
        accion: 'Captura Expediente Histórico',
        detalles: `Captura expediente: ${citasPayload.length} cita(s) histórica(s) agregada(s) a paciente ID: ${idPaciente}.`,
        ciudad: ciudad,
      });
    } catch {
      // ignore
    }

    const pacienteFinal = await pool.query(
      `SELECT * FROM "${SCHEMA}".paciente WHERE id_paciente = $1 LIMIT 1`,
      [idPaciente],
    );

    return res.status(201).json({
      expedienteCreado: true,
      pacienteId: String(idPaciente),
      paciente: pacienteFinal.rows.length ? mapPaciente(pacienteFinal.rows[0]) : null,
      citaIds: citaIds.map(String),
      totalCitas: citaIds.length,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    const errAny = err;
    console.error('❌ Error en POST /api/pacientes/expediente-captura:', errAny?.message || String(err));
    if (errAny?.stack) console.error('STACK TRACE:\n', errAny.stack);
    if (errAny?.code) console.error('PG error code:', errAny.code);
    if (errAny?.detail) console.error('PG detail:', errAny.detail);
    if (errAny?.table) console.error('PG table:', errAny.table);
    if (errAny?.column) console.error('PG column:', errAny.column);
    if (errAny?.constraint) console.error('PG constraint:', errAny.constraint);
    res.status(500).json({
      error: errAny?.message || 'Error interno al guardar el expediente.',
      debug: {
        code: errAny?.code || null,
        detail: errAny?.detail || null,
        table: errAny?.table || null,
        column: errAny?.column || null,
        constraint: errAny?.constraint || null,
      },
    });
  } finally {
    client.release();
  }
});

router.post('/dedupe', async (req, res) => {
  try {
    const { nombre, apellido, fechaNacimiento } = req.body || {};
    const n = String(nombre || '').trim().toLowerCase();
    const a = String(apellido || '').trim().toLowerCase();
    const fn = String(fechaNacimiento || '').trim();

    if (!n || !a) {
      return res.json({ duplicado: false });
    }

    const query = `
      SELECT * FROM "${SCHEMA}".paciente
      WHERE (LOWER(TRIM(nombre)) = $1 AND LOWER(TRIM(apellido)) = $2)
        OR (fecha_de_nacimiento::text LIKE $3 AND LOWER(TRIM(nombre)) = $1)
      LIMIT 1
    `;
    const result = await pool.query(query, [n, a, `${fn}%`]);

    if (result.rows.length > 0) {
      return res.json({
        duplicado: true,
        paciente: mapPaciente(result.rows[0]),
      });
    }

    return res.json({ duplicado: false });
  } catch (err) {
    console.error('Error en dedupe pacientes:', err);
    return res.json({ duplicado: false });
  }
});

export default router;
