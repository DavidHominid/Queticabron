import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

// Middleware to check for conflicts
async function checkConflict(req, res, next) {
  const { fechaCirugia, horaEstimada, lugarCirugia, medicoACargo, estado } = req.body;
  const id = req.params.id; // Optional, for PUT

  if (estado === 'programada' || estado === 'en_procedimiento') {
    if (fechaCirugia && horaEstimada && lugarCirugia) {
      let query = `
        SELECT id_agenda FROM "${SCHEMA}".agenda_cirugias 
        WHERE fecha_cirugia = $1 AND hora_cirugia = $2 AND consultorio = $3 
        AND estado IN ('programada', 'en_procedimiento')
      `;
      let params = [fechaCirugia, horaEstimada, lugarCirugia];
      
      if (id) {
        // Exclude current surgery from conflict check
        query += ` AND id_agenda != $4`;
        params.push(parseInt(id.replace('cir', '')) || parseInt(id));
      }

      const conflict = await pool.query(query, params);
      if (conflict.rows.length > 0) {
        return res.status(409).json({ error: 'Conflicto de agenda: El quirófano ya está ocupado en ese horario.' });
      }
    }
    
    // Check doctor conflict
    if (fechaCirugia && horaEstimada && medicoACargo) {
       let queryDoc = `
        SELECT id_agenda FROM "${SCHEMA}".agenda_cirugias 
        WHERE fecha_cirugia = $1 AND hora_cirugia = $2 AND (medico_usuario_id = $3 OR procedimiento = $3) 
        AND estado IN ('programada', 'en_procedimiento')
      `;
      let paramsDoc = [fechaCirugia, horaEstimada, medicoACargo];
      
      if (id) {
        queryDoc += ` AND id_agenda != $4`;
        paramsDoc.push(parseInt(id.replace('cir', '')) || parseInt(id));
      }

      const conflictDoc = await pool.query(queryDoc, paramsDoc);
      if (conflictDoc.rows.length > 0) {
        return res.status(409).json({ error: 'Conflicto de agenda: El médico ya tiene una cirugía programada en ese horario.' });
      }
    }
  }
  next();
}

const mapRowToFrontend = (row) => ({
  id: `cir${row.id_agenda}`,
  pacienteId: String(row.id_paciente),
  diagnostico: row.procedimiento || '',
  medicoACargo: row.medico_usuario_id || row.procedimiento || '', // fallback
  especialidad: 'medicina_familiar', // Placeholder if not in DB
  fechaCirugia: row.fecha_cirugia || '',
  horaEstimada: row.hora_cirugia || '',
  lugarCirugia: row.consultorio || '',
  costoEstimado: row.costo_total || 0,
  estado: row.estado || 'pendiente_estudio',
  notaPostoperatoria: row.nota_postoperatoria || undefined,
  fechaRegistro: row.fecha_cirugia || '',
});

router.post('/', checkConflict, async (req, res) => {
  const c = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".agenda_cirugias 
       (id_paciente, procedimiento, fecha_cirugia, hora_cirugia, consultorio, estado, costo_total, medico_usuario_id, nota_postoperatoria) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        parseInt(c.pacienteId), 
        c.diagnostico || 'Sin diagnóstico', 
        c.fechaCirugia || null, 
        c.horaEstimada || null, 
        c.lugarCirugia || null, 
        c.estado || 'pendiente_estudio', 
        c.costoEstimado || 0,
        c.medicoACargo || null,
        c.notaPostoperatoria ? JSON.stringify(c.notaPostoperatoria) : null
      ]
    );
    res.status(201).json(mapRowToFrontend(result.rows[0]));
  } catch (err) {
    console.error("Error en POST /cirugias:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', checkConflict, async (req, res) => {
  const c = req.body;
  const idStr = req.params.id;
  const idNum = parseInt(idStr.replace('cir', ''));
  
  if (isNaN(idNum)) {
    return res.status(400).json({ error: 'ID de cirugía inválido' });
  }

  try {
    const result = await pool.query(
      `UPDATE "${SCHEMA}".agenda_cirugias SET 
        procedimiento = $1,
        fecha_cirugia = $2,
        hora_cirugia = $3,
        consultorio = $4,
        estado = $5,
        costo_total = $6,
        medico_usuario_id = $7,
        nota_postoperatoria = $8
       WHERE id_agenda = $9 RETURNING *`,
      [
        c.diagnostico,
        c.fechaCirugia || null,
        c.horaEstimada || null,
        c.lugarCirugia || null,
        c.estado,
        c.costoEstimado || 0,
        c.medicoACargo || null,
        c.notaPostoperatoria ? JSON.stringify(c.notaPostoperatoria) : null,
        idNum
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cirugía no encontrada' });
    }
    res.json(mapRowToFrontend(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".agenda_cirugias ORDER BY id_agenda DESC`);
    res.json(result.rows.map(mapRowToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
