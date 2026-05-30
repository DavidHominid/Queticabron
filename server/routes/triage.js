import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapTriage, recordAudit } from '../helpers/utils.js';
import { broadcast } from '../helpers/sse.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".triaje ORDER BY id_triaje DESC`);
    res.json(result.rows.map(mapTriage));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const t = req.body;
  const s = t.signosVitales || {};
  console.log('🤒 Triage recibido:', t.citaId);
  
  try {
    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".triaje LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);
    
    const incomingData = {
      id_cita: parseInt(t.citaId),
      id_paciente: parseInt(t.pacienteId),
      temperatura: s.temperatura || null,
      presion_arterial: s.presionArterial || null,
      ritmo_cardiaco: s.ritmoCardiaco || null,
      frecuencia_respiratoria: s.frecuenciaRespiratoria || null,
      altura: s.altura || null,
      peso: s.peso || null,
      observaciones: t.observaciones || '',
      realizado_por: t.realizadoPor || 'Enfermería',
      saturacion_oxigeno: s.saturacionOxigeno || null,
      azucar_en_sangre: s.azucarEnSangre || null
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

    if (t.citaId && t.pacienteId) {
      const citaId = parseInt(t.citaId);
      const pacienteId = parseInt(t.pacienteId);
      if (Number.isFinite(citaId) && Number.isFinite(pacienteId)) {
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
            [citaId, pacienteId, JSON.stringify(payload)],
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
            [citaId, pacienteId, JSON.stringify(payload)],
          );
        }
      }
    }

    // AUTOMATIZACIÓN: Actualizar estado de la cita a 'confirmada'
    if (t.citaId) {
      await pool.query(`UPDATE "${SCHEMA}".citas SET estado = $1 WHERE id_cita = $2`, ['confirmada', parseInt(t.citaId)]);
      console.log('✅ Cita actualizada a confirmada:', t.citaId);
    }

    res.status(201).json(triageMapped);
    broadcast('operacional'); // ⚡ el médico ve al paciente listo instantáneamente

    await recordAudit({
      accion: 'Triage Completado',
      detalles: `Triage realizado para cita ID: ${t.citaId}. Paciente ID: ${t.pacienteId}`,
      rol: t.rol_solicitante || 'triage',
      nombre_usuario: t.realizadoPor || 'Enfermería'
    });
  } catch (err) {
    console.error('❌ Error en POST /api/triage:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
