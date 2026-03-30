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
  
  const names = (p.nombre || '').split(' ');
  const nombre = names[0];
  const apellido = names.slice(1).join(' ');

  try {
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".paciente (nombre, apellido, fecha_de_nacimiento, sexo, telefono, numero_expediente, ciudad, fecha_registro, imagen) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [nombre, apellido, p.fechaNacimiento, p.sexo, p.telefono, p.numeroExpediente, p.ciudad, p.fechaRegistro, p.imagen || null]
    );

    await recordAudit({
      accion: 'Registro de Paciente',
      detalles: `Se registró al paciente: ${nombre} ${apellido} (${p.numeroExpediente})`,
      rol: p.rol_solicitante || 'admin',
      nombre_usuario: p.usuario_solicitante || 'Administrador',
      ciudad: p.ciudad
    });

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
    const names = (p.nombre || '').split(' ');
    const nombre = names[0];
    const apellido = names.slice(1).join(' ');
    
    await pool.query(
      `UPDATE "${SCHEMA}".paciente SET nombre = $1, apellido = $2, fecha_de_nacimiento = $3, sexo = $4, telefono = $5, ciudad = $6, imagen = $7 WHERE id_paciente = $8`,
      [nombre, apellido, p.fechaNacimiento, p.sexo, p.telefono, p.ciudad, p.imagen || null, parseInt(id)]
    );

    await recordAudit({
      accion: 'Actualización de Paciente',
      detalles: `Se actualizó la información de: ${nombre} ${apellido}`,
      rol: p.rol_solicitante || 'admin',
      nombre_usuario: p.usuario_solicitante || 'Administrador'
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
