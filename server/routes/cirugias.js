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
  citaId: row.id_cita ? `cit${row.id_cita}` : undefined,
  diagnostico: row.procedimiento || '',
  medicoACargo: row.medico_usuario_id || row.procedimiento || '', // fallback
  especialidad: 'medicina_familiar', // Placeholder if not in DB
  fechaCirugia: row.fecha_cirugia || '',
  horaEstimada: row.hora_cirugia || '',
  duracionEstimada: row.duracion_estimada || 60,
  lugarCirugia: row.consultorio || '',
  requiereRentaExterna: Boolean(row.requiere_renta_externa),
  estatusRentaSede: row.estatus_renta_sede || 'no_aplica',
  costoEstimado: row.costo_total || 0,
  estado: row.estado || 'pendiente_estudio',
  notaPostoperatoria: row.nota_postoperatoria || undefined,
  fechaRegistro: row.fecha_cirugia || '',
});

router.post('/', checkConflict, async (req, res) => {
  const c = req.body;
  try {
    const citaIdNum = c.citaId ? parseInt(String(c.citaId).replace('cit', '')) : null;

    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".agenda_cirugias 
       (id_paciente, procedimiento, fecha_cirugia, hora_cirugia, duracion_estimada, consultorio, requiere_renta_externa, estatus_renta_sede, id_cita, estado, costo_total, medico_usuario_id, nota_postoperatoria) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        parseInt(c.pacienteId),
        c.diagnostico || 'Sin diagnóstico',
        c.fechaCirugia || null,
        c.horaEstimada || null,
        c.duracionEstimada ? parseInt(c.duracionEstimada) : 60,
        c.lugarCirugia || null,
        c.requiereRentaExterna || false,
        c.estatusRentaSede || 'no_aplica',
        citaIdNum,
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
    // 1. Obtener la cirugía existente primero para preservar campos no enviados en la petición parcial
    const existing = await pool.query(`SELECT * FROM "${SCHEMA}".agenda_cirugias WHERE id_agenda = $1`, [idNum]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Cirugía no encontrada' });
    }
    const current = existing.rows[0];

    // 2. Fusionar valores anteriores con los nuevos recibidos
    const procedimiento = c.diagnostico !== undefined ? c.diagnostico : current.procedimiento;
    const fecha_cirugia = c.fechaCirugia !== undefined ? c.fechaCirugia : current.fecha_cirugia;
    const hora_cirugia = c.horaEstimada !== undefined ? c.horaEstimada : current.hora_cirugia;
    const duracion_estimada = c.duracionEstimada !== undefined ? parseInt(c.duracionEstimada) : current.duracion_estimada;
    const consultorio = c.lugarCirugia !== undefined ? c.lugarCirugia : current.consultorio;
    const requiere_renta_externa = c.requiereRentaExterna !== undefined ? Boolean(c.requiereRentaExterna) : current.requiere_renta_externa;
    const estatus_renta_sede = c.estatusRentaSede !== undefined ? c.estatusRentaSede : current.estatus_renta_sede;
    const estado = c.estado !== undefined ? c.estado : current.estado;
    const costo_total = c.costoEstimado !== undefined ? c.costoEstimado : current.costo_total;
    const medico_usuario_id = c.medicoACargo !== undefined ? c.medicoACargo : current.medico_usuario_id;
    
    // Para notas postoperatorias, manejamos tanto objetos estructurados como JSON string
    let nota_postoperatoria = current.nota_postoperatoria;
    if (c.notaPostoperatoria !== undefined) {
      nota_postoperatoria = c.notaPostoperatoria ? (typeof c.notaPostoperatoria === 'object' ? JSON.stringify(c.notaPostoperatoria) : c.notaPostoperatoria) : null;
    } else if (current.nota_postoperatoria && typeof current.nota_postoperatoria === 'object') {
      nota_postoperatoria = JSON.stringify(current.nota_postoperatoria);
    }

    // 3. Ejecutar la actualización completa con valores consolidados
    const result = await pool.query(
      `UPDATE "${SCHEMA}".agenda_cirugias SET 
        procedimiento = $1,
        fecha_cirugia = $2,
        hora_cirugia = $3,
        duracion_estimada = $4,
        consultorio = $5,
        requiere_renta_externa = $6,
        estatus_renta_sede = $7,
        estado = $8,
        costo_total = $9,
        medico_usuario_id = $10,
        nota_postoperatoria = $11
       WHERE id_agenda = $12 RETURNING *`,
      [
        procedimiento,
        fecha_cirugia,
        hora_cirugia,
        duracion_estimada,
        consultorio,
        requiere_renta_externa,
        estatus_renta_sede,
        estado,
        costo_total,
        medico_usuario_id,
        nota_postoperatoria,
        idNum
      ]
    );

    res.json(mapRowToFrontend(result.rows[0]));
  } catch (err) {
    console.error("Error en PUT /cirugias:", err);
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
