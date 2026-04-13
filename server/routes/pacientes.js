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

  const nacionalidad = p.nacionalidad || 'Mexicana';
  const identificacion = (p.identificacion || '').replace(/\s/g, '').toUpperCase();

  try {
    // Validaciones de formato en el servidor
    if (nacionalidad === 'Mexicana') {
      const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{1}[0-9]{1}$/;
      if (identificacion && !curpRegex.test(identificacion)) {
        return res.status(400).json({ error: 'Formato de CURP inválido.' });
      }
    } else if (nacionalidad === 'Americana') {
      const passportRegex = /^[0-9]{9}$/;
      if (identificacion && !passportRegex.test(identificacion)) {
        return res.status(400).json({ error: 'El pasaporte americano debe tener 9 dígitos.' });
      }
    }

    // Evitar duplicados por identificacion (CURP/Pasaporte) si la identificación no está vacía
    if (identificacion !== '') {
      console.log(`🔍 Verificando duplicados para ID: ${identificacion}`);
      const duplicado = await pool.query(
        `SELECT 1 FROM "${SCHEMA}".paciente WHERE identificacion = $1 LIMIT 1`,
        [identificacion]
      );
      if (duplicado.rows.length > 0) {
        console.log(`⚠️ Paciente duplicado detectado: ${identificacion}`);
        return res.status(400).json({ duplicado: true, error: 'Este paciente ya existe en la base de datos con esa identificación.' });
      }
    }

    console.log('📝 Insertando nuevo paciente en DB...');
    const result = await pool.query(
      `INSERT INTO "${SCHEMA}".paciente (nombre, apellido, fecha_de_nacimiento, sexo, telefono, numero_expediente, ciudad, fecha_registro, imagen, nacionalidad, identificacion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [nombre, apellido, p.fechaNacimiento, p.sexo, p.telefono, p.numeroExpediente, p.ciudad, p.fechaRegistro, p.imagen || null, nacionalidad, identificacion]
    );

    console.log('✅ Paciente guardado con éxito. ID:', result.rows[0].id_paciente);
    
    // El recordAudit es opcional, si falla no deberia tirar la peticion entera
    try {
      await recordAudit({
        accion: 'Registro de Paciente',
        detalles: `Se registró al paciente: ${nombre} ${apellido} (${p.numeroExpediente}). ID: ${identificacion}`,
        rol: p.rol_solicitante || 'admin',
        nombre_usuario: p.usuario_solicitante || 'Administrador',
        ciudad: p.ciudad
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
    const names = (p.nombre || '').split(' ');
    const nombre = names[0];
    const apellido = names.slice(1).join(' ');
    
    const nacionalidad = p.nacionalidad || 'Mexicana';
    const identificacion = (p.identificacion || '').replace(/\s/g, '').toUpperCase();

    // Validaciones de formato en el servidor
    if (nacionalidad === 'Mexicana') {
      const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{1}[0-9]{1}$/;
      if (identificacion && !curpRegex.test(identificacion)) {
        return res.status(400).json({ error: 'Formato de CURP inválido.' });
      }
    } else if (nacionalidad === 'Americana') {
      const passportRegex = /^[0-9]{9}$/;
      if (identificacion && !passportRegex.test(identificacion)) {
        return res.status(400).json({ error: 'El pasaporte americano debe tener 9 dígitos.' });
      }
    }

    // Evitar duplicados por identificacion en UPDATE si la identificación es de OTRO paciente
    if (identificacion !== '') {
      const duplicado = await pool.query(
        `SELECT id_paciente FROM "${SCHEMA}".paciente WHERE identificacion = $1 AND id_paciente != $2 LIMIT 1`,
        [identificacion, parseInt(id)]
      );
      if (duplicado.rows.length > 0) {
        return res.status(400).json({ duplicado: true, error: 'Este identificador ya está asignado a otro paciente.' });
      }
    }

    await pool.query(
      `UPDATE "${SCHEMA}".paciente SET nombre = $1, apellido = $2, fecha_de_nacimiento = $3, sexo = $4, telefono = $5, ciudad = $6, imagen = $7, nacionalidad = $8, identificacion = $9 WHERE id_paciente = $10`,
      [nombre, apellido, p.fechaNacimiento, p.sexo, p.telefono, p.ciudad, p.imagen || null, nacionalidad, identificacion, parseInt(id)]
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
