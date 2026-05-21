import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

// Middleware to check for conflicts
async function checkConflict(req, res, next) {
  const { fechaCirugia, horaEstimada, duracionEstimada, lugarCirugia, medicoACargo, estado } = req.body;
  const id = req.params.id; // Optional, for PUT

  if (estado === 'programada' || estado === 'en_procedimiento') {
    if (fechaCirugia && horaEstimada && lugarCirugia && duracionEstimada) {
      const [h, m] = horaEstimada.split(':').map(Number);
      const nuevoInicio = h * 60 + m;
      const nuevoFin = nuevoInicio + Number(duracionEstimada);

      let query = `
        SELECT id_agenda, hora_cirugia, duracion_estimada FROM "${SCHEMA}".agenda_cirugias 
        WHERE fecha_cirugia = $1 AND consultorio = $2 
        AND estado IN ('programada', 'en_procedimiento')
      `;
      let params = [fechaCirugia, lugarCirugia];
      
      if (id) {
        query += ` AND id_agenda != $3`;
        params.push(parseInt(id.replace('cir', '')) || parseInt(id));
      }

      const conflict = await pool.query(query, params);
      
      const hayCruce = conflict.rows.some(cirugia => {
        if (!cirugia.hora_cirugia || !cirugia.duracion_estimada) return false;
        const [exH, exM] = cirugia.hora_cirugia.split(':').map(Number);
        const existenteInicio = exH * 60 + exM;
        const existenteFin = existenteInicio + Number(cirugia.duracion_estimada);

        // Fórmula matemática de colisión de intervalos: (InicioA < FinB) Y (FinA > InicioB)
        return (nuevoInicio < existenteFin && nuevoFin > existenteInicio);
      });

      if (hayCruce) {
        return res.status(409).json({ error: 'Conflicto de agenda: El quirófano ya está ocupado en ese rango de horario.' });
      }
    }
    
    // Check doctor conflict
    if (fechaCirugia && horaEstimada && medicoACargo && duracionEstimada) {
      const [h, m] = horaEstimada.split(':').map(Number);
      const nuevoInicio = h * 60 + m;
      const nuevoFin = nuevoInicio + Number(duracionEstimada);

       let queryDoc = `
        SELECT id_agenda, hora_cirugia, duracion_estimada FROM "${SCHEMA}".agenda_cirugias 
        WHERE fecha_cirugia = $1 AND (medico_usuario_id = $2 OR procedimiento = $2) 
        AND estado IN ('programada', 'en_procedimiento')
      `;
      let paramsDoc = [fechaCirugia, medicoACargo];
      
      if (id) {
        queryDoc += ` AND id_agenda != $3`;
        paramsDoc.push(parseInt(id.replace('cir', '')) || parseInt(id));
      }

      const conflictDoc = await pool.query(queryDoc, paramsDoc);
      const hayCruceDoc = conflictDoc.rows.some(cirugia => {
        if (!cirugia.hora_cirugia || !cirugia.duracion_estimada) return false;
        const [exH, exM] = cirugia.hora_cirugia.split(':').map(Number);
        const existenteInicio = exH * 60 + exM;
        const existenteFin = existenteInicio + Number(cirugia.duracion_estimada);
        return (nuevoInicio < existenteFin && nuevoFin > existenteInicio);
      });

      if (hayCruceDoc) {
        return res.status(409).json({ error: 'Conflicto de agenda: El médico ya tiene una cirugía programada en ese rango de horario.' });
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
  duracionEstimada: row.duracion_estimada || 60,
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
       (id_paciente, procedimiento, fecha_cirugia, hora_cirugia, duracion_estimada, consultorio, estado, costo_total, medico_usuario_id, nota_postoperatoria) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        parseInt(c.pacienteId), 
        c.diagnostico || 'Sin diagnóstico', 
        c.fechaCirugia || null, 
        c.horaEstimada || null, 
        c.duracionEstimada ? parseInt(c.duracionEstimada) : 60,
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
        duracion_estimada = $4,
        consultorio = $5,
        estado = $6,
        costo_total = $7,
        medico_usuario_id = $8,
        nota_postoperatoria = $9
       WHERE id_agenda = $10 RETURNING *`,
      [
        c.diagnostico,
        c.fechaCirugia || null,
        c.horaEstimada || null,
        c.duracionEstimada ? parseInt(c.duracionEstimada) : 60,
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
