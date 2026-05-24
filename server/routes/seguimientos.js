import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

const ensureNotaMedicaSeguimientoColumns = async () => {
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS estado_seguimiento VARCHAR(50)`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS requiere_seguimiento BOOLEAN`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS nota_seguimiento TEXT`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS evento_seguimiento_id TEXT`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS proxima_cita_hora VARCHAR(5)`);
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS cita_id TEXT`);
  await pool.query(`UPDATE "${SCHEMA}".nota_medica SET requiere_seguimiento = FALSE WHERE requiere_seguimiento IS NULL`);
};

ensureNotaMedicaSeguimientoColumns().catch(() => {});

const mapSeguimiento = (row) => ({
  id: String(row.id_nota),
  pacienteId: String(row.id_paciente || ''),
  citaId: row.cita_id ? String(row.cita_id) : null,
  diagnostico: row.diagnostico || '',
  observaciones: row.indicaciones || row.tratamiento || '',
  requiereSeguimiento: Boolean(row.requiere_seguimiento ?? row.requiereSeguimiento),
  notaSeguimiento: row.nota_seguimiento || row.notaSeguimiento || '',
  eventoSeguimientoId: row.evento_seguimiento_id ? String(row.evento_seguimiento_id) : '',
  // Nuevos campos mapeados completos
  motivo_consulta: row.motivo_consulta || '',
  padecimiento_actual: row.padecimiento_actual || '',
  exploracion_fisica: row.exploracion_fisica || '',
  tratamiento: row.tratamiento || '',
  plan_tratamiento: row.plan_tratamiento || '',
  medicamentos: row.medicamentos || '[]',
  indicaciones: row.indicaciones || '',
  
  fechaCita: row.proxima_cita
    ? new Date(row.proxima_cita).toISOString().split('T')[0]
    : null,
  horaCita: row.proxima_cita_hora ? String(row.proxima_cita_hora) : null,
  fechaCreacion: row.fecha
    ? new Date(row.fecha).toISOString()
    : new Date().toISOString(),
  medicoEncargado: null,
  estado:
    row.estado_seguimiento ||
    (Boolean(row.requiere_seguimiento) && row.evento_seguimiento_id
      ? 'pendiente_de_agendar'
      : row.proxima_cita
        ? 'agendada'
        : 'pendiente'),
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "${SCHEMA}".nota_medica ORDER BY id_nota DESC LIMIT 200`
    );

    // Agrupar para asegurar que un paciente solo tenga 1 seguimiento (el más reciente)
    const seen = new Set();
    const rowsUnicos = [];
    for (const row of result.rows) {
      if (!row.id_paciente) continue;
      if (!seen.has(row.id_paciente)) {
        seen.add(row.id_paciente);
        rowsUnicos.push(row);
      }
    }

    res.json(rowsUnicos.map(mapSeguimiento));
  } catch (err) {
    console.error('❌ Error en GET /api/seguimientos:', err.message);
    res.json([]);
  }
});

router.post('/', async (req, res) => {
  const s = req.body;

  try {
    const requiereSeguimiento = Boolean(s.requiereSeguimiento);
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".nota_medica 
      (id_paciente, diagnostico, indicaciones, proxima_cita, proxima_cita_hora, cita_id, estado_seguimiento, requiere_seguimiento, nota_seguimiento, evento_seguimiento_id, fecha)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        parseInt(s.pacienteId) || null,
        s.diagnostico || '',
        s.observaciones || '',
        s.fechaCita || null,
        String(s.horaCita || '').trim() || null,
        String(s.citaId || '').trim() || null,
        s.estado || (requiereSeguimiento && s.eventoSeguimientoId ? 'pendiente_de_agendar' : 'pendiente'),
        requiereSeguimiento,
        s.notaSeguimiento || '',
        s.eventoSeguimientoId || null,
        new Date(),
      ]
    );

    res.status(201).json(mapSeguimiento(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en POST /api/seguimientos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const s = req.body;

  try {
    const requiereSeguimiento = Boolean(s.requiereSeguimiento);
    const result = await pool.query(
      `UPDATE "${SCHEMA}".nota_medica
       SET diagnostico = $1,
           indicaciones = $2,
           proxima_cita = $3,
           proxima_cita_hora = $4,
           cita_id = $5,
           estado_seguimiento = $6,
           requiere_seguimiento = $7,
           nota_seguimiento = $8,
           evento_seguimiento_id = $9
       WHERE id_nota = $10
       RETURNING *`,
      [
        s.diagnostico || '',
        s.observaciones || '',
        s.fechaCita || null,
        String(s.horaCita || '').trim() || null,
        String(s.citaId || '').trim() || null,
        s.estado || (requiereSeguimiento && s.eventoSeguimientoId ? 'pendiente_de_agendar' : 'pendiente'),
        requiereSeguimiento,
        s.notaSeguimiento || '',
        s.eventoSeguimientoId || null,
        parseInt(id),
      ]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: 'Seguimiento no encontrado' });

    res.json(mapSeguimiento(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en PUT /api/seguimientos/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
