import pool, { SCHEMA } from '../config/db.js';

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
  await pool.query(`ALTER TABLE "${SCHEMA}".agenda_cirugias DROP CONSTRAINT IF EXISTS agenda_cirugias_medico_usuario_id_fkey`);
}
