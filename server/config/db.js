import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Aseguramos que cargamos el .env desde la raíz (si estamos en /server)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;

export const SCHEMA = process.env.DB_SCHEMA || 'public';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: `-c search_path=${SCHEMA}`
});

// Prueba de conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error de conexión DB:', err.message);
  } else {
    console.log(`✅ DB Conectada: ${process.env.DB_NAME} (Schema: ${SCHEMA})`);
  }
});

export default pool;
