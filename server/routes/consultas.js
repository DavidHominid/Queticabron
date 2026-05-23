import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapConsultaMedica, recordAudit } from '../helpers/utils.js';

const router = express.Router();

const ensureNotaMedicaColumns = async () => {
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS id_cita INTEGER`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS evento_id TEXT`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS especialidad TEXT`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS medico_usuario_id TEXT`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS estado_seguimiento VARCHAR(50)`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS estudios_indicados JSONB`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS requiere_cirugia BOOLEAN DEFAULT false`);
  // Backfill estado_seguimiento for existing rows
  await pool.query(`UPDATE "${SCHEMA}".nota_medica SET estado_seguimiento = CASE WHEN proxima_cita IS NOT NULL THEN 'agendada' ELSE 'pendiente' END WHERE estado_seguimiento IS NULL`);
};

const tryBackfillNotaMedicaLinks = async () => {
  try {
    await pool.query(
      `
      WITH matches AS (
        SELECT
          nm.id_nota,
          c.id_cita,
          c.evento_id,
          c.especialidad,
          ROW_NUMBER() OVER (PARTITION BY nm.id_nota ORDER BY c.id_cita DESC) AS rn
        FROM "${SCHEMA}".nota_medica nm
        JOIN "${SCHEMA}".citas c
          ON c.id_paciente = nm.id_paciente
         AND (c.fecha_cita::date) = nm.fecha
        WHERE nm.id_cita IS NULL
      )
      UPDATE "${SCHEMA}".nota_medica nm
      SET
        id_cita = m.id_cita,
        evento_id = m.evento_id,
        especialidad = m.especialidad,
        fecha_hora = COALESCE(nm.fecha_hora, nm.fecha::timestamptz + INTERVAL '12 hours')
      FROM matches m
      WHERE nm.id_nota = m.id_nota
        AND m.rn = 1
      `,
    );
  } catch (err) {
    console.error('⚠️ Backfill nota_medica (no crítico):', err.message);
  }
};

ensureNotaMedicaColumns()
  .then(tryBackfillNotaMedicaLinks)
  .catch((err) => console.error('❌ Error preparando nota_medica:', err.message));

router.post('/', async (req, res) => {
  const c = req.body;
  try {
    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".nota_medica LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);

    const citaId = Number.isFinite(Number(c.citaId)) ? parseInt(String(c.citaId)) : null;
    if (!Number.isFinite(citaId)) {
      return res.status(400).json({ error: 'citaId es obligatorio para guardar la consulta.' });
    }

    const citaRes = await pool.query(
      `SELECT id_cita, id_paciente, evento_id, especialidad, medico_encargado
       FROM "${SCHEMA}".citas
       WHERE id_cita = $1
       LIMIT 1`,
      [citaId],
    );
    if (!citaRes.rows.length) {
      return res.status(404).json({ error: 'Cita no encontrada. No se puede registrar la consulta.' });
    }
    const cita = citaRes.rows[0];

    const pacienteId = Number(cita.id_paciente);
    const eventoId = cita.evento_id ? String(cita.evento_id) : null;
    const especialidad = cita.especialidad ? String(cita.especialidad) : null;

    const medicoUsuarioId =
      String(c.usuarioId || '').trim() ||
      String(c.medicoEncargado || '').trim() ||
      String(cita.medico_encargado || '').trim() ||
      null;

    const incomingData = {
      id_cita: citaId,
      id_paciente: pacienteId,
      medico_usuario_id: medicoUsuarioId,
      evento_id: eventoId,
      especialidad,
      fecha: new Date(),
      fecha_hora: new Date(),
      motivo_consulta: c.motivoConsulta,
      padecimiento_actual: c.padecimientoActual,
      exploracion_fisica: c.exploracionFisica,
      diagnostico: c.diagnostico,
      tratamiento: c.tratamiento,
      plan_tratamiento: c.planTratamiento || c.tratamiento,
      medicamentos: JSON.stringify(c.medicamentosRecetados || []),
      estudios_indicados: JSON.stringify(c.estudiosIndicados || []),
      requiere_cirugia: c.requiereCirugia || false,
      indicaciones: c.recomendaciones || '',
      proxima_cita: c.proximaConsulta || null,
      estado_seguimiento: c.proximaConsulta ? 'pendiente_de_agendar' : 'pendiente',
      observaciones: c.observaciones || ''
    };

    const finalData = {};
    for (const key in incomingData) {
      const dbColName = dbCols.find(col => col.trim().toLowerCase() === key.toLowerCase() || col.trim().toLowerCase().includes(key.toLowerCase()));
      if (dbColName && finalData[dbColName] === undefined) {
        finalData[dbColName] = incomingData[key];
      }
    }

    const queryCols = Object.keys(finalData).map(col => `"${col}"`).join(', ');
    const placeholders = Object.keys(finalData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(finalData);

    const query = `INSERT INTO "${SCHEMA}".nota_medica (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    const consultaMapped = mapConsultaMedica(result.rows[0]);

    const payload = {
      ...consultaMapped,
      citaId: String(citaId),
      pacienteId: String(pacienteId),
      eventoId: eventoId || '',
      especialidad: especialidad || consultaMapped.especialidad,
    };
    try {
      await pool.query(
        `
        INSERT INTO "${SCHEMA}".expediente (id_cita, id_paciente, consulta, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW())
        ON CONFLICT (id_cita)
        DO UPDATE SET consulta = EXCLUDED.consulta, updated_at = NOW()
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
        INSERT INTO "${SCHEMA}".expediente (id_cita, id_paciente, consulta, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW())
        ON CONFLICT (id_cita)
        DO UPDATE SET consulta = EXCLUDED.consulta, updated_at = NOW()
        `,
        [citaId, pacienteId, JSON.stringify(payload)],
      );
    }
    
    await recordAudit({
      usuario_id: c.usuarioId || null,
      nombre_usuario: c.nombreUsuario || c.medicoNombre || c.medicoEncargado || 'Médico',
      rol: c.rol || 'medico',
      accion: 'Consulta Médica',
      detalles: `Completó consulta para cita ID: ${citaId} (paciente ID: ${pacienteId})`,
      ciudad: c.ciudad || 'Sonoyta',
    });

    res.status(201).json(consultaMapped);
  } catch (err) {
    console.error('❌ Error en POST /api/consultas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".nota_medica ORDER BY id_nota DESC`);
    res.json(result.rows.map(mapConsultaMedica));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
