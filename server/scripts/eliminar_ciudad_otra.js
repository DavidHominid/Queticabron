import pool, { SCHEMA } from '../config/db.js';

const existeTabla = async (client, tabla) => {
  const res = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = $2
     LIMIT 1`,
    [SCHEMA, tabla],
  );
  return res.rowCount > 0;
};

const existeColumna = async (client, tabla, columna) => {
  const res = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
     LIMIT 1`,
    [SCHEMA, tabla, columna],
  );
  return res.rowCount > 0;
};

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hasCiudades = await existeTabla(client, 'ciudades');
    const hasUsuarioCiudades = await existeTabla(client, 'usuario_ciudades');
    const hasUsuarios = await existeTabla(client, 'usuarios');

    if (!hasCiudades) throw new Error(`No existe la tabla "${SCHEMA}".ciudades`);
    if (!hasUsuarioCiudades) throw new Error(`No existe la tabla "${SCHEMA}".usuario_ciudades`);
    if (!hasUsuarios) throw new Error(`No existe la tabla "${SCHEMA}".usuarios`);

    await client.query(
      `INSERT INTO "${SCHEMA}".ciudades (codigo, nombre, activa)
       VALUES ('sonoyta', 'Sonoyta', true)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, activa = true`,
    );
    await client.query(
      `INSERT INTO "${SCHEMA}".ciudades (codigo, nombre, activa)
       VALUES ('puerto_penasco', 'Puerto Peñasco', true)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, activa = true`,
    );

    const codigosEliminar = ['otra', 'otras'];
    await client.query(
      `UPDATE "${SCHEMA}".ciudades
       SET activa = false
       WHERE codigo = ANY($1::text[])`,
      [codigosEliminar],
    );

    const usuariosRes = await client.query(
      `SELECT id::text AS id, lower(coalesce(rol, '')) AS rol
       FROM "${SCHEMA}".usuarios`,
    );
    const rolById = new Map((usuariosRes.rows || []).map((r) => [String(r.id), String(r.rol)]));

    const asignacionesRes = await client.query(
      `SELECT usuario_id::text AS usuario_id, ciudad_codigo
       FROM "${SCHEMA}".usuario_ciudades
       WHERE ciudad_codigo = ANY($1::text[])`,
      [codigosEliminar],
    );

    const affected = new Set((asignacionesRes.rows || []).map((r) => String(r.usuario_id)));

    for (const usuarioId of affected) {
      const rol = rolById.get(usuarioId) || '';
      const actualesRes = await client.query(
        `SELECT ciudad_codigo
         FROM "${SCHEMA}".usuario_ciudades
         WHERE usuario_id = $1`,
        [usuarioId],
      );
      const actuales = new Set((actualesRes.rows || []).map((r) => String(r.ciudad_codigo)));
      for (const code of codigosEliminar) actuales.delete(code);

      if (rol === 'recepcion') {
        if (actuales.size === 0) actuales.add('sonoyta');
        const keep = Array.from(actuales).slice(0, 1);
        await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [usuarioId]);
        for (const c of keep) {
          await client.query(
            `INSERT INTO "${SCHEMA}".usuario_ciudades (usuario_id, ciudad_codigo)
             VALUES ($1, $2)
             ON CONFLICT (usuario_id, ciudad_codigo) DO NOTHING`,
            [usuarioId, c],
          );
        }
        await client.query(`UPDATE "${SCHEMA}".usuarios SET ciudad = $1 WHERE id::text = $2`, [keep[0], usuarioId]);
      } else if (rol === 'medico' || rol === 'triage') {
        if (actuales.size === 0) {
          actuales.add('sonoyta');
          actuales.add('puerto_penasco');
        }
        await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [usuarioId]);
        for (const c of Array.from(actuales)) {
          await client.query(
            `INSERT INTO "${SCHEMA}".usuario_ciudades (usuario_id, ciudad_codigo)
             VALUES ($1, $2)
             ON CONFLICT (usuario_id, ciudad_codigo) DO NOTHING`,
            [usuarioId, c],
          );
        }
        const primary = Array.from(actuales)[0] || 'sonoyta';
        await client.query(`UPDATE "${SCHEMA}".usuarios SET ciudad = $1 WHERE id::text = $2`, [primary, usuarioId]);
      } else {
        await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [usuarioId]);
        if (await existeColumna(client, 'usuarios', 'ciudad')) {
          await client.query(
            `UPDATE "${SCHEMA}".usuarios
             SET ciudad = 'sonoyta'
             WHERE id::text = $1 AND ciudad = ANY($2::text[])`,
            [usuarioId, codigosEliminar],
          );
        }
      }
    }

    if (await existeColumna(client, 'usuarios', 'ciudad')) {
      await client.query(
        `UPDATE "${SCHEMA}".usuarios
         SET ciudad = 'sonoyta'
         WHERE ciudad = ANY($1::text[])`,
        [codigosEliminar],
      );
    }

    if (await existeTabla(client, 'paciente') && (await existeColumna(client, 'paciente', 'ciudad'))) {
      await client.query(
        `UPDATE "${SCHEMA}".paciente
         SET ciudad = 'sonoyta'
         WHERE ciudad = ANY($1::text[])`,
        [codigosEliminar],
      );
    }

    if (await existeTabla(client, 'eventos') && (await existeColumna(client, 'eventos', 'ubicacion'))) {
      await client.query(
        `UPDATE "${SCHEMA}".eventos
         SET ubicacion = 'sonoyta'
         WHERE ubicacion = ANY($1::text[])`,
        [codigosEliminar],
      );
    }

    await client.query(
      `DELETE FROM "${SCHEMA}".usuario_ciudades
       WHERE ciudad_codigo = ANY($1::text[])`,
      [codigosEliminar],
    );

    await client.query('COMMIT');
    console.log('✅ Ciudad "otra" eliminada (desactivada) y usuarios migrados.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error eliminando ciudad "otra":', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

