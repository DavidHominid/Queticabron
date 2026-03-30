import pool from './connection.js';

/**
 * Plantilla de consultas directas sin ORM
 */

// SELECT: Obtener todos los registros de una tabla (ej. citas)
async function getAllCitas() {
  const query = 'SELECT * FROM citas ORDER BY id ASC';
  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error en getAllCitas:', error.message);
    throw error;
  }
}

// SELECT CONDICIONAL: Obtener por ID con parámetros ($1 para evitar SQL Injection)
async function getCitaById(id) {
  const query = 'SELECT * FROM citas WHERE id = $1';
  try {
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error en getCitaById:', error.message);
    throw error;
  }
}

// INSERT: Crear un nuevo registro
async function createCita(paciente, fecha, motivo) {
  const query = `
    INSERT INTO citas (paciente, fecha, motivo) 
    VALUES ($1, $2, $3) 
    RETURNING *`;
  try {
    const { rows } = await pool.query(query, [paciente, fecha, motivo]);
    return rows[0];
  } catch (error) {
    console.error('Error en createCita:', error.message);
    throw error;
  }
}

// UPDATE: Actualizar registro
async function updateCitaMotivo(id, nuevoMotivo) {
  const query = 'UPDATE citas SET motivo = $1 WHERE id = $2 RETURNING *';
  try {
    const { rows } = await pool.query(query, [nuevoMotivo, id]);
    return rows[0];
  } catch (error) {
    console.error('Error en updateCitaMotivo:', error.message);
    throw error;
  }
}

// DELETE: Eliminar registro
async function deleteCita(id) {
  const query = 'DELETE FROM citas WHERE id = $1';
  try {
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error en deleteCita:', error.message);
    throw error;
  }
}

export {
  getAllCitas,
  getCitaById,
  createCita,
  updateCitaMotivo,
  deleteCita
};
