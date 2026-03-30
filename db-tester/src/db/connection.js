import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

/**
 * Configuración del Pool de Conexiones
 * Utiliza variables de entorno para mayor seguridad.
 */
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'localhost', // Tu base de datos se llama localhost
  user: 'postgres',
  password: 'C4rn4g304',
  // Esto hace que todas las consultas busquen en tu schema por defecto
  options: '-c search_path=Palabras_De_Esperanza'
});
// Prueba de conexión inmediata
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error de conexión:', err.message);
  } else {
    console.log('✅ Conectado a localhost en el schema Palabras_De_Esperanza');
  }
});
export default pool;
