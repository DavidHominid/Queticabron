import pool, { SCHEMA } from '../server/config/db.js';

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = 'agenda_cirugias'
    `, [SCHEMA]);
    console.log("Columns:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
check();
