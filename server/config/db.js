import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;

export const SCHEMA = process.env.DB_SCHEMA || 'palabras_de_esperanza';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        options: `-c search_path=${SCHEMA}`
      }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: `-c search_path=${SCHEMA}`
      }
);

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error de conexión DB:', err.message);
  } else {
    console.log(`✅ DB Conectada (Schema: ${SCHEMA})`);
  }
});

export default pool;
