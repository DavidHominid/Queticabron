import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envActual = path.resolve(process.cwd(), '.env');
const envPadre = path.resolve(process.cwd(), '..', '.env');
const envPath = fs.existsSync(envActual) ? envActual : fs.existsSync(envPadre) ? envPadre : undefined;
dotenv.config(envPath ? { path: envPath } : undefined);

const { Pool } = pg;

const DB_TARGET = String(process.env.DB_TARGET || '').trim().toUpperCase();
const pick = (key) => {
  if (DB_TARGET) {
    const v = process.env[`${key}_${DB_TARGET}`];
    if (v !== undefined && String(v).trim() !== '') return v;
  }
  return process.env[key];
};

export const SCHEMA = pick('DB_SCHEMA') || 'public';

const pool = new Pool({
  host: pick('DB_HOST'),
  port: parseInt(pick('DB_PORT') || '5432'),
  database: pick('DB_NAME'),
  user: pick('DB_USER'),
  password: pick('DB_PASSWORD'),
  options: `-c search_path=${SCHEMA}`,
});

// Prueba de conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error de conexión DB:', err.message);
  } else {
    console.log(`✅ DB Conectada: ${pick('DB_NAME')} (Schema: ${SCHEMA}${DB_TARGET ? `, Target: ${DB_TARGET}` : ''})`);
  }
});

export default pool;
