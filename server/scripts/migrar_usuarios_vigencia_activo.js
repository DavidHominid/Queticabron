import pool, { SCHEMA } from '../config/db.js';

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `ALTER TABLE "${SCHEMA}".usuarios
       ADD COLUMN IF NOT EXISTS activo_desde date`,
    );

    await client.query(
      `ALTER TABLE "${SCHEMA}".usuarios
       ADD COLUMN IF NOT EXISTS activo_hasta date`,
    );

    await client.query('COMMIT');
    console.log('✅ Migración de vigencia de usuarios aplicada correctamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error aplicando migración de vigencia de usuarios:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

