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

    await client.query(
      `CREATE TABLE IF NOT EXISTS "${SCHEMA}".especialidades (
        codigo text PRIMARY KEY,
        nombre text NOT NULL,
        activa boolean NOT NULL DEFAULT true
      )`,
    );

    await client.query(
      `CREATE TABLE IF NOT EXISTS "${SCHEMA}".usuario_especialidades (
        usuario_id text NOT NULL,
        especialidad_codigo text NOT NULL,
        PRIMARY KEY (usuario_id, especialidad_codigo)
      )`,
    );

    const fuentes = [];
    if ((await existeTabla(client, 'usuarios')) && (await existeColumna(client, 'usuarios', 'especialidad'))) {
      fuentes.push(`SELECT NULLIF(trim(especialidad), '') AS codigo FROM "${SCHEMA}".usuarios`);
    }
    if ((await existeTabla(client, 'citas')) && (await existeColumna(client, 'citas', 'especialidad'))) {
      fuentes.push(`SELECT NULLIF(trim(especialidad), '') AS codigo FROM "${SCHEMA}".citas`);
    }
    if ((await existeTabla(client, 'evento_especialidad')) && (await existeColumna(client, 'evento_especialidad', 'especialidad'))) {
      fuentes.push(`SELECT NULLIF(trim(especialidad), '') AS codigo FROM "${SCHEMA}".evento_especialidad`);
    }

    if (fuentes.length > 0) {
      await client.query(
        `INSERT INTO "${SCHEMA}".especialidades (codigo, nombre, activa)
         SELECT DISTINCT x.codigo,
                initcap(replace(x.codigo, '_', ' ')) AS nombre,
                true AS activa
         FROM (
           ${fuentes.join('\n           UNION\n           ')}
         ) x
         WHERE x.codigo IS NOT NULL
         ON CONFLICT (codigo) DO NOTHING`,
      );
    }

    if (
      (await existeTabla(client, 'usuarios')) &&
      (await existeColumna(client, 'usuarios', 'id')) &&
      (await existeColumna(client, 'usuarios', 'rol')) &&
      (await existeColumna(client, 'usuarios', 'especialidad'))
    ) {
      await client.query(
        `INSERT INTO "${SCHEMA}".usuario_especialidades (usuario_id, especialidad_codigo)
         SELECT u.id::text AS usuario_id, NULLIF(trim(u.especialidad), '') AS especialidad_codigo
         FROM "${SCHEMA}".usuarios u
         WHERE u.rol = 'medico' AND NULLIF(trim(u.especialidad), '') IS NOT NULL
         ON CONFLICT (usuario_id, especialidad_codigo) DO NOTHING`,
      );
    }

    await client.query(
      `DO $$
      BEGIN
        ALTER TABLE "${SCHEMA}".usuario_especialidades
          ADD CONSTRAINT usuario_especialidades_fk_usuario
          FOREIGN KEY (usuario_id) REFERENCES "${SCHEMA}".usuarios (id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$`,
    );

    await client.query(
      `DO $$
      BEGIN
        ALTER TABLE "${SCHEMA}".usuario_especialidades
          ADD CONSTRAINT usuario_especialidades_fk_especialidad
          FOREIGN KEY (especialidad_codigo) REFERENCES "${SCHEMA}".especialidades (codigo);
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$`,
    );

    if ((await existeTabla(client, 'citas')) && (await existeColumna(client, 'citas', 'especialidad'))) {
      await client.query(
        `DO $$
        BEGIN
          ALTER TABLE "${SCHEMA}".citas
            ADD CONSTRAINT citas_fk_especialidad
            FOREIGN KEY (especialidad) REFERENCES "${SCHEMA}".especialidades (codigo);
        EXCEPTION WHEN duplicate_object THEN
          NULL;
        END $$`,
      );
    }

    if ((await existeTabla(client, 'evento_especialidad')) && (await existeColumna(client, 'evento_especialidad', 'especialidad'))) {
      await client.query(
        `DO $$
        BEGIN
          ALTER TABLE "${SCHEMA}".evento_especialidad
            ADD CONSTRAINT evento_especialidad_fk_especialidad
            FOREIGN KEY (especialidad) REFERENCES "${SCHEMA}".especialidades (codigo);
        EXCEPTION WHEN duplicate_object THEN
          NULL;
        END $$`,
      );
    }

    await client.query('COMMIT');
    console.log('✅ Migración de especialidades aplicada correctamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error aplicando migración de especialidades:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
