import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapPaciente, recordAudit } from '../helpers/utils.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "${SCHEMA}".paciente ORDER BY id_paciente DESC`);
    console.log(`📦 Enviando ${result.rows.length} pacientes al frontend.`);
    res.json(result.rows.map(mapPaciente));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const p = req.body;
  console.log('📬 Recibida petición POST para registrar:', JSON.stringify(p));

  const rawNombre = (p.nombre || '').trim();
  const rawApellido = (p.apellido || '').trim();

  let nombre = rawNombre;
  let apellido = rawApellido;

  if (!apellido && rawNombre) {
    const spaceIdx = rawNombre.indexOf(' ');
    if (spaceIdx !== -1) {
      nombre = rawNombre.substring(0, spaceIdx);
      apellido = rawNombre.substring(spaceIdx + 1);
    }
  }

  try {
    // Evitar duplicados por nombre + apellido exactos (case-insensitive)
    if (nombre && apellido) {
      const dupNombre = await pool.query(
        `SELECT 1 FROM "${SCHEMA}".paciente
         WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
           AND LOWER(TRIM(apellido)) = LOWER(TRIM($2))
         LIMIT 1`,
        [nombre, apellido]
      );
      if (dupNombre.rows.length > 0) {
        console.log(`⚠️ Paciente duplicado detectado por nombre completo: ${nombre} ${apellido}`);
        return res.status(400).json({
          duplicado: true,
          error: `Ya existe un paciente registrado con el nombre "${nombre} ${apellido}".`,
        });
      }
    }

    console.log('📝 Insertando nuevo paciente en DB...');
    const ciudad = p.ciudad || 'Puerto Peñasco';
    const fechaRegistro = p.fechaRegistro || new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".paciente (nombre, apellido, fecha_de_nacimiento, sexo, telefono, numero_expediente, ciudad, fecha_registro) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nombre, apellido, p.fechaNacimiento, p.sexo, p.telefono, p.numeroExpediente, ciudad, fechaRegistro]
    );

    console.log('✅ Paciente guardado con éxito. ID:', result.rows[0].id_paciente);
    
    // El recordAudit es opcional, si falla no deberia tirar la peticion entera
    try {
      await recordAudit({
        paciente_id: result.rows[0].id_paciente,
        accion: 'Registro de Paciente',
        detalles: `Se registró al paciente: ${nombre} ${apellido} (${p.numeroExpediente || 'sin número de expediente'})`,
        rol: p.rol_solicitante || 'admin',
        nombre_usuario: p.usuario_solicitante || 'Administrador',
        ciudad: ciudad
      });
    } catch (auditErr) {
      console.error('⚠️ Error no crítico en auditoría:', auditErr.message);
    }

    res.status(201).json(mapPaciente(result.rows[0]));
  } catch (err) {
    console.error('❌ Error al registrar paciente:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const p = req.body;
  try {
    const rawNombre = (p.nombre || '').trim();
    const rawApellido = (p.apellido || '').trim();

    let nombre = rawNombre;
    let apellido = rawApellido;

    if (!apellido && rawNombre) {
      const spaceIdx = rawNombre.indexOf(' ');
      if (spaceIdx !== -1) {
        nombre = rawNombre.substring(0, spaceIdx);
        apellido = rawNombre.substring(spaceIdx + 1);
      }
    }

    // Evitar duplicados por nombre + apellido en UPDATE (si pertenece a otro paciente)
    if (nombre && apellido) {
      const dupNombre = await pool.query(
        `SELECT id_paciente FROM "${SCHEMA}".paciente
         WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
           AND LOWER(TRIM(apellido)) = LOWER(TRIM($2))
           AND id_paciente != $3
         LIMIT 1`,
        [nombre, apellido, parseInt(id)]
      );
      if (dupNombre.rows.length > 0) {
        return res.status(400).json({
          duplicado: true,
          error: `Ya existe otro paciente registrado con el nombre "${nombre} ${apellido}".`,
        });
      }
    }

    const ciudad = p.ciudad || 'Puerto Peñasco';
    const result = await pool.query(
      `UPDATE "${SCHEMA}".paciente SET nombre = $1, apellido = $2, fecha_de_nacimiento = $3, sexo = $4, telefono = $5, ciudad = $6 WHERE id_paciente = $7 RETURNING *`,
      [nombre, apellido, p.fechaNacimiento, p.sexo, p.telefono, ciudad, parseInt(id)]
    );

    try {
      await recordAudit({
        paciente_id: parseInt(id),
        accion: 'Actualización de Paciente',
        detalles: `Se actualizó la información de: ${nombre} ${apellido}`,
        rol: p.rol_solicitante || 'admin',
        nombre_usuario: p.usuario_solicitante || 'Administrador'
      });
    } catch (auditErr) {
      console.error('⚠️ Error no crítico en auditoría:', auditErr.message);
    }

    res.json(mapPaciente(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const rol = String(req.body?.rol_solicitante || req.query?.rol_solicitante || '').toLowerCase();
  const nombreUsuario = String(req.body?.usuario_solicitante || req.query?.usuario_solicitante || 'Administrador');
  const ciudad = String(req.body?.ciudad || req.query?.ciudad || '');

  if (rol !== 'administrador' && rol !== 'admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    const result = await pool.query(
      `UPDATE "${SCHEMA}".paciente
       SET eliminado = true,
           eliminado_en = NOW(),
           eliminado_por = $1
       WHERE id_paciente = $2
       RETURNING *`,
      [nombreUsuario, parseInt(id)],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const row = result.rows[0];
    try {
      await recordAudit({
        accion: 'Eliminación de Paciente',
        detalles: `Se eliminó (lógico) al paciente: ${row.nombre} ${row.apellido || ''} (${row.numero_expediente}).`,
        rol: rol,
        nombre_usuario: nombreUsuario,
        ciudad: ciudad || row.ciudad || undefined,
      });
    } catch (auditErr) {
      console.error('⚠️ Error no crítico en auditoría:', auditErr.message);
    }

    res.json({ success: true, paciente: mapPaciente(row) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
