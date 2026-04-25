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

const isUsuarioActivoEfectivo = (u, hoyYmd) => {
  if (u?.activo === false) return false;
  const desde = u?.activo_desde || u?.activoDesde || null;
  const hasta = u?.activo_hasta || u?.activoHasta || null;
  const d = typeof desde === 'string' ? desde : null;
  const h = typeof hasta === 'string' ? hasta : null;
  if (d && d > hoyYmd) return false;
  if (h && h < hoyYmd) return false;
  return true;
};

const aplicarAutoDesactivacion = async () => {
  await pool.query(
    `UPDATE "${SCHEMA}".usuarios
     SET activo = false
     WHERE activo = true
       AND activo_hasta IS NOT NULL
       AND activo_hasta < CURRENT_DATE`,
  );
};

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    await aplicarAutoDesactivacion();
    const result = await pool.query(
      `SELECT 
         u.id,
         u.nombre,
         u.usuario,
         u.rol,
         u.ciudad,
         u.activo,
         u.activo_desde,
         u.activo_hasta,
         COALESCE(
           (
             SELECT array_agg(uc.ciudad_codigo ORDER BY uc.ciudad_codigo)
             FROM "${SCHEMA}".usuario_ciudades uc
             WHERE uc.usuario_id = u.id::text
           ),
           '{}'::text[]
         ) AS ciudades,
         COALESCE(
           (
             SELECT array_agg(ue.especialidad_codigo ORDER BY ue.especialidad_codigo)
             FROM "${SCHEMA}".usuario_especialidades ue
             WHERE ue.usuario_id = u.id::text
           ),
           '{}'::text[]
         ) AS especialidades
       FROM "${SCHEMA}".usuarios u
       WHERE u.usuario = $1 AND u.password = $2`,
      [usuario, password]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const especialidades = Array.isArray(row.especialidades) ? row.especialidades.map((x) => String(x)) : [];
      const ciudades = Array.isArray(row.ciudades) ? row.ciudades.map((x) => String(x)) : [];
      const hoy = fechaYmd();
      const activo = isUsuarioActivoEfectivo(row, hoy);
      if (!activo) {
        res.status(403).json({ error: 'Usuario inactivo. Contacta a un administrador.' });
        return;
      }
      res.json({
        ...row,
        id: String(row.id),
        especialidades,
        especialidad: especialidades[0] || null,
        ciudades,
        activo: Boolean(row.activo),
        activoDesde: row.activo_desde || null,
        activoHasta: row.activo_hasta || null,
        ciudad: row.ciudad || ciudades[0] || '',
      });
    } else {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    await aplicarAutoDesactivacion();
    const result = await pool.query(
      `SELECT 
         u.*,
         COALESCE(
           (
             SELECT array_agg(uc.ciudad_codigo ORDER BY uc.ciudad_codigo)
             FROM "${SCHEMA}".usuario_ciudades uc
             WHERE uc.usuario_id = u.id::text
           ),
           '{}'::text[]
         ) AS ciudades,
         COALESCE(
           (
             SELECT array_agg(ue.especialidad_codigo ORDER BY ue.especialidad_codigo)
             FROM "${SCHEMA}".usuario_especialidades ue
             WHERE ue.usuario_id = u.id::text
           ),
           '{}'::text[]
         ) AS especialidades
       FROM "${SCHEMA}".usuarios u`,
    );
    res.json(
      result.rows.map((u) => {
        const especialidades = Array.isArray(u.especialidades) ? u.especialidades.map((x) => String(x)) : [];
        const ciudades = Array.isArray(u.ciudades) ? u.ciudades.map((x) => String(x)) : [];
        return {
          ...u,
          id: String(u.id),
          email: u.email || u.usuario || '',
          usuario: u.usuario || u.email || '',
          especialidades,
          especialidad: especialidades[0] || u.especialidad || null,
          ciudades,
          activo: u.activo !== false,
          activoDesde: u.activo_desde || null,
          activoHasta: u.activo_hasta || null,
          ciudad: u.ciudad || ciudades[0] || '',
        };
      }),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const u = req.body;
  const rawEspecialidades = Array.isArray(u?.especialidades)
    ? u.especialidades
    : u?.especialidad
      ? [u.especialidad]
      : [];
  const especialidades = Array.from(new Set(rawEspecialidades.map((x) => String(x || '').trim()).filter(Boolean)));
  const rawCiudades = Array.isArray(u?.ciudades)
    ? u.ciudades
    : u?.ciudad
      ? [u.ciudad]
      : [];
  const ciudades = Array.from(new Set(rawCiudades.map((x) => String(x || '').trim()).filter(Boolean)));
  try {
    const client = await pool.connect();
    const maxIdRes = await pool.query(`SELECT MAX(CAST(id AS INTEGER)) as max_id FROM "${SCHEMA}".usuarios`);
    const nextId = (maxIdRes.rows[0].max_id || 0) + 1;

    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".usuarios LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);

    const activoDesde = normalizarYmd(u.activoDesde || u.activo_desde);
    const activoHasta = normalizarYmd(u.activoHasta || u.activo_hasta);
    const incomingData = {
      id: nextId,
      nombre: u.nombre,
      usuario: u.email || u.usuario,
      email: u.email || u.usuario,
      password: u.password,
      rol: u.rol,
      ciudad: (ciudades[0] || u.ciudad || null),
      especialidad: especialidades[0] || u.especialidad || null,
      activo: u.activo ?? true,
      activo_desde: activoDesde,
      activo_hasta: activoHasta,
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

    const query = `INSERT INTO "${SCHEMA}".usuarios (${queryCols}) VALUES (${placeholders}) RETURNING *`;
    let created;
    try {
      await client.query('BEGIN');
      const result = await client.query(query, values);
      created = result.rows[0];

      if (String(u.rol || '').toLowerCase() === 'medico') {
        await client.query(`DELETE FROM "${SCHEMA}".usuario_especialidades WHERE usuario_id = $1`, [String(created.id)]);
        for (const esp of especialidades) {
          await client.query(
            `INSERT INTO "${SCHEMA}".usuario_especialidades (usuario_id, especialidad_codigo)
             VALUES ($1, $2)
             ON CONFLICT (usuario_id, especialidad_codigo) DO NOTHING`,
            [String(created.id), esp],
          );
        }
      } else {
        await client.query(`DELETE FROM "${SCHEMA}".usuario_especialidades WHERE usuario_id = $1`, [String(created.id)]);
      }

      const rol = String(u.rol || '').toLowerCase();
      if (rol === 'medico' || rol === 'triage') {
        await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [String(created.id)]);
        for (const c of ciudades) {
          await client.query(
            `INSERT INTO "${SCHEMA}".usuario_ciudades (usuario_id, ciudad_codigo)
             VALUES ($1, $2)
             ON CONFLICT (usuario_id, ciudad_codigo) DO NOTHING`,
            [String(created.id), c],
          );
        }
      } else if (rol === 'recepcion') {
        await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [String(created.id)]);
        if (ciudades[0]) {
          await client.query(
            `INSERT INTO "${SCHEMA}".usuario_ciudades (usuario_id, ciudad_codigo)
             VALUES ($1, $2)
             ON CONFLICT (usuario_id, ciudad_codigo) DO NOTHING`,
            [String(created.id), ciudades[0]],
          );
        }
      } else {
        await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [String(created.id)]);
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
      detalles: `Se creó el usuario: ${u.nombre} con el rol: ${u.rol}`,
      rol: 'administrador',
      nombre_usuario: 'Administrador Sistema'
    });

    res.status(201).json({
      ...created,
      id: String(created.id),
      email: created.email || created.usuario,
      especialidades,
      especialidad: especialidades[0] || created.especialidad || null,
      ciudades,
      activo: created.activo !== false,
      activoDesde: created.activo_desde || null,
      activoHasta: created.activo_hasta || null,
      ciudad: created.ciudad || ciudades[0] || '',
    });
  } catch (err) {
    console.error('❌ Error en POST /api/usuarios:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  const rawEspecialidades = Array.isArray(u?.especialidades)
    ? u.especialidades
    : u?.especialidad
      ? [u.especialidad]
      : undefined;
  const especialidades =
    rawEspecialidades === undefined
      ? undefined
      : Array.from(new Set(rawEspecialidades.map((x) => String(x || '').trim()).filter(Boolean)));
  const rawCiudades = Array.isArray(u?.ciudades)
    ? u.ciudades
    : u?.ciudad
      ? [u.ciudad]
      : undefined;
  const ciudades =
    rawCiudades === undefined
      ? undefined
      : Array.from(new Set(rawCiudades.map((x) => String(x || '').trim()).filter(Boolean)));
  try {
    const client = await pool.connect();
    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".usuarios LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);

    const activoDesde = u.activoDesde !== undefined || u.activo_desde !== undefined ? normalizarYmd(u.activoDesde || u.activo_desde) : undefined;
    const activoHasta = u.activoHasta !== undefined || u.activo_hasta !== undefined ? normalizarYmd(u.activoHasta || u.activo_hasta) : undefined;
    const incomingData = {
      nombre: u.nombre,
      usuario: u.email || u.usuario,
      email: u.email || u.usuario,
      password: u.password,
      rol: u.rol,
      ciudad: u.ciudad,
      especialidad: especialidades ? (especialidades[0] || null) : u.especialidad,
      activo: u.activo,
      activo_desde: activoDesde,
      activo_hasta: activoHasta,
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
    const query = `UPDATE "${SCHEMA}".usuarios SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`;

    let updated;
    try {
      await client.query('BEGIN');
      const result = await client.query(query, values);
      if (!result.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      updated = result.rows[0];

      if (especialidades !== undefined || u.rol !== undefined) {
        const rolFinal = String(u.rol || updated.rol || '').toLowerCase();
        if (rolFinal === 'medico') {
          await client.query(`DELETE FROM "${SCHEMA}".usuario_especialidades WHERE usuario_id = $1`, [String(updated.id)]);
          for (const esp of especialidades || []) {
            await client.query(
              `INSERT INTO "${SCHEMA}".usuario_especialidades (usuario_id, especialidad_codigo)
               VALUES ($1, $2)
               ON CONFLICT (usuario_id, especialidad_codigo) DO NOTHING`,
              [String(updated.id), esp],
            );
          }
        } else {
          await client.query(`DELETE FROM "${SCHEMA}".usuario_especialidades WHERE usuario_id = $1`, [String(updated.id)]);
        }
      }

      if (ciudades !== undefined || u.rol !== undefined || u.ciudad !== undefined) {
        const rolFinal = String(u.rol || updated.rol || '').toLowerCase();
        if (rolFinal === 'medico' || rolFinal === 'triage') {
          await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [String(updated.id)]);
          for (const c of ciudades || []) {
            await client.query(
              `INSERT INTO "${SCHEMA}".usuario_ciudades (usuario_id, ciudad_codigo)
               VALUES ($1, $2)
               ON CONFLICT (usuario_id, ciudad_codigo) DO NOTHING`,
              [String(updated.id), c],
            );
          }
        } else if (rolFinal === 'recepcion') {
          await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [String(updated.id)]);
          const c0 = (ciudades && ciudades[0]) || (u.ciudad ? String(u.ciudad) : '');
          if (c0) {
            await client.query(
              `INSERT INTO "${SCHEMA}".usuario_ciudades (usuario_id, ciudad_codigo)
               VALUES ($1, $2)
               ON CONFLICT (usuario_id, ciudad_codigo) DO NOTHING`,
              [String(updated.id), c0],
            );
          }
        } else {
          await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [String(updated.id)]);
        }

        if (rolFinal === 'medico' || rolFinal === 'triage') {
          if (ciudades && ciudades[0]) {
            await client.query(`UPDATE "${SCHEMA}".usuarios SET ciudad = $1 WHERE id = $2`, [ciudades[0], updated.id]);
            updated.ciudad = ciudades[0];
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

    const espRes = await pool.query(
      `SELECT COALESCE(array_agg(especialidad_codigo ORDER BY especialidad_codigo), '{}'::text[]) AS especialidades
       FROM "${SCHEMA}".usuario_especialidades
       WHERE usuario_id = $1`,
      [String(updated.id)],
    );
    const especialidadesFinal = Array.isArray(espRes.rows?.[0]?.especialidades)
      ? espRes.rows[0].especialidades.map((x) => String(x))
      : [];

    const ciudadesRes = await pool.query(
      `SELECT COALESCE(array_agg(ciudad_codigo ORDER BY ciudad_codigo), '{}'::text[]) AS ciudades
       FROM "${SCHEMA}".usuario_ciudades
       WHERE usuario_id = $1`,
      [String(updated.id)],
    );
    const ciudadesFinal = Array.isArray(ciudadesRes.rows?.[0]?.ciudades) ? ciudadesRes.rows[0].ciudades.map((x) => String(x)) : [];

    res.json({
      ...updated,
      id: String(updated.id),
      email: updated.email || updated.usuario,
      especialidades: especialidadesFinal,
      especialidad: especialidadesFinal[0] || updated.especialidad || null,
      ciudades: ciudadesFinal,
      activo: updated.activo !== false,
      activoDesde: updated.activo_desde || null,
      activoHasta: updated.activo_hasta || null,
      ciudad: updated.ciudad || ciudadesFinal[0] || '',
    });
  } catch (err) {
    console.error('❌ Error en PUT /api/usuarios/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM "${SCHEMA}".usuario_especialidades WHERE usuario_id = $1`, [String(parseInt(id) || id)]);
    await pool.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [String(parseInt(id) || id)]);
    await pool.query(`DELETE FROM "${SCHEMA}".usuarios WHERE id = $1`, [parseInt(id) || id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
