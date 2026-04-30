import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envActual = path.resolve(process.cwd(), '.env');
const envPadre = path.resolve(process.cwd(), '..', '.env');
const envPath = fs.existsSync(envActual) ? envActual : fs.existsSync(envPadre) ? envPadre : undefined;
dotenv.config(envPath ? { path: envPath } : undefined);

const { Pool } = pg;

export const SCHEMA = process.env.DB_SCHEMA || 'citas';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: `-c search_path=${SCHEMA}`,
});

// Prueba de conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error de conexión DB:', err.message);
  } else {
    console.log(`DB Conectada: ${process.env.DB_NAME} (Schema: ${SCHEMA})`);
  }
});

export default pool;
