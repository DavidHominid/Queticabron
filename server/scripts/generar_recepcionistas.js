import pool, { SCHEMA } from '../config/db.js';

const normalizarCol = (s) => String(s || '').trim().toLowerCase();

const getColumnMap = async (client, table) => {
  const info = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2`,
    [SCHEMA, table],
  );
  const cols = info.rows.map((r) => String(r.column_name));
  const map = new Map();
  for (const c of cols) map.set(normalizarCol(c), c);
  return map;
};

const run = async () => {
  const cantidadSonoyta = Number(process.env.SEED_RECEPCIONISTAS_SONOYTA || '3');
  const cantidadPenasco = Number(process.env.SEED_RECEPCIONISTAS_PUERTO_PENASCO || '2');
  if (!Number.isFinite(cantidadSonoyta) || cantidadSonoyta < 0) throw new Error('SEED_RECEPCIONISTAS_SONOYTA inválida.');
  if (!Number.isFinite(cantidadPenasco) || cantidadPenasco < 0) throw new Error('SEED_RECEPCIONISTAS_PUERTO_PENASCO inválida.');

  const nombres = ['Ana', 'Luis', 'María', 'José', 'Karla', 'Miguel', 'Laura', 'Jorge', 'Sofía', 'Daniel'];
  const apellidos = ['García', 'Hernández', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores'];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ciudadesRes = await client.query(
      `SELECT codigo
       FROM "${SCHEMA}".ciudades
       WHERE activa = true AND codigo IN ('sonoyta', 'puerto_penasco')
       ORDER BY codigo ASC`,
    );
    const setCiudades = new Set((ciudadesRes.rows || []).map((r) => String(r.codigo)));
    if (!setCiudades.has('sonoyta')) throw new Error('No existe la ciudad activa "sonoyta" en el catálogo.');
    if (!setCiudades.has('puerto_penasco')) throw new Error('No existe la ciudad activa "puerto_penasco" en el catálogo.');

    const usuariosCols = await getColumnMap(client, 'usuarios');
    const hasUsuario = usuariosCols.has('usuario');
    const hasEmail = usuariosCols.has('email');

    const maxIdRes = await client.query(`SELECT MAX(CAST(id AS INTEGER)) as max_id FROM "${SCHEMA}".usuarios`);
    let next = Number(maxIdRes.rows?.[0]?.max_id || 0);

    const selectCols = [hasUsuario ? `"${usuariosCols.get('usuario')}" AS usuario` : null, hasEmail ? `"${usuariosCols.get('email')}" AS email` : null]
      .filter(Boolean)
      .join(', ');
    const existentesRes = selectCols
      ? await client.query(`SELECT ${selectCols} FROM "${SCHEMA}".usuarios`)
      : { rows: [] };
    const usados = new Set();
    for (const row of existentesRes.rows || []) {
      if (row.usuario) usados.add(String(row.usuario).toLowerCase());
      if (row.email) usados.add(String(row.email).toLowerCase());
    }

    const pendientes = [
      ...Array.from({ length: cantidadPenasco }, () => ({ ciudad: 'puerto_penasco' })),
      ...Array.from({ length: cantidadSonoyta }, () => ({ ciudad: 'sonoyta' })),
    ];

    const creados = [];
    for (let i = 0; i < pendientes.length; i++) {
      next += 1;
      const ciudad = pendientes[i].ciudad;
      const nombre = `${nombres[(next + i) % nombres.length]} ${apellidos[(next + i * 3) % apellidos.length]}`;
      const email = `recepcion${next}@demo.local`;
      const usuario = email;
      const password = `recepcion${next}123`;

      if (usados.has(usuario.toLowerCase()) || usados.has(email.toLowerCase())) {
        continue;
      }

      const incoming = {
        id: next,
        nombre,
        usuario,
        email,
        password,
        rol: 'recepcion',
        ciudad,
        activo: true,
      };

      const finalData = {};
      for (const key of Object.keys(incoming)) {
        const dbCol = usuariosCols.get(normalizarCol(key));
        if (!dbCol) continue;
        if (finalData[dbCol] !== undefined) continue;
        finalData[dbCol] = incoming[key];
      }

      const colsSql = Object.keys(finalData).map((c) => `"${c}"`).join(', ');
      const vals = Object.values(finalData);
      const placeholders = vals.map((_, idx) => `$${idx + 1}`).join(', ');

      const insertUsuario = await client.query(
        `INSERT INTO "${SCHEMA}".usuarios (${colsSql}) VALUES (${placeholders}) RETURNING id`,
        vals,
      );
      const usuarioId = String(insertUsuario.rows[0].id);

      await client.query(`DELETE FROM "${SCHEMA}".usuario_especialidades WHERE usuario_id = $1`, [usuarioId]);

      await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [usuarioId]);
      await client.query(
        `INSERT INTO "${SCHEMA}".usuario_ciudades (usuario_id, ciudad_codigo)
         VALUES ($1, $2)
         ON CONFLICT (usuario_id, ciudad_codigo) DO NOTHING`,
        [usuarioId, ciudad],
      );

      usados.add(usuario.toLowerCase());
      usados.add(email.toLowerCase());
      creados.push({ id: usuarioId, usuario, nombre, ciudad });
    }

    await client.query('COMMIT');
    console.log(`✅ Recepcionistas creadas: ${creados.length}`);
    for (const u of creados) {
      console.log(`- ${u.id} | ${u.usuario} | ${u.nombre} | ${u.ciudad}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error generando recepcionistas:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
