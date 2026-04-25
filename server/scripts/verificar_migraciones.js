import pool, { SCHEMA } from '../config/db.js';

const run = async () => {
  const tables = ['especialidades', 'usuario_especialidades', 'ciudades', 'usuario_ciudades'];

  for (const t of tables) {
    const regRes = await pool.query('SELECT to_regclass($1) AS reg', [`${SCHEMA}.${t}`]);
    const ok = Boolean(regRes.rows?.[0]?.reg);
    console.log(`${t}: ${ok ? 'OK' : 'NO'}`);
    if (ok) {
      const countRes = await pool.query(`SELECT count(*)::int AS n FROM "${SCHEMA}".${t}`);
      console.log(`  filas: ${countRes.rows?.[0]?.n ?? 0}`);
    }
  }

  const colsRes = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = 'usuarios'
       AND column_name IN ('activo_desde', 'activo_hasta')
     ORDER BY column_name`,
    [SCHEMA],
  );
  console.log(`usuarios columnas vigencia: ${colsRes.rows.map((r) => r.column_name).join(',') || 'NO'}`);
};

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
