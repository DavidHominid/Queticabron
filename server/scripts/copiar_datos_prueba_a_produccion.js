import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const { Pool } = pg;

const envActual = path.resolve(process.cwd(), '.env');
const envPadre = path.resolve(process.cwd(), '..', '.env');
const envPath = fs.existsSync(envActual) ? envActual : fs.existsSync(envPadre) ? envPadre : undefined;
dotenv.config(envPath ? { path: envPath } : undefined);

const getArg = (name) => {
  const key = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(key));
  return found ? found.slice(key.length) : null;
};

const modo = String(getArg('modo') || 'merge').trim().toLowerCase();
const schema = String(process.env.DB_SCHEMA_TEST || process.env.DB_SCHEMA || 'citas').trim() || 'citas';

const cfg = (suffix) => ({
  host: process.env[`DB_HOST_${suffix}`],
  port: parseInt(process.env[`DB_PORT_${suffix}`] || '5432'),
  database: process.env[`DB_NAME_${suffix}`],
  user: process.env[`DB_USER_${suffix}`],
  password: process.env[`DB_PASSWORD_${suffix}`],
  options: `-c search_path=${schema}`,
});

const poolOrigen = new Pool(cfg('TEST'));
const poolDestino = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: `-c search_path=${process.env.DB_SCHEMA || schema}`,
});

const existeTabla = async (client, tabla) => {
  const res = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = $2
     LIMIT 1`,
    [schema, tabla],
  );
  return res.rowCount > 0;
};

const getTablasSchema = async (client) => {
  const res = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schema],
  );
  return (res.rows || []).map((r) => String(r.table_name));
};

const getColumnas = async (client, tabla) => {
  const res = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, tabla],
  );
  return (res.rows || []).map((r) => String(r.column_name));
};

const getPK = async (client, tabla) => {
  const res = await client.query(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = $1
       AND tc.table_name = $2
       AND tc.constraint_type = 'PRIMARY KEY'
     ORDER BY kcu.ordinal_position`,
    [schema, tabla],
  );
  return (res.rows || []).map((r) => String(r.column_name));
};

const getRelacionesFK = async (client) => {
  const res = await client.query(
    `SELECT
       tc.table_name AS tabla_hija,
       ccu.table_name AS tabla_padre
     FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
     WHERE tc.table_schema = $1
       AND tc.constraint_type = 'FOREIGN KEY'`,
    [schema],
  );
  return (res.rows || []).map((r) => ({
    hija: String(r.tabla_hija),
    padre: String(r.tabla_padre),
  }));
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const quoteIdent = (s) => `"${String(s).replaceAll('"', '""')}"`;

const ordenarPorDependencias = (tablas, relaciones) => {
  const set = new Set(tablas);
  const edges = new Map();
  const indeg = new Map();
  for (const t of tablas) {
    edges.set(t, new Set());
    indeg.set(t, 0);
  }

  for (const rel of relaciones) {
    if (!set.has(rel.hija) || !set.has(rel.padre)) continue;
    const adj = edges.get(rel.padre);
    if (!adj.has(rel.hija)) {
      adj.add(rel.hija);
      indeg.set(rel.hija, (indeg.get(rel.hija) || 0) + 1);
    }
  }

  const queue = tablas.filter((t) => (indeg.get(t) || 0) === 0).sort();
  const out = [];
  while (queue.length) {
    const n = queue.shift();
    out.push(n);
    for (const m of edges.get(n) || []) {
      const next = (indeg.get(m) || 0) - 1;
      indeg.set(m, next);
      if (next === 0) {
        queue.push(m);
        queue.sort();
      }
    }
  }

  if (out.length !== tablas.length) {
    const restantes = tablas.filter((t) => !out.includes(t)).sort();
    return [...out, ...restantes];
  }

  return out;
};

const buildInsert = ({ tabla, columnas, pk }) => {
  const colsSql = columnas.map(quoteIdent).join(', ');
  const valuesPerRow = columnas.length;
  const makePlaceholders = (rowIndex) =>
    `(${columnas.map((_, i) => `$${rowIndex * valuesPerRow + i + 1}`).join(', ')})`;

  const nonPk = columnas.filter((c) => !pk.includes(c));
  const conflict =
    pk.length > 0
      ? nonPk.length > 0
        ? ` ON CONFLICT (${pk.map(quoteIdent).join(', ')}) DO UPDATE SET ${nonPk
            .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
            .join(', ')}`
        : ` ON CONFLICT (${pk.map(quoteIdent).join(', ')}) DO NOTHING`
      : '';

  return (rowsCount) =>
    `INSERT INTO ${quoteIdent(schema)}.${quoteIdent(tabla)} (${colsSql})
     VALUES ${Array.from({ length: rowsCount }, (_, i) => makePlaceholders(i)).join(', ')}
     ${conflict}`;
};

const resetSecuencias = async (clientDestino) => {
  const res = await clientDestino.query(
    `SELECT table_name, column_name, column_default
     FROM information_schema.columns
     WHERE table_schema = $1
       AND column_default LIKE 'nextval(%'`,
    [schema],
  );

  for (const r of res.rows || []) {
    const tabla = String(r.table_name);
    const columna = String(r.column_name);
    const seqRes = await clientDestino.query('SELECT pg_get_serial_sequence($1, $2) AS seq', [`${schema}.${tabla}`, columna]);
    const seq = seqRes.rows?.[0]?.seq ? String(seqRes.rows[0].seq) : '';
    if (!seq) continue;
    const maxRes = await clientDestino.query(
      `SELECT COALESCE(MAX(${quoteIdent(columna)}), 0)::bigint AS mx FROM ${quoteIdent(schema)}.${quoteIdent(tabla)}`,
    );
    const mx = BigInt(maxRes.rows?.[0]?.mx ?? 0);
    await clientDestino.query('SELECT setval($1, $2, true)', [seq, (mx + 1n).toString()]);
  }
};

const run = async () => {
  const clientOrigen = await poolOrigen.connect();
  const clientDestino = await poolDestino.connect();
  try {
    if (modo !== 'merge' && modo !== 'reemplazar') {
      throw new Error('Modo inválido. Usa --modo=merge o --modo=reemplazar');
    }

    const tablasOrigen = await getTablasSchema(clientOrigen);
    const tablasDestino = await getTablasSchema(clientDestino);
    const setDestino = new Set(tablasDestino);
    const tablasCandidatas = tablasOrigen.filter((t) => setDestino.has(t));
    const relaciones = await getRelacionesFK(clientOrigen);
    const tablas = ordenarPorDependencias(tablasCandidatas, relaciones);

    await clientDestino.query('BEGIN');

    if (modo === 'reemplazar') {
      for (const t of tablas) {
        await clientDestino.query(`TRUNCATE TABLE ${quoteIdent(schema)}.${quoteIdent(t)} RESTART IDENTITY CASCADE`);
      }
    }

    for (const t of tablas) {
      if (!(await existeTabla(clientOrigen, t))) continue;
      if (!(await existeTabla(clientDestino, t))) continue;

      const columnas = await getColumnas(clientOrigen, t);
      if (!columnas.length) continue;

      const pk = await getPK(clientOrigen, t);
      const rowsRes = await clientOrigen.query(`SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(t)}`);
      const rows = rowsRes.rows || [];
      if (!rows.length) {
        console.log(`${t}: 0`);
        continue;
      }

      const build = buildInsert({ tabla: t, columnas, pk });
      let inserted = 0;

      for (const grupo of chunk(rows, 500)) {
        const values = [];
        for (const row of grupo) {
          for (const col of columnas) values.push(row[col]);
        }
        const sql = build(grupo.length);
        const res = await clientDestino.query(sql, values);
        inserted += res.rowCount || 0;
      }

      console.log(`${t}: ${inserted}`);
    }

    await resetSecuencias(clientDestino);
    await clientDestino.query('COMMIT');
    console.log('✅ Copia completada.');
  } catch (err) {
    await clientDestino.query('ROLLBACK').catch(() => {});
    console.error(`❌ Error copiando datos: ${err.message}`);
    process.exitCode = 1;
  } finally {
    clientOrigen.release();
    clientDestino.release();
    await poolOrigen.end();
    await poolDestino.end();
  }
};

run();
