import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3001;

// Configuración de la base de datos
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'C4rn4g304',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'localhost',
});

// Diagnóstico profundo de la base de datos
async function diagnoseDB() {
  try {
    const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata");
    console.log('📂 Esquemas disponibles:', schemas.rows.map(r => r.schema_name).join(', '));
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'Palabras_De_Esperanza'
    `);
    console.log('📊 Tablas en Palabras_De_Esperanza:', tables.rows.map(r => r.table_name).join(', '));
    
    if (tables.rows.some(t => t.table_name === 'paciente')) {
      console.log('✅ Tabla "paciente" detectada.');
    } else {
      console.error('❌ ERROR: La tabla "paciente" NO existe en el esquema Palabras_De_Esperanza.');
    }

    if (tables.rows.some(t => t.table_name === 'auditoria')) {
      console.log('✅ Tabla "auditoria" detectada.');
    } else {
      console.error('❌ ERROR: La tabla "auditoria" NO existe. Esto bloquea el registro de pacientes.');
    }
  } catch (err) {
    console.error('❌ Error de diagnóstico:', err.message);
  }
}
diagnoseDB();

app.use(cors());
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
  next();
});

// Helper para registrar auditoría de forma centralizada
async function recordAudit(data) {
  try {
    const { usuario_id, nombre_usuario, rol, accion, detalles, ciudad } = data;
    const idValue = `aud${Date.now()}-${Math.floor(Math.random()*10000)}`;
    await pool.query(
      'INSERT INTO "Palabras_De_Esperanza".auditoria (id, usuario_id, nombre_usuario, rol, accion, detalles, fecha_hora, ciudad) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [idValue, usuario_id || '', nombre_usuario || 'Sistema', rol || '---', accion, detalles || '', new Date(), ciudad || 'Sonoyta']
    );
  } catch (err) {
    console.error('⚠️ Fallo al registrar auditoría:', err.message);
  }
}

// Helper para mapear columnas de paciente DB -> Frontend
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const mapPaciente = (p) => ({
  id: String(p.id_paciente),
  nombre: `${p.nombre} ${p.apellido || ''}`.trim(),
  fechaNacimiento: formatDate(p.fecha_de_nacimiento),
  sexo: p.sexo,
  telefono: p.telefono,
  numeroExpediente: p.numero_expediente,
  ciudad: p.ciudad,
  fechaRegistro: formatDate(p.fecha_registro),
  edad: p.edad || (p.fecha_de_nacimiento ? calculateAge(p.fecha_de_nacimiento) : 0),
  imagen: p.imagen
});

const calculateAge = (birthday) => {
  const ageDifMs = Date.now() - new Date(birthday).getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// --- Rutas de Pacientes ---
app.get('/api/pacientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Palabras_De_Esperanza".paciente ORDER BY id_paciente DESC');
    console.log(`📦 Enviando ${result.rows.length} pacientes al frontend.`);
    res.json(result.rows.map(mapPaciente));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pacientes', async (req, res) => {
  const p = req.body;
  console.log('📬 Recibida petición POST para registrar:', JSON.stringify(p));
  
  const names = (p.nombre || '').split(' ');
  const nombre = names[0];
  const apellido = names.slice(1).join(' ');

  try {
    const result = await pool.query(
      'INSERT INTO "Palabras_De_Esperanza".paciente (nombre, apellido, fecha_de_nacimiento, sexo, telefono, numero_expediente, ciudad, fecha_registro, imagen) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [nombre, apellido, p.fechaNacimiento, p.sexo, p.telefono, p.numeroExpediente, p.ciudad, p.fechaRegistro, p.imagen || null]
    );

    // Auditoría automática
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

app.put('/api/pacientes/:id', async (req, res) => {
  const { id } = req.params;
  const p = req.body;
  try {
    const names = (p.nombre || '').split(' ');
    const nombre = names[0];
    const apellido = names.slice(1).join(' ');
    
    await pool.query(
      'UPDATE "Palabras_De_Esperanza".paciente SET nombre = $1, apellido = $2, fecha_de_nacimiento = $3, sexo = $4, telefono = $5, ciudad = $6, imagen = $7 WHERE id_paciente = $8',
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

// --- Rutas de Citas ---
// La BD usa un ENUM con valores: pendiente, confirmada, cancelada, completada
const toFEEstado = (dbEstado) => {
  const map = {
    'pendiente':  'programada',
    'confirmada': 'en_triage',
    'completada': 'completada',
    'cancelada':  'cancelada',
    // valores legacy
    'atendida':   'completada',
    'noshow':     'no_asistio',
    'en_triage':  'en_triage',
    'en_consulta':'en_consulta',
  };
  return map[dbEstado] ?? dbEstado;
};

const toDBEstado = (feEstado) => {
  const map = {
    'programada':  'pendiente',
    'en_triage':   'confirmada',
    'en_consulta': 'confirmada',
    'completada':  'completada',
    'cancelada':   'cancelada',
    'cancelado':   'cancelada',
    'no_asistio':  'cancelada',
  };
  return map[feEstado] ?? 'pendiente';
};

const mapCita = (c) => {
  let feEstado = toFEEstado(c.estado);
  
  // LOGICA DINAMICA: Si el estado en DB es 'confirmada', 
  // pero ya TIENE un registro de triaje (id_triaje no es null), 
  // entonces para el frontend es 'en_consulta'
  if (c.estado === 'confirmada' && c.id_triaje) {
    feEstado = 'en_consulta';
  }

  return {
    id: String(c.id_cita || c.id || ''),
    pacienteId: String(c.id_paciente || ''),
    eventoId: c.evento_id,
    fecha: c.fecha_cita || c.fecha,
    hora: c.hora || '08:00',
    especialidad: c.especialidad,
    medicoEncargado: c.medico_encargado,
    consultorio: c.consultorio,
    estado: feEstado,
    costoPagado: c.costo_pagado || 0
  };
};

app.get('/api/citas', async (req, res) => {
  try {
    // JOIN con triaje para saber si el paciente ya pasó por ahí
    const query = `
      SELECT c.*, t.id_triaje 
      FROM "Palabras_De_Esperanza".citas c
      LEFT JOIN "Palabras_De_Esperanza".triaje t ON c.id_cita = t.id_cita
      ORDER BY c.id_cita DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows.map(mapCita));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/citas', async (req, res) => {
  const c = req.body;
  try {
    const tableInfo = await pool.query('SELECT * FROM "Palabras_De_Esperanza".citas LIMIT 0');
    const dbCols = tableInfo.fields.map(f => f.name);

    const incomingData = {
      id_paciente: parseInt(c.pacienteId),
      pacienteId: parseInt(c.pacienteId),
      evento_id: c.eventoId ?? null,
      eventoId: c.eventoId ?? null,
      fecha_cita: c.fecha,
      fecha: c.fecha,
      hora: c.hora ?? '08:00',
      estado: toDBEstado(c.estado || 'programada'),
      especialidad: c.especialidad ?? 'medicina_familiar',
      medico_encargado: c.medicoEncargado ?? null,
      medicoEncargado: c.medicoEncargado ?? null,
      consultorio: c.consultorio ?? 'Consultorio 1',
      costo_pagado: c.costoPagado ?? 0,
      costoPagado: c.costoPagado ?? 0
    };

    const finalData = {};
    for (const key in incomingData) {
      const dbColName = dbCols.find(col => col.trim().toLowerCase() === key.toLowerCase());
      if (dbColName && finalData[dbColName] === undefined) {
        finalData[dbColName] = incomingData[key];
      }
    }

    const queryCols = Object.keys(finalData).map(col => `"${col}"`).join(', ');
    const placeholders = Object.keys(finalData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(finalData);

    const query = `INSERT INTO "Palabras_De_Esperanza".citas (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);

    await recordAudit({
      accion: 'Nueva Cita',
      detalles: `Cita programada para paciente ID: ${c.pacienteId} el ${c.fecha}`,
      rol: c.rol_solicitante || 'recepcion',
      nombre_usuario: c.usuario_solicitante || 'Administrador'
    });

    res.status(201).json(mapCita(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en POST /api/citas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/citas/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE "Palabras_De_Esperanza".citas SET estado = $1::"Palabras_De_Esperanza".estado_cita WHERE id_cita = $2 RETURNING *',
      [toDBEstado(estado), parseInt(id)]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(mapCita(result.rows[0]));
  } catch (err) {
    console.error('❌ Error en PUT /api/citas/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Rutas de Usuarios ---
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, nombre, usuario, rol, ciudad FROM "Palabras_De_Esperanza".usuarios WHERE usuario = $1 AND password = $2',
      [usuario, password]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Palabras_De_Esperanza".usuarios');
    res.json(result.rows.map(u => ({
      ...u,
      id: String(u.id),
      email: u.email || u.usuario || '', // Mapeo email <-> usuario
      usuario: u.usuario || u.email || ''
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios', async (req, res) => {
  const u = req.body;
  try {
    // Obtenemos el ID máximo actual para generar el siguiente (ya que no es SERIAL)
    const maxIdRes = await pool.query('SELECT MAX(CAST(id AS INTEGER)) as max_id FROM "Palabras_De_Esperanza".usuarios');
    const nextId = (maxIdRes.rows[0].max_id || 0) + 1;

    const tableInfo = await pool.query('SELECT * FROM "Palabras_De_Esperanza".usuarios LIMIT 0');
    const dbCols = tableInfo.fields.map(f => f.name);

    const incomingData = {
      id: nextId,
      nombre: u.nombre,
      usuario: u.email || u.usuario,
      email: u.email || u.usuario,
      password: u.password,
      rol: u.rol,
      ciudad: u.ciudad,
      especialidad: u.especialidad || null,
      activo: u.activo ?? true
    };

    const finalData = {};
    for (const key in incomingData) {
      const dbColName = dbCols.find(col => col.trim().toLowerCase() === key.toLowerCase());
      if (dbColName && finalData[dbColName] === undefined) {
        finalData[dbColName] = incomingData[key];
      }
    }

    const queryCols = Object.keys(finalData).map(col => `"${col}"`).join(', ');
    const placeholders = Object.keys(finalData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(finalData);

    const query = `INSERT INTO "Palabras_De_Esperanza".usuarios (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    const created = result.rows[0];

    await recordAudit({
      accion: 'Creación de Usuario',
      detalles: `Se creó el usuario: ${u.nombre} con el rol: ${u.rol}`,
      rol: 'administrador',
      nombre_usuario: 'Administrador Sistema'
    });

    res.status(201).json({ ...created, id: String(created.id), email: created.email || created.usuario });
  } catch (err) {
    console.error('❌ Error en POST /api/usuarios:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    const tableInfo = await pool.query('SELECT * FROM "Palabras_De_Esperanza".usuarios LIMIT 0');
    const dbCols = tableInfo.fields.map(f => f.name);

    const incomingData = {
      nombre: u.nombre,
      usuario: u.email || u.usuario,
      email: u.email || u.usuario,
      password: u.password,
      rol: u.rol,
      ciudad: u.ciudad,
      especialidad: u.especialidad,
      activo: u.activo
    };

    const sets = [];
    const values = [];
    let i = 1;
    for (const key in incomingData) {
      if (incomingData[key] === undefined) continue;
      const dbColName = dbCols.find(col => col.trim().toLowerCase() === key.toLowerCase());
      if (dbColName) {
        sets.push(`"${dbColName}" = $${i++}`);
        values.push(incomingData[key]);
      }
    }
    
    values.push(parseInt(id) || id);
    const query = `UPDATE "Palabras_De_Esperanza".usuarios SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await pool.query(query, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const updated = result.rows[0];
    res.json({ ...updated, id: String(updated.id), email: updated.email || updated.usuario });
  } catch (err) {
    console.error('❌ Error en PUT /api/usuarios/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM "Palabras_De_Esperanza".usuarios WHERE id = $1', [parseInt(id) || id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auditoria', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Palabras_De_Esperanza".auditoria ORDER BY fecha_hora DESC LIMIT 100');
    // Mapeo para el front (camelCase)
    const mapped = result.rows.map(r => ({
      id: String(r.id_auditoria || r.id || ''),
      usuarioId: String(r.usuario_id || ''),
      nombreUsuario: r.nombre_usuario || 'Sistema',
      rol: r.rol || '---',
      accion: r.accion || '---',
      detalles: r.detalles || '---',
      fechaHora: r.fecha_hora || r.fechaHora || new Date().toISOString(),
      ciudad: r.ciudad || '---'
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auditoria', async (req, res) => {
  const a = req.body;
  console.log('📝 Auditoría recibida:', a.accion);
  try {
    const tableInfo = await pool.query('SELECT * FROM "Palabras_De_Esperanza".auditoria LIMIT 0');
    const dbCols = tableInfo.fields.map(f => f.name);
    console.log('DB COLS:', JSON.stringify(dbCols));
    
    // Mapeo flexible de lo que viene del front a lo que espera la DB
    const incomingData = {
      usuario_id: String(a.usuarioId || ''),
      nombre_usuario: a.nombreUsuario || 'Sistema',
      rol: a.rol || 'triage',
      accion: a.accion,
      detalles: a.detalles || '',
      fecha_hora: a.fechaHora || new Date(),
      ciudad: a.ciudad || 'Sonoyta'
    };

    // Buscamos el nombre real de la columna en la DB (case-insensitive + trim)
    const finalData = {};
    for (const key in incomingData) {
      const dbColName = dbCols.find(c => c.trim().toLowerCase() === key.toLowerCase());
      if (dbColName) {
        finalData[dbColName] = incomingData[key];
      }
    }
    
    // CASO ESPECIAL: Si 'detalles' no se detectó pero es requerido, lo forzamos
    if (!finalData.detalles && !finalData.Detalles) {
      finalData['detalles'] = a.detalles || '';
    }

    if (!finalData.id && !finalData.Id) {
      const dbColId = dbCols.find(c => c.trim().toLowerCase() === 'id');
      if (dbColId) {
        finalData[dbColId] = a.id || `aud${Date.now()}-${Math.floor(Math.random()*10000)}`;
      }
    }

    const queryCols = Object.keys(finalData).map(c => `"${c}"`).join(', ');
    const placeholders = Object.keys(finalData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(finalData);

    const query = `INSERT INTO "Palabras_De_Esperanza".auditoria (${queryCols}) VALUES (${placeholders})`;
    try {
      await pool.query(query, values);
    } catch (auditErr) {
      console.warn('⚠️ Auditoría falló (no crítica):', auditErr.message);
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('❌ Error en endpoint auditoría:', err.message);
    res.status(200).json({ success: false, warning: 'Audit failed but operation proceeded' });
  }
});

// --- Rutas de Triage ---
const mapTriage = (t) => ({
  id: String(t.id_triaje),
  citaId: String(t.id_cita),
  pacienteId: String(t.id_paciente),
  fechaHora: t.fecha_triaje,
  signosVitales: {
    temperatura: t.temperatura,
    presionArterial: t.presion_arterial,
    ritmoCardiaco: t.ritmo_cardiaco,
    frecuenciaRespiratoria: t.frecuencia_respiratoria,
    altura: t.altura,
    peso: t.peso,
    saturacionOxigeno: t.saturacion_oxigeno || 98,
    azucarEnSangre: t.azucar_en_sangre || 100
  },
  observaciones: t.observaciones,
  realizadoPor: t.realizado_por || 'Sistema'
});

app.get('/api/triage', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Palabras_De_Esperanza".triaje ORDER BY id_triaje DESC');
    res.json(result.rows.map(mapTriage));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/triage', async (req, res) => {
  const t = req.body;
  const s = t.signosVitales || {};
  console.log('🤒 Triage recibido:', t.citaId);
  
  try {
    const tableInfo = await pool.query('SELECT * FROM "Palabras_De_Esperanza".triaje LIMIT 0');
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

    const query = `INSERT INTO "Palabras_De_Esperanza".triaje (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);

    // AUTOMATIZACIÓN: Actualizar estado de la cita a 'confirmada' (que el front mapeará a en_consulta si hay registrosTriage)
    if (t.citaId) {
      await pool.query('UPDATE "Palabras_De_Esperanza".citas SET estado = $1 WHERE id_cita = $2', ['confirmada', parseInt(t.citaId)]);
      console.log('✅ Cita actualizada a confirmada:', t.citaId);
    }

    res.status(201).json(mapTriage(result.rows[0]));

    // Auditoría automática
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

// --- Rutas de Consultas ---
app.post('/api/consultas', async (req, res) => {
  const c = req.body;
  console.log('📝 Consulta recibida para paciente:', c.pacienteId);
  try {
    const tableInfo = await pool.query('SELECT * FROM "Palabras_De_Esperanza".nota_medica LIMIT 0');
    const dbCols = tableInfo.fields.map(f => f.name);

    const incomingData = {
      id_cita: parseInt(c.citaId),
      id_paciente: parseInt(c.pacienteId),
      motivo_consulta: c.motivoConsulta,
      padecimiento_actual: c.padecimientoActual,
      exploracion_fisica: c.exploracionFisica,
      diagnostico: c.diagnostico,
      tratamiento: c.tratamiento,
      plan_tratamiento: c.planTratamiento || c.tratamiento,
      medicamentos: JSON.stringify(c.medicamentosRecetados || []),
      indicaciones: c.recomendaciones || '',
      proxima_cita: c.proximaConsulta || null,
      fecha_nota: new Date()
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

    const query = `INSERT INTO "Palabras_De_Esperanza".nota_medica (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    
    // Auditoría automática
    const idValue = `aud${Date.now()}-${Math.floor(Math.random()*10000)}`;
    await pool.query('INSERT INTO "Palabras_De_Esperanza".auditoria (id, nombre_usuario, rol, accion, detalles, fecha_hora, ciudad) VALUES ($1, $2, $3, $4, $5, $6, $7)',
       [idValue, c.medicoEncargado || 'Medico', 'medico', 'Consulta Médica', `Completó consulta para paciente ID: ${c.pacienteId}`, new Date(), 'Sonoyta']);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error en POST /api/consultas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/consultas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Palabras_De_Esperanza".nota_medica ORDER BY id_nota DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rutas de Cirugías ---
app.post('/api/cirugias', async (req, res) => {
  const c = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO "Palabras_De_Esperanza".agenda_cirugias (id_paciente, procedimiento, fecha_cirugia, hora_cirugia, consultorio, estado, costo_total) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [parseInt(c.pacienteId), c.id_procedimiento || 1, c.fecha, c.hora, c.sala || 'Quirofano 1', c.estado || 'programada', c.costoTotal || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cirugias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Palabras_De_Esperanza".agenda_cirugias ORDER BY id_agenda DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rutas de Seguimientos ---
app.get('/api/seguimientos', async (req, res) => {
  try {
    // Intentamos buscar por 'nota' o 'motivo' si 'descripcion' no existe
    const result = await pool.query('SELECT * FROM "Palabras_De_Esperanza".nota_medica ORDER BY id_nota DESC LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error en GET /api/seguimientos:', err.message);
    res.json([]);
  }
});

// --- Rutas de Estudios ---
app.get('/api/estudios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Palabras_De_Esperanza".expediente ORDER BY id_expediente DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rutas de Eventos ---
const mapEvento = (e) => ({
  id: String(e.id || ''),
  nombre: e.titulo || '',
  ciudad: e.ubicacion || 'sonoyta',
  fechaInicio: e.fecha_inicio,
  fechaFin: e.fecha_fin,
  fechaLimiteInscripcion: e.fecha_inicio, // Fallback
  especialidades: e.especialidades || [],
  estado: e.estado || 'activo'
});

app.post('/api/eventos', async (req, res) => {
  const e = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO "Palabras_De_Esperanza".eventos (titulo, descripcion, ubicacion, fecha_inicio, fecha_fin, estado, especialidades) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [e.nombre, e.descripcion || '', e.ciudad || 'Sonoyta', e.fechaInicio, e.fechaFin, e.estado || 'activo', JSON.stringify(e.especialidades || [])]
    );
    res.status(201).json(mapEvento(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/eventos/:id', async (req, res) => {
  const { id } = req.params;
  const e = req.body;
  try {
    const result = await pool.query(
      'UPDATE "Palabras_De_Esperanza".eventos SET titulo = $1, ubicacion = $2, fecha_inicio = $3, fecha_fin = $4, estado = $5, especialidades = $6 WHERE id = $7 RETURNING *',
      [e.nombre, e.ciudad, e.fechaInicio, e.fechaFin, e.estado, JSON.stringify(e.especialidades || []), id]
    );
    res.json(mapEvento(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/eventos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Palabras_De_Esperanza".eventos');
    res.json(result.rows.map(mapEvento));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Iniciar Servidor ---
app.listen(port, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${port}`);
});
