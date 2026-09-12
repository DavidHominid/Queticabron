import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { mapPaciente, mapCita, recordAudit } from '../helpers/utils.js';

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

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM "${SCHEMA}".paciente WHERE id_paciente = $1 LIMIT 1`,
      [parseInt(id)],
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    res.json(mapPaciente(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Todas las citas de un paciente (sin filtro de fecha — necesario para expedientes históricos)
router.get('/:id/citas', async (req, res) => {
  const { id } = req.params;
  try {
    // Detectar referencia de tipo_cita igual que en citas.js
    let joinTipo = '';
    let precioCol = 'NULL';
    let durCol = 'NULL';
    let nombreCol = 'NULL';
    try {
      const fkRes = await pool.query(
        `SELECT ccu.table_name AS ref_table
         FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
         WHERE tc.table_schema = $1
           AND tc.table_name = 'citas'
           AND tc.constraint_type = 'FOREIGN KEY'
           AND tc.constraint_name = 'citas_fk_tipo_cita'
         LIMIT 1`,
        [SCHEMA],
      );
      const t = String(fkRes.rows?.[0]?.ref_table || '').trim();
      if (t === 'tipos_cita') {
        joinTipo = `LEFT JOIN "${SCHEMA}".tipos_cita etc ON c.tipo_cita_id = etc.id`;
        precioCol = 'etc.costo';
        durCol = 'etc.duracion_minutos';
        nombreCol = 'etc.nombre';
      } else if (t === 'evento_tipo_cita') {
        joinTipo = `LEFT JOIN "${SCHEMA}".evento_tipo_cita etc ON c.tipo_cita_id = etc.id`;
        precioCol = 'etc.precio';
        durCol = 'etc.duracion_minutos';
        nombreCol = 'etc.nombre';
      }
    } catch {
      // sin join de tipo_cita — columnas quedan como NULL
    }

    const query = `
      SELECT c.*, t.id_triaje,
             ${nombreCol} AS tipo_cita_nombre,
             ${durCol} AS tipo_cita_duracion_minutos,
             ${precioCol} AS tipo_cita_precio
      FROM "${SCHEMA}".citas c
      LEFT JOIN "${SCHEMA}".triaje t ON c.id_cita = t.id_cita
      ${joinTipo}
      WHERE c.id_paciente = $1
      ORDER BY c.fecha_cita DESC, c.id_cita DESC
    `;
    const result = await pool.query(query, [parseInt(id)]);
    res.json(result.rows.map(mapCita));
  } catch (err) {
    console.error('❌ Error en GET /api/pacientes/:id/citas:', err.message);
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
