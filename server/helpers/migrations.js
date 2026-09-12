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

export async function migratePacienteCleanDefaultsAndDropLegacy() {
  if (!(await tableExists(SCHEMA, 'paciente'))) return;

  try {
    await pool.query(`ALTER TABLE "${SCHEMA}".paciente DROP COLUMN IF EXISTS nacionalidad`);
  } catch (_) {}
  try {
    await pool.query(`ALTER TABLE "${SCHEMA}".paciente DROP COLUMN IF EXISTS identificacion`);
  } catch (_) {}
  try {
    await pool.query(`ALTER TABLE "${SCHEMA}".paciente DROP COLUMN IF EXISTS imagen`);
  } catch (_) {}
  try {
    await pool.query(`ALTER TABLE "${SCHEMA}".paciente ALTER COLUMN ciudad SET DEFAULT 'Puerto Peñasco'::text`);
  } catch (_) {}
}

export async function migrateEventosNuevasColumnasEspecialidadYFlujo() {
  if (await tableExists(SCHEMA, 'evento_especialidad')) {
    await pool.query(
      `ALTER TABLE "${SCHEMA}".evento_especialidad ADD COLUMN IF NOT EXISTS medico_usuario_ids TEXT[] NOT NULL DEFAULT '{}'`,
    );
    await pool.query(
      `ALTER TABLE "${SCHEMA}".evento_especialidad ADD COLUMN IF NOT EXISTS intervalo_minutos_default INTEGER NOT NULL DEFAULT 30`,
    );
    await pool.query(
      `ALTER TABLE "${SCHEMA}".evento_especialidad ADD COLUMN IF NOT EXISTS cupo_por_bloque_default INTEGER NOT NULL DEFAULT 8`,
    );
    await pool.query(
      `ALTER TABLE "${SCHEMA}".evento_especialidad ADD COLUMN IF NOT EXISTS requiere_triage BOOLEAN NOT NULL DEFAULT true`,
    );
    try {
      await pool.query(
        `CREATE INDEX IF NOT EXISTS evento_especialidad_req_triage_idx ON "${SCHEMA}".evento_especialidad (requiere_triage)`,
      );
    } catch (_) {}
  }

  if (await tableExists(SCHEMA, 'citas')) {
    await pool.query(`ALTER TABLE "${SCHEMA}".citas ADD COLUMN IF NOT EXISTS bloque_id TEXT`);
    await pool.query(`ALTER TABLE "${SCHEMA}".citas ADD COLUMN IF NOT EXISTS hora_llegada TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE "${SCHEMA}".citas ADD COLUMN IF NOT EXISTS orden_llegada INTEGER`);
    await pool.query(`ALTER TABLE "${SCHEMA}".citas ADD COLUMN IF NOT EXISTS prioridad_triage INTEGER DEFAULT 3`);
    await pool.query(`ALTER TABLE "${SCHEMA}".citas ADD COLUMN IF NOT EXISTS hora_asignacion TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE "${SCHEMA}".citas ADD COLUMN IF NOT EXISTS medico_asignado_por TEXT`);
    await pool.query(
      `ALTER TABLE "${SCHEMA}".citas ADD COLUMN IF NOT EXISTS saltado_triage BOOLEAN NOT NULL DEFAULT false`,
    );
    try {
      await pool.query(
        `CREATE INDEX IF NOT EXISTS citas_evento_especialidad_estado_idx ON "${SCHEMA}".citas (evento_id, especialidad, estado)`,
      );
    } catch (_) {}
    try {
      await pool.query(
        `CREATE INDEX IF NOT EXISTS citas_orden_llegada_idx ON "${SCHEMA}".citas (fecha, especialidad, orden_llegada) WHERE orden_llegada IS NOT NULL`,
      );
    } catch (_) {}
    try {
      await pool.query(
        `CREATE INDEX IF NOT EXISTS citas_saltado_triage_idx ON "${SCHEMA}".citas (saltado_triage) WHERE saltado_triage = true`,
      );
    } catch (_) {}
  }

  if (await tableExists(SCHEMA, 'evento_especialidad')) {
    await pool.query(
      `UPDATE "${SCHEMA}".evento_especialidad ee
       SET medico_usuario_ids =
         CASE
           WHEN medico_usuario_ids IS NULL OR cardinality(medico_usuario_ids) = 0 THEN
             CASE WHEN ee.medico_usuario_id IS NOT NULL AND ee.medico_usuario_id::text <> '' THEN ARRAY[ee.medico_usuario_id::text] ELSE '{}'::text[] END
           ELSE medico_usuario_ids
         END
       WHERE cardinality(medico_usuario_ids) = 0 OR medico_usuario_ids IS NULL`,
    );
  }

  console.log(`✅ Columnas nuevas evento_especialidad + citas + índices migradas (flujo bloques N:M + triaje opcional).`);
}

export async function migrateTriajeUnificarDuplicadosOxigenacionGlucosa() {
  if (await tableExists(SCHEMA, 'triaje')) {
    const cols = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'triaje'`,
      [SCHEMA],
    );
    const names = new Set((cols.rows || []).map((r) => String(r.column_name)));
    if (names.has('oxigenacion') && names.has('saturacion_oxigeno')) {
      await pool.query(
        `UPDATE "${SCHEMA}".triaje
         SET saturacion_oxigeno = oxigenacion
         WHERE saturacion_oxigeno IS NULL AND oxigenacion IS NOT NULL`,
      );
    }
    if (names.has('glucosa') && names.has('azucar_en_sangre')) {
      await pool.query(
        `UPDATE "${SCHEMA}".triaje
         SET azucar_en_sangre = glucosa
         WHERE azucar_en_sangre IS NULL AND glucosa IS NOT NULL`,
      );
    }
  }
  console.log(`✅ Triaje: unificados duplicados oxigenacion → saturacion_oxigeno y glucosa → azucar_en_sangre.`);
}
