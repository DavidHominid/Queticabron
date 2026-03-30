import pool from './src/db/connection.js';

async function testConnection() {
  console.log('--- Iniciando prueba de conexión (Sin ORM) ---');
  try {
    const res = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Conexión establecida con éxito!');
    console.log('🕒 Hora del servidor:', res.rows[0].current_time);
  } catch (err) {
    console.error('❌ Fallo en la conexión:', err.message);
    console.log('\n💡 Tip: Asegúrate de que tu archivo .env tenga las credenciales correctas:');
    console.log('   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
  } finally {
    await pool.end(); // Cerramos el pool después de la prueba
    process.exit();
  }
}

testConnection();
