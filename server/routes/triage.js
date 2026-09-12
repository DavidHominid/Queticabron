import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapTriage, recordAudit } from '../helpers/utils.js';
import { broadcast } from '../helpers/sse.js';

const router = express.Router();

const columnExists = async (table, col) => {
  try {
    const r = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3 LIMIT 1`,
      [SCHEMA, table, col],
    );
    return Boolean(r.rows?.length);
  } catch {
    return false;
  }
};
const addColIfMissing = async (table, col, definition) => {
  try {
    if (!(await columnExists(table, col))) {
      await pool.query(`ALTER TABLE "${SCHEMA}".${table} ADD COLUMN IF NOT EXISTS ${col} ${definition}`);
    }
  } catch {
    /* ignore: permiso insuficiente o ya existe */
  }
};

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".triaje ORDER BY id_triaje DESC`);
    res.json(result.rows.map(mapTriage));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  await addColIfMissing('triaje', 'razon_consulta', 'TEXT NULL');
  await addColIfMissing('triaje', 'id_paciente', 'INTEGER NULL');

  const t = req.body;
  console.log('🤒 Triage recibido:', t.citaId);

  const svRaw = t.signosVitales || {};
  let normSV = svRaw;
  if (Array.isArray(svRaw)) {
    const obj = {};
    for (const it of svRaw) {
      const k = String(it.clave || '').trim();
      if (!k) continue;
      obj[k] = it.valor;
      const camel = {
        presion_arterial: 'presionArterial', presion_arterial_2: 'presionArterial',
        frecuencia_cardiaca: 'ritmoCardiaco', ritmo_cardiaco: 'ritmoCardiaco', pulso: 'ritmoCardiaco',
        frecuencia_respiratoria: 'frecuenciaRespiratoria', respiraciones: 'frecuenciaRespiratoria',
        saturacion_oxigeno: 'saturacionOxigeno', oxigeno: 'saturacionOxigeno', o2sat: 'saturacionOxigeno',
        azucar_en_sangre: 'azucarEnSangre', glucosa: 'azucarEnSangre', azucar: 'azucarEnSangre',
      };
      if (camel[k]) obj[camel[k]] = it.valor;
      const snake = {
        presionArterial: 'presion_arterial',
        ritmoCardiaco: 'frecuencia_cardiaca',
        frecuenciaRespiratoria: 'frecuencia_respiratoria',
        saturacionOxigeno: 'saturacion_oxigeno',
        azucarEnSangre: 'azucar_en_sangre',
      };
      if (snake[k]) obj[snake[k]] = it.valor;
    }
    normSV = obj;
  }
  const numOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/,/g, '.'));
    return Number.isFinite(n) ? n : null;
  };
  const intOrNull = (v, key) => {
    const n = numOrNull(v);
    if (n === null) return null;
    const scale = (key === 'altura' && n > 0 && n < 10) ? 100 : 1;
    return Math.round(n * scale);
  };
  const s = {
    temperatura: numOrNull(normSV.temperatura),
    presionArterial: (normSV.presionArterial ?? normSV.presion_arterial ?? null) != null ? String(normSV.presionArterial ?? normSV.presion_arterial) : null,
    ritmoCardiaco: intOrNull(normSV.ritmoCardiaco ?? normSV.frecuencia_cardiaca ?? normSV.pulso),
    frecuenciaRespiratoria: intOrNull(normSV.frecuenciaRespiratoria ?? normSV.frecuencia_respiratoria ?? normSV.respiraciones),
    saturacionOxigeno: intOrNull(normSV.saturacionOxigeno ?? normSV.saturacion_oxigeno ?? normSV.oxigeno),
    azucarEnSangre: intOrNull(normSV.azucarEnSangre ?? normSV.azucar_en_sangre ?? normSV.glucosa),
    altura: intOrNull(normSV.altura, 'altura'),
    peso: intOrNull(normSV.peso),
  };

  try {
    const citaId = parseInt(t.citaId);
    const citaPacienteIdFromReq = parseInt(t.pacienteId);
    let saltoTriage = false;
    let espRequiereTriage = true;
    let idPacienteFinal = Number.isFinite(citaPacienteIdFromReq) ? citaPacienteIdFromReq : null;
    if (Number.isFinite(citaId)) {
      const citaRow = await pool.query(
        `SELECT c.id_cita, c.id_paciente, c.evento_id, c.especialidad, c.estado, c.saltado_triage,
                ee.requiere_triage
         FROM "${SCHEMA}".citas c
         LEFT JOIN "${SCHEMA}".evento_especialidad ee
                ON ee.evento_id IS NOT DISTINCT FROM c.evento_id AND lower(ee.especialidad) = lower(c.especialidad)
         WHERE c.id_cita = $1
         LIMIT 1`,
        [citaId],
      );
      const cr = citaRow.rows?.[0];
      if (cr) {
        saltoTriage = Boolean(cr.saltado_triage);
        espRequiereTriage = !(cr.requiere_triage === false || cr.requiere_triage === 'f');
        if (saltoTriage || !espRequiereTriage) {
          return res.status(400).json({
            error: 'Esta cita no requiere triaje. No se puede capturar triaje para esta especialidad en este evento.',
            _meta: { saltadoTriage: saltoTriage, requiereTriage: espRequiereTriage },
          });
        }
        // FR-T2: persistir id_paciente en tabla triaje. Si no llega en body, resolver desde cita.
        if (!idPacienteFinal && Number.isFinite(cr.id_paciente)) idPacienteFinal = Number(cr.id_paciente);
        if (Number.isFinite(citaPacienteIdFromReq) && Number.isFinite(cr.id_paciente) && citaPacienteIdFromReq !== Number(cr.id_paciente)) {
          return res.status(400).json({
            error: `Paciente no coincide: cita #${citaId} pertenece a paciente #${cr.id_paciente}, recibido #${citaPacienteIdFromReq}.`,
          });
        }
      }
    }

    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".triaje LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);

    const motivo = String(t.razonConsulta || t.motivoConsulta || t.razon || '').trim().slice(0, 250);

    const incomingData = {
      id_cita: citaId,
      id_paciente: idPacienteFinal,
      temperatura: s.temperatura || null,
      presion_arterial: s.presionArterial || null,
      ritmo_cardiaco: s.ritmoCardiaco || null,
      frecuencia_respiratoria: s.frecuenciaRespiratoria || null,
      altura: s.altura || null,
      peso: s.peso || null,
      observaciones: t.observaciones || '',
      realizado_por: t.realizadoPor || 'Enfermería',
      saturacion_oxigeno: s.saturacionOxigeno || null,
      azucar_en_sangre: s.azucarEnSangre || null,
      razon_consulta: motivo || null,
    };

    const finalData = {};
    for (const key in incomingData) {
      const dbColName = dbCols.find(c => c.toLowerCase() === key.toLowerCase());
      if (dbColName) {
        finalData[dbColName] = incomingData[key];
      }
    }

    const queryCols = Object.keys(finalData).map(c => `"${c}"`).join(', ');
    const placeholders = Object.keys(finalData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(finalData);

    const query = `INSERT INTO "${SCHEMA}".triaje (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    const triageMapped = mapTriage(result.rows[0]);

    if (Number.isFinite(citaId) && Number.isFinite(idPacienteFinal)) {
      const payload = {
        ...triageMapped,
        observaciones: triageMapped.observaciones || t.observaciones || '',
      };
      try {
        await pool.query(
          `
          INSERT INTO "${SCHEMA}".expediente (id_cita, id_paciente, triage, updated_at)
            VALUES ($1, $2, $3::jsonb, NOW())
            ON CONFLICT (id_cita)
            DO UPDATE SET triage = EXCLUDED.triage, updated_at = NOW()
            `,
          [citaId, idPacienteFinal, JSON.stringify(payload)],
        );
      } catch (err) {
        await pool.query(
          `
            CREATE TABLE IF NOT EXISTS "${SCHEMA}".expediente (
              id SERIAL PRIMARY KEY,
              id_cita INTEGER NOT NULL,
              id_paciente INTEGER NOT NULL,
              triage JSONB,
              consulta JSONB,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              UNIQUE (id_cita)
            )
            `,
        );
        await pool.query(
          `
            INSERT INTO "${SCHEMA}".expediente (id_cita, id_paciente, triage, updated_at)
            VALUES ($1, $2, $3::jsonb, NOW())
            ON CONFLICT (id_cita)
            DO UPDATE SET triage = EXCLUDED.triage, updated_at = NOW()
            `,
          [citaId, idPacienteFinal, JSON.stringify(payload)],
        );
      }
    }

    if (Number.isFinite(citaId)) {
      await pool.query(`UPDATE "${SCHEMA}".citas SET estado = $1 WHERE id_cita = $2`, ['triage_completado', citaId]);
      console.log('✅ Cita actualizada a triage_completado:', citaId);
    }

    res.status(201).json({
      ...triageMapped,
      _meta: { saltadoTriage: saltoTriage, requiereTriage: espRequiereTriage, proximoEstado: 'triage_completado' },
    });
    broadcast('operacional'); // ⚡ el médico ve al paciente listo instantáneamente

    await recordAudit({
      paciente_id: t.pacienteId,
      accion: 'Triage Completado',
      detalles: `Triage realizado para cita ID: ${t.citaId}. Paciente ID: ${t.pacienteId}. Estado actualizado a triage_completado.`,
      rol: t.rol_solicitante || 'triage',
      nombre_usuario: t.realizadoPor || 'Enfermería',
      usuario_id: t.usuarioId || null,
      ciudad: t.ciudad || 'Sonoyta',
    });
  } catch (err) {
    console.error('❌ Error en POST /api/triage:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
