import pool, { SCHEMA } from '../config/db.js';

const normalizarCodigo = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

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

    await client.query(
      `CREATE TABLE IF NOT EXISTS "${SCHEMA}".ciudades (
        codigo text PRIMARY KEY,
        nombre text NOT NULL,
        activa boolean NOT NULL DEFAULT true
      )`,
    );

    await client.query(
      `CREATE TABLE IF NOT EXISTS "${SCHEMA}".usuario_ciudades (
        usuario_id text NOT NULL,
        ciudad_codigo text NOT NULL,
        PRIMARY KEY (usuario_id, ciudad_codigo)
      )`,
    );

    const raw = new Set();

    if ((await existeTabla(client, 'usuarios')) && (await existeColumna(client, 'usuarios', 'ciudad'))) {
      const res = await client.query(`SELECT DISTINCT ciudad FROM "${SCHEMA}".usuarios WHERE ciudad IS NOT NULL`);
      for (const r of res.rows || []) raw.add(String(r.ciudad));
    }

    if ((await existeTabla(client, 'paciente')) && (await existeColumna(client, 'paciente', 'ciudad'))) {
      const res = await client.query(`SELECT DISTINCT ciudad FROM "${SCHEMA}".paciente WHERE ciudad IS NOT NULL`);
      for (const r of res.rows || []) raw.add(String(r.ciudad));
    }

    if ((await existeTabla(client, 'eventos')) && (await existeColumna(client, 'eventos', 'ubicacion'))) {
      const res = await client.query(`SELECT DISTINCT ubicacion FROM "${SCHEMA}".eventos WHERE ubicacion IS NOT NULL`);
      for (const r of res.rows || []) raw.add(String(r.ubicacion));
    }

    const codigos = Array.from(raw)
      .map((x) => normalizarCodigo(x))
      .filter(Boolean);

    for (const codigo of Array.from(new Set(codigos))) {
      const nombre = codigo.replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
      await client.query(
        `INSERT INTO "${SCHEMA}".ciudades (codigo, nombre, activa)
         VALUES ($1, $2, true)
         ON CONFLICT (codigo) DO NOTHING`,
        [codigo, nombre],
      );
    }

    if ((await existeTabla(client, 'usuarios')) && (await existeColumna(client, 'usuarios', 'ciudad')) && (await existeColumna(client, 'usuarios', 'id'))) {
      const res = await client.query(`SELECT id::text AS id, ciudad FROM "${SCHEMA}".usuarios WHERE ciudad IS NOT NULL`);
      for (const r of res.rows || []) {
        const codigo = normalizarCodigo(r.ciudad);
        if (!codigo) continue;
        await client.query(
          `INSERT INTO "${SCHEMA}".usuario_ciudades (usuario_id, ciudad_codigo)
           VALUES ($1, $2)
           ON CONFLICT (usuario_id, ciudad_codigo) DO NOTHING`,
          [String(r.id), codigo],
        );
      }

      await client.query(
        `UPDATE "${SCHEMA}".usuarios
         SET ciudad = lower(regexp_replace(regexp_replace(ciudad, '\\s+', '_', 'g'), '[^a-zA-Z0-9_]', '', 'g'))
         WHERE ciudad IS NOT NULL`,
      );
    }

    if ((await existeTabla(client, 'paciente')) && (await existeColumna(client, 'paciente', 'ciudad'))) {
      await client.query(
        `UPDATE "${SCHEMA}".paciente
         SET ciudad = lower(regexp_replace(regexp_replace(ciudad, '\\s+', '_', 'g'), '[^a-zA-Z0-9_]', '', 'g'))
         WHERE ciudad IS NOT NULL`,
      );
    }

    if ((await existeTabla(client, 'eventos')) && (await existeColumna(client, 'eventos', 'ubicacion'))) {
      await client.query(
        `UPDATE "${SCHEMA}".eventos
         SET ubicacion = lower(regexp_replace(regexp_replace(ubicacion, '\\s+', '_', 'g'), '[^a-zA-Z0-9_]', '', 'g'))
         WHERE ubicacion IS NOT NULL`,
      );
    }

    await client.query(
      `DO $$
      BEGIN
        ALTER TABLE "${SCHEMA}".usuario_ciudades
          ADD CONSTRAINT usuario_ciudades_fk_usuario
          FOREIGN KEY (usuario_id) REFERENCES "${SCHEMA}".usuarios (id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$`,
    );

    await client.query(
      `DO $$
      BEGIN
        ALTER TABLE "${SCHEMA}".usuario_ciudades
          ADD CONSTRAINT usuario_ciudades_fk_ciudad
          FOREIGN KEY (ciudad_codigo) REFERENCES "${SCHEMA}".ciudades (codigo);
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$`,
    );

    await client.query('COMMIT');
    console.log('✅ Migración de ciudades aplicada correctamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error aplicando migración de ciudades:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

