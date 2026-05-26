import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { recordAudit } from '../helpers/utils.js';

const router = express.Router();

const fechaYmd = (d = new Date()) => d.toISOString().slice(0, 10);
const normalizarYmd = (value) => {
  const s = String(value || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

// Los roles en public.usuarios usan el prefijo "citas_" del equipo líder.
// Mapeamos a los roles internos de esta app.
const mapearRol = (rolDB) => {
  const r = String(rolDB || '').toLowerCase();
  if (r === 'citas_medico' || r === 'medico') return 'medico';
  if (r === 'citas_administrador' || r === 'administrador' || r === 'admin') return 'administrador';
  if (r === 'citas_recepcion' || r === 'recepcion') return 'recepcion';
  if (r === 'citas_triage' || r === 'triage') return 'triage';
  // Rol genérico: mapear por nombre parcial
  if (r.includes('medico')) return 'medico';
  if (r.includes('admin')) return 'administrador';
  if (r.includes('triage')) return 'triage';
  if (r.includes('recepcion')) return 'recepcion';
  return 'recepcion'; // default seguro
};

const isUsuarioActivoEfectivo = (u) => {
  if (u?.activo === false) return false;
  const hoy = new Date();
  if (u?.activo_desde) {
    const desde = new Date(u.activo_desde);
    if (!Number.isNaN(desde.getTime()) && desde > hoy) return false;
  }
  if (u?.activo_hasta) {
    const hasta = new Date(u.activo_hasta);
    if (!Number.isNaN(hasta.getTime()) && hasta < hoy) return false;
  }
  return true;
};

// Auto-desactivar usuarios vencidos en public.usuarios
const aplicarAutoDesactivacion = async () => {
  try {
    await pool.query(
      `UPDATE public.usuarios
       SET activo = false
       WHERE activo = true
         AND activo_hasta IS NOT NULL
         AND activo_hasta < NOW()`
    );
  } catch { /* tabla puede no existir en alguna instancia */ }
};

// Obtener especialidades del usuario desde citas.usuario_especialidades
const getEspecialidades = async (userId) => {
  try {
    const res = await pool.query(
      `SELECT array_agg(especialidad_codigo ORDER BY especialidad_codigo) AS esp
       FROM "${SCHEMA}".usuario_especialidades
       WHERE usuario_id = $1`,
      [String(userId)]
    );
    const arr = res.rows[0]?.esp;
    return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
  } catch { return []; }
};

// Obtener ciudades/sedes del usuario desde public.sedes_usuarios
const getSedes = async (userId) => {
  try {
    const res = await pool.query(
      `SELECT sede FROM public.sedes_usuarios WHERE id_usuario = $1`,
      [parseInt(userId)]
    );
    return res.rows.map(r => String(r.sede || '')).filter(Boolean);
  } catch { return []; }
};

// Construir el objeto usuario listo para responder al frontend
const buildUsuarioResponse = async (row) => {
  const rol = mapearRol(row.rol);
  const especialidades = await getEspecialidades(row.id_usuario);
  let ciudades = await getSedes(row.id_usuario);
  // Recepcion sólo opera en una sede
  if (rol === 'recepcion' && ciudades.length > 1) ciudades = [ciudades[0]];
  return {
    id: String(row.id_usuario),
    nombre: String(row.nombre_usuario || ''),
    usuario: String(row.correo || ''),  // campo legacy que espera el frontend
    correo: String(row.correo || ''),
    rol,
    rolDB: String(row.rol || ''),       // rol original de la BD
    especialidades,
    especialidad: especialidades[0] || null,
    ciudades,
    ciudad: ciudades[0] || '',
    activo: Boolean(row.activo),
    activoDesde: row.activo_desde ? new Date(row.activo_desde).toISOString().slice(0, 10) : null,
    activoHasta: row.activo_hasta ? new Date(row.activo_hasta).toISOString().slice(0, 10) : null,
  };
};

router.post('/login', async (req, res) => {
  // Acepta tanto { usuario, password } (legacy) como { correo, password }
  const correo = req.body.correo || req.body.usuario;
  const { password } = req.body;
  try {
    await aplicarAutoDesactivacion();

    const result = await pool.query(
      `SELECT id_usuario, nombre_usuario, correo, rol, activo, activo_desde, activo_hasta, password
       FROM public.usuarios
       WHERE correo = $1`,
      [correo]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const row = result.rows[0];

    // Comparación híbrida: soporta bcrypt ($2b$/$2a$) y texto plano (legacy)
    let passwordOk = false;
    const storedPwd = String(row.password || '');
    if (storedPwd.startsWith('$2b$') || storedPwd.startsWith('$2a$')) {
      // Hash bcrypt — intentar con bcryptjs si está disponible
      try {
        const { default: bcrypt } = await import('bcryptjs');
        passwordOk = await bcrypt.compare(password, storedPwd);
      } catch {
        try {
          const { default: bcrypt } = await import('bcrypt');
          passwordOk = await bcrypt.compare(password, storedPwd);
        } catch {
          // bcrypt no disponible, comparación directa como fallback de emergencia
          passwordOk = (password === storedPwd);
        }
      }
    } else {
      // Texto plano (usuarios legacy del sistema)
      passwordOk = (password === storedPwd);
    }

    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!isUsuarioActivoEfectivo(row)) {
      return res.status(403).json({ error: 'Usuario no activo' });
    }

    const usuario = await buildUsuarioResponse(row);
    console.log(`✅ Login: ${usuario.correo} [${usuario.rolDB} → ${usuario.rol}]`);
    res.json(usuario);
  } catch (err) {
    console.error('❌ Error en POST /api/login:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    await aplicarAutoDesactivacion();

    const result = await pool.query(
      `SELECT id_usuario, nombre_usuario, correo, rol, activo, activo_desde, activo_hasta
       FROM public.usuarios
       ORDER BY id_usuario`
    );

    const usuarios = await Promise.all(
      result.rows.map(async (row) => {
        const u = await buildUsuarioResponse(row);
        return {
          ...u,
          email: u.correo,
          password: '***', // nunca exponer
        };
      })
    );

    res.json(usuarios);
  } catch (err) {
    console.error('❌ Error en GET /api/usuarios:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const u = req.body;
  const rawEspecialidades = Array.isArray(u?.especialidades)
    ? u.especialidades : u?.especialidad ? [u.especialidad] : [];
  const especialidades = Array.from(new Set(rawEspecialidades.map((x) => String(x || '').trim()).filter(Boolean)));
  const rawCiudades = Array.isArray(u?.ciudades)
    ? u.ciudades : u?.ciudad ? [u.ciudad] : [];
  const ciudades = Array.from(new Set(rawCiudades.map((x) => String(x || '').trim()).filter(Boolean)));
  const rolApp = String(u.rol || '').toLowerCase();
  // Convertir rol de app → rol de BD (prefijo citas_)
  const rolDB = rolApp === 'administrador' ? 'citas_administrador'
    : rolApp === 'medico' ? 'citas_medico'
    : rolApp === 'triage' ? 'citas_triage'
    : rolApp === 'recepcion' ? 'citas_recepcion'
    : rolApp;

  try {
    const client = await pool.connect();
    let created;
    try {
      await client.query('BEGIN');

      // Insertar en public.usuarios
      const insertRes = await client.query(
        `INSERT INTO public.usuarios (nombre_usuario, correo, password, rol, activo, activo_desde, activo_hasta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          u.nombre,
          u.email || u.usuario || u.correo,
          u.password,
          rolDB,
          u.activo ?? true,
          u.activoDesde || u.activo_desde || null,
          u.activoHasta || u.activo_hasta || null,
        ]
      );
      created = insertRes.rows[0];

      // Insertar sedes en public.sedes_usuarios
      await client.query(`DELETE FROM public.sedes_usuarios WHERE id_usuario = $1`, [created.id_usuario]);
      const sedesParaGuardar = rolApp === 'recepcion' ? (ciudades[0] ? [ciudades[0]] : []) : ciudades;
      for (const sede of sedesParaGuardar) {
        await client.query(
          `INSERT INTO public.sedes_usuarios (id_usuario, sede) VALUES ($1, $2)`,
          [created.id_usuario, sede]
        );
      }

      // Insertar especialidades en citas.usuario_especialidades (solo médicos)
      await client.query(`DELETE FROM "${SCHEMA}".usuario_especialidades WHERE usuario_id = $1`, [String(created.id_usuario)]);
      if (rolApp === 'medico') {
        for (const esp of especialidades) {
          await client.query(
            `INSERT INTO "${SCHEMA}".usuario_especialidades (usuario_id, especialidad_codigo)
             VALUES ($1, $2) ON CONFLICT (usuario_id, especialidad_codigo) DO NOTHING`,
            [String(created.id_usuario), esp]
          );
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    await recordAudit({
      accion: 'Creación de Usuario',
      detalles: `Se creó el usuario: ${u.nombre} con el rol: ${rolApp}`,
      rol: 'administrador',
      nombre_usuario: 'Administrador Sistema'
    });

    const response = await buildUsuarioResponse(created);
    res.status(201).json({ ...response, email: response.correo });
  } catch (err) {
    console.error('❌ Error en POST /api/usuarios:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  const rawEspecialidades = Array.isArray(u?.especialidades)
    ? u.especialidades : u?.especialidad ? [u.especialidad] : undefined;
  const especialidades = rawEspecialidades === undefined
    ? undefined
    : Array.from(new Set(rawEspecialidades.map((x) => String(x || '').trim()).filter(Boolean)));
  const rawCiudades = Array.isArray(u?.ciudades)
    ? u.ciudades : u?.ciudad ? [u.ciudad] : undefined;
  const ciudades = rawCiudades === undefined
    ? undefined
    : Array.from(new Set(rawCiudades.map((x) => String(x || '').trim()).filter(Boolean)));

  const rolApp = u.rol ? String(u.rol).toLowerCase() : undefined;
  const rolDB = rolApp === 'administrador' ? 'citas_administrador'
    : rolApp === 'medico' ? 'citas_medico'
    : rolApp === 'triage' ? 'citas_triage'
    : rolApp === 'recepcion' ? 'citas_recepcion'
    : rolApp;

  try {
    const client = await pool.connect();
    let updated;
    try {
      await client.query('BEGIN');

      // Construir SET dinámico solo con campos que vienen en el body
      const sets = [];
      const values = [];
      let i = 1;
      const mapped = {
        nombre_usuario: u.nombre,
        correo: u.email || u.usuario || u.correo,
        password: u.password,
        rol: rolDB,
        activo: u.activo,
        activo_desde: u.activoDesde || u.activo_desde,
        activo_hasta: u.activoHasta || u.activo_hasta,
      };
      for (const [dbCol, val] of Object.entries(mapped)) {
        if (val === undefined) continue;
        if (dbCol === 'password' && (val === '' || val === null)) continue;
        sets.push(`"${dbCol}" = $${i++}`);
        values.push(val);
      }
      if (sets.length > 0) {
        values.push(parseInt(id));
        const updateRes = await client.query(
          `UPDATE public.usuarios SET ${sets.join(', ')} WHERE id_usuario = $${i} RETURNING *`,
          values
        );
        if (!updateRes.rows.length) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        updated = updateRes.rows[0];
      } else {
        // No hay campos de usuario que actualizar, solo sedes/especialidades
        const r = await client.query(`SELECT * FROM public.usuarios WHERE id_usuario = $1`, [parseInt(id)]);
        if (!r.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Usuario no encontrado' }); }
        updated = r.rows[0];
      }

      // Actualizar sedes si vienen en el body
      if (ciudades !== undefined) {
        await client.query(`DELETE FROM public.sedes_usuarios WHERE id_usuario = $1`, [updated.id_usuario]);
        const rolFinal = mapearRol(updated.rol);
        const sedesParaGuardar = rolFinal === 'recepcion' ? (ciudades[0] ? [ciudades[0]] : []) : ciudades;
        for (const sede of sedesParaGuardar) {
          await client.query(
            `INSERT INTO public.sedes_usuarios (id_usuario, sede) VALUES ($1, $2)`,
            [updated.id_usuario, sede]
          );
        }
      }

      // Actualizar especialidades si vienen en el body
      if (especialidades !== undefined) {
        const rolFinal = mapearRol(updated.rol);
        await client.query(`DELETE FROM "${SCHEMA}".usuario_especialidades WHERE usuario_id = $1`, [String(updated.id_usuario)]);
        if (rolFinal === 'medico') {
          for (const esp of especialidades) {
            await client.query(
              `INSERT INTO "${SCHEMA}".usuario_especialidades (usuario_id, especialidad_codigo)
               VALUES ($1, $2) ON CONFLICT (usuario_id, especialidad_codigo) DO NOTHING`,
              [String(updated.id_usuario), esp]
            );
          }
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const response = await buildUsuarioResponse(updated);
    res.json({ ...response, email: response.correo });
  } catch (err) {
    console.error('❌ Error en PUT /api/usuarios/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const numId = parseInt(id);
  try {
    // Limpiar tablas relacionadas antes de eliminar
    await pool.query(`DELETE FROM public.sedes_usuarios WHERE id_usuario = $1`, [numId]);
    await pool.query(`DELETE FROM "${SCHEMA}".usuario_especialidades WHERE usuario_id = $1`, [String(numId)]);
    await pool.query(`DELETE FROM public.usuarios WHERE id_usuario = $1`, [numId]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error en DELETE /api/usuarios/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
