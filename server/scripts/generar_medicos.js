import pool, { SCHEMA } from '../config/db.js';

const pick = (arr, n) => {
  const base = [...arr];
  const out = [];
  while (base.length && out.length < n) {
    const idx = Math.floor(Math.random() * base.length);
    out.push(base[idx]);
    base.splice(idx, 1);
  }
  return out;
};

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
  const cantidad = Number(process.env.SEED_MEDICOS_CANTIDAD || '15');
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error('SEED_MEDICOS_CANTIDAD inválida.');
  }

  const nombres = [
    'Ana', 'Luis', 'María', 'José', 'Karla', 'Miguel', 'Laura', 'Jorge', 'Sofía', 'Daniel',
    'Carmen', 'Roberto', 'Elena', 'Fernando', 'Patricia', 'Raúl', 'Gabriela', 'Iván', 'Alejandro', 'Diana',
  ];
  const apellidos = [
    'García', 'Hernández', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores',
    'Torres', 'Rivera', 'Gómez', 'Díaz', 'Vargas', 'Castillo', 'Morales', 'Ortiz', 'Chávez', 'Mendoza',
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const especialidadesRes = await client.query(
      `SELECT codigo
       FROM "${SCHEMA}".especialidades
       WHERE activa = true
       ORDER BY nombre ASC`,
    );
    const especialidades = (especialidadesRes.rows || []).map((r) => String(r.codigo)).filter(Boolean);
    if (especialidades.length === 0) {
      throw new Error('No hay especialidades activas en el catálogo.');
    }

    const ciudadesRes = await client.query(
      `SELECT codigo
       FROM "${SCHEMA}".ciudades
       WHERE activa = true
       ORDER BY nombre ASC`,
    );
    const ciudades = (ciudadesRes.rows || []).map((r) => String(r.codigo)).filter(Boolean);
    if (ciudades.length === 0) {
      throw new Error('No hay ciudades activas en el catálogo.');
    }

    const usuariosCols = await getColumnMap(client, 'usuarios');
    const hasUsuario = usuariosCols.has('usuario');
    const hasEmail = usuariosCols.has('email');
    const maxIdRes = await client.query(`SELECT MAX(CAST(id AS INTEGER)) as max_id FROM "${SCHEMA}".usuarios`);
    const baseId = Number(maxIdRes.rows?.[0]?.max_id || 0);

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

    const creados = [];
    let next = baseId;
    for (let i = 0; i < cantidad; i++) {
      next += 1;
      const nombre = `Dr. ${nombres[(next + i) % nombres.length]} ${apellidos[(next + i * 3) % apellidos.length]}`;
      const email = `medico${next}@demo.local`;
      const usuario = email;
      const password = `medico${next}123`;
      const ciudadesAsignadas = pick(ciudades, Math.min(2, Math.max(1, (next % 2) + 1)));
      const ciudad = ciudadesAsignadas[0] || ciudades[0];
      const especialidadesAsignadas = pick(especialidades, Math.min(3, Math.max(1, (next % 3) + 1)));
      const especialidadPrincipal = especialidadesAsignadas[0] || especialidades[0];

      if (usados.has(usuario.toLowerCase()) || usados.has(email.toLowerCase())) {
        continue;
      }

      const incoming = {
        id: next,
        nombre,
        usuario,
        email,
        password,
        rol: 'medico',
        ciudad,
        especialidad: especialidadPrincipal,
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
      for (const esp of especialidadesAsignadas) {
        await client.query(
          `INSERT INTO "${SCHEMA}".usuario_especialidades (usuario_id, especialidad_codigo)
           VALUES ($1, $2)
           ON CONFLICT (usuario_id, especialidad_codigo) DO NOTHING`,
          [usuarioId, esp],
        );
      }

      await client.query(`DELETE FROM "${SCHEMA}".usuario_ciudades WHERE usuario_id = $1`, [usuarioId]);
      for (const c of ciudadesAsignadas) {
        await client.query(
          `INSERT INTO "${SCHEMA}".usuario_ciudades (usuario_id, ciudad_codigo)
           VALUES ($1, $2)
           ON CONFLICT (usuario_id, ciudad_codigo) DO NOTHING`,
          [usuarioId, c],
        );
      }

      usados.add(usuario.toLowerCase());
      usados.add(email.toLowerCase());
      creados.push({ id: usuarioId, nombre, usuario, especialidades: especialidadesAsignadas });
    }

    await client.query('COMMIT');
    console.log(`✅ Médicos creados: ${creados.length}`);
    for (const m of creados) {
      console.log(`- ${m.id} | ${m.usuario} | ${m.nombre} | ${m.especialidades.join(', ')}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error generando médicos:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
