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

    if (!(await existeTabla(client, 'evento_especialidad'))) {
      throw new Error(`No existe la tabla "${SCHEMA}".evento_especialidad. Primero aplica la migración de eventos.`);
    }

    await client.query(
      `CREATE TABLE IF NOT EXISTS "${SCHEMA}".evento_tipo_cita (
        id bigserial PRIMARY KEY,
        evento_especialidad_id bigint NOT NULL,
        nombre text NOT NULL,
        duracion_minutos integer NOT NULL,
        precio numeric(10,2) NOT NULL DEFAULT 0,
        medico_usuario_id text NULL
      )`,
    );

    await client.query(
      `DO $$
      BEGIN
        ALTER TABLE "${SCHEMA}".evento_tipo_cita
          ADD CONSTRAINT evento_tipo_cita_fk_evento_especialidad
          FOREIGN KEY (evento_especialidad_id)
          REFERENCES "${SCHEMA}".evento_especialidad (id)
          ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$`,
    );

    if (await existeTabla(client, 'usuarios')) {
      await client.query(
        `DO $$
        BEGIN
          ALTER TABLE "${SCHEMA}".evento_tipo_cita
            ADD CONSTRAINT evento_tipo_cita_fk_medico
            FOREIGN KEY (medico_usuario_id)
            REFERENCES "${SCHEMA}".usuarios (id)
            ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN
          NULL;
        END $$`,
      );
    }

    await client.query(
      `CREATE INDEX IF NOT EXISTS evento_tipo_cita_idx_evento_especialidad
       ON "${SCHEMA}".evento_tipo_cita (evento_especialidad_id)`,
    );

    if (await existeTabla(client, 'evento_horario')) {
      await client.query(
        `DO $$
        BEGIN
          ALTER TABLE "${SCHEMA}".evento_horario ADD COLUMN evento_tipo_cita_id bigint NULL;
        EXCEPTION WHEN duplicate_column THEN
          NULL;
        END $$`,
      );

      await client.query(
        `DO $$
        BEGIN
          ALTER TABLE "${SCHEMA}".evento_horario
            ADD CONSTRAINT evento_horario_fk_tipo_cita
            FOREIGN KEY (evento_tipo_cita_id)
            REFERENCES "${SCHEMA}".evento_tipo_cita (id)
            ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN
          NULL;
        END $$`,
      );

      await client.query(
        `CREATE INDEX IF NOT EXISTS evento_horario_idx_tipo_cita
         ON "${SCHEMA}".evento_horario (evento_tipo_cita_id)`,
      );
    }

    if (await existeTabla(client, 'citas')) {
      await client.query(
        `DO $$
        BEGIN
          ALTER TABLE "${SCHEMA}".citas ADD COLUMN tipo_cita_id bigint NULL;
        EXCEPTION WHEN duplicate_column THEN
          NULL;
        END $$`,
      );

      await client.query(
        `DO $$
        BEGIN
          ALTER TABLE "${SCHEMA}".citas ADD COLUMN duracion_minutos integer NOT NULL DEFAULT 60;
        EXCEPTION WHEN duplicate_column THEN
          NULL;
        END $$`,
      );

      await client.query(
        `DO $$
        BEGIN
          ALTER TABLE "${SCHEMA}".citas
            ADD CONSTRAINT citas_fk_tipo_cita
            FOREIGN KEY (tipo_cita_id)
            REFERENCES "${SCHEMA}".evento_tipo_cita (id)
            ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN
          NULL;
        END $$`,
      );

      if (!(await existeColumna(client, 'citas', 'duracion_minutos'))) {
        await client.query(
          `UPDATE "${SCHEMA}".citas SET duracion_minutos = 60 WHERE duracion_minutos IS NULL`,
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migración de tipos de cita aplicada correctamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error aplicando migración de tipos de cita:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
