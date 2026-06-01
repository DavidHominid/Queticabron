import pool, { SCHEMA } from '../config/db.js';
import bcrypt from 'bcrypt';

const constraintExists = async (table, name) => {
  const res = await pool.query(
    `
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = $1
      AND table_name = $2
      AND constraint_name = $3
    LIMIT 1
    `,
    [SCHEMA, table, name],
  );
  return Boolean(res.rows?.length);
};

export async function migrateDoctorFksToUsuarios() {
  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica ADD COLUMN IF NOT EXISTS medico_usuario_id TEXT`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS medico_usuario_id TEXT`);

  await pool.query(`ALTER TABLE "${SCHEMA}".nota_medica DROP CONSTRAINT IF EXISTS nota_medica_id_doctor_fkey`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias DROP CONSTRAINT IF EXISTS agenda_cirugias_id_doctor_fkey`);

  const notaFk = 'nota_medica_medico_usuario_id_fkey';
  if (!(await constraintExists('nota_medica', notaFk))) {
    await pool.query(
      `ALTER TABLE "${SCHEMA}".nota_medica
       ADD CONSTRAINT ${notaFk}
       FOREIGN KEY (medico_usuario_id)
       REFERENCES "${SCHEMA}".usuarios(id)
       ON DELETE SET NULL`,
    );
  }
}

export async function migrateExpedienteCitaToExpediente() {
  const expExists = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'expediente' LIMIT 1`,
    [SCHEMA],
  );
  if (!expExists.rows?.length) {
    await pool.query(
      `
      CREATE TABLE IF NOT EXISTS "${SCHEMA}".expediente (
        id SERIAL PRIMARY KEY,
        id_cita INTEGER NOT NULL,
        id_paciente INTEGER NOT NULL,
        triage JSONB,
        consulta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (id_cita)
      )
      `,
    );
  }
}

export async function migrateAgendaCirugiasEstados() {
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS procedimiento VARCHAR`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS fecha_cirugia VARCHAR`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS hora_cirugia VARCHAR`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS consultorio VARCHAR`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS estado VARCHAR`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS costo_total NUMERIC`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS nota_postoperatoria JSONB`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS duracion_estimada INTEGER DEFAULT 60`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS requiere_renta_externa BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS estatus_renta_sede VARCHAR DEFAULT 'no_aplica'`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias ADD COLUMN IF NOT EXISTS id_cita INTEGER`);
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias DROP CONSTRAINT IF EXISTS agenda_cirugias_medico_usuario_id_fkey`);
}

export async function migrateUsuariosPasswordsToBcrypt() {
  const res = await pool.query(
    `SELECT id_usuario, password
     FROM public.usuarios
     WHERE password IS NOT NULL AND password <> ''`,
  );

  let migrated = 0;
  for (const row of res.rows) {
    const storedPwd = String(row.password || '');
    const isBcryptHash =
      storedPwd.startsWith('$2b$') || storedPwd.startsWith('$2a$') || storedPwd.startsWith('$2y$');
    if (isBcryptHash) continue;

    const hashed = await bcrypt.hash(storedPwd, 10);
    await pool.query(
      `UPDATE public.usuarios SET password = $1 WHERE id_usuario = $2`,
      [hashed, row.id_usuario],
    );
    migrated += 1;
  }

  if (migrated > 0) {
    console.log(`✅ Passwords migradas a bcrypt: ${migrated}`);
  }
}

const tableExists = async (schema, table) => {
  const res = await pool.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_name = $2
     LIMIT 1`,
    [schema, table],
  );
  return Boolean(res.rows?.length);
};

export async function migrateOperacionalNotifyTriggers() {
  const fnName = 'notify_operacional_change';
  const channel = 'operacional_change';

  await pool.query(
    `
    CREATE OR REPLACE FUNCTION "${SCHEMA}".${fnName}()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM pg_notify(
        '${channel}',
        json_build_object(
          'schema', TG_TABLE_SCHEMA,
          'table', TG_TABLE_NAME,
          'op', TG_OP
        )::text
      );
      RETURN NULL;
    END;
    $$;
    `,
  );

  const tables = ['citas', 'triaje', 'nota_medica', 'agenda_cirugias'];
  for (const table of tables) {
    if (!(await tableExists(SCHEMA, table))) continue;
    const triggerName = `tr_${table}_notify_operacional_change`;
    await pool.query(`DROP TRIGGER IF EXISTS "${triggerName}" ON "${SCHEMA}"."${table}"`);
    await pool.query(
      `CREATE TRIGGER "${triggerName}"
       AFTER INSERT OR UPDATE OR DELETE ON "${SCHEMA}"."${table}"
       FOR EACH STATEMENT
       EXECUTE FUNCTION "${SCHEMA}".${fnName}()`,
    );
  }

  console.log(`✅ Triggers LISTEN/NOTIFY operacionales activos en schema "${SCHEMA}"`);
}

export async function migratePacienteSoftDeleteColumns() {
  if (!(await tableExists(SCHEMA, 'paciente'))) return;
  await pool.query(`ALTER TABLE "${SCHEMA}".paciente ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE "${SCHEMA}".paciente ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE "${SCHEMA}".paciente ADD COLUMN IF NOT EXISTS eliminado_por TEXT`);
}

export async function migrateStaticNotifyTriggers() {
  const fnName = 'notify_static_change';
  const channel = 'static_change';

  await pool.query(
    `
    CREATE OR REPLACE FUNCTION "${SCHEMA}".${fnName}()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM pg_notify(
        '${channel}',
        json_build_object(
          'schema', TG_TABLE_SCHEMA,
          'table', TG_TABLE_NAME,
          'op', TG_OP
        )::text
      );
      RETURN NULL;
    END;
    $$;
    `,
  );

  const tables = ['paciente'];
  for (const table of tables) {
    if (!(await tableExists(SCHEMA, table))) continue;
    const triggerName = `tr_${table}_notify_static_change`;
    await pool.query(`DROP TRIGGER IF EXISTS "${triggerName}" ON "${SCHEMA}"."${table}"`);
    await pool.query(
      `CREATE TRIGGER "${triggerName}"
       AFTER INSERT OR UPDATE OR DELETE ON "${SCHEMA}"."${table}"
       FOR EACH STATEMENT
       EXECUTE FUNCTION "${SCHEMA}".${fnName}()`,
    );
  }

  console.log(`✅ Triggers LISTEN/NOTIFY estáticos activos en schema "${SCHEMA}"`);
}

export async function migrateAuditoriaPacienteId() {
  if (!(await tableExists(SCHEMA, 'auditoria'))) return;

  await pool.query(`ALTER TABLE "${SCHEMA}".auditoria ADD COLUMN IF NOT EXISTS paciente_id INTEGER`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS auditoria_paciente_id_idx ON "${SCHEMA}".auditoria (paciente_id)`,
  );

  await pool.query(
    `
    UPDATE "${SCHEMA}".auditoria
    SET paciente_id = substring(detalles from '(?i)paciente\\s*id\\s*:\\s*(\\d+)')::int
    WHERE paciente_id IS NULL
      AND detalles ~* 'paciente\\s*id\\s*:'
    `,
  );
}
