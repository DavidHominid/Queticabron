import express from 'express';
import pool, { SCHEMA } from '../config/db.js';
import { recordAudit } from '../helpers/utils.js';

const router = express.Router();

const diffKeys = (a = {}, b = {}) => {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const changed = [];
  keys.forEach((k) => {
    const av = JSON.stringify(a?.[k]);
    const bv = JSON.stringify(b?.[k]);
    if (av !== bv) changed.push(k);
  });
  return changed;
};

const extraeAuditMeta = (req) => {
  const usuario = req.user || req.headers['x-usuario'] || {};
  return {
    usuario_id: usuario?.id ? String(usuario.id) : null,
    nombre_usuario: usuario?.nombre ? String(usuario.nombre) : (typeof usuario === 'string' ? usuario : 'Sistema'),
    rol: usuario?.rol ? String(usuario.rol) : '---',
    ciudad: usuario?.ciudad ? String(usuario.ciudad) : 'Sonoyta',
  };
};

router.get('/:pacienteId', async (req, res) => {
  const { pacienteId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM "${SCHEMA}".antecedentes WHERE id_paciente = $1 AND tipo = 'infomed'`,
      [parseInt(pacienteId)]
    );
    if (result.rows.length === 0) return res.json(null);
    try {
      const data = JSON.parse(result.rows[0].descripcion);
      res.json({ ...data, pacienteId: String(pacienteId) });
    } catch {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const infoData = req.body;
  const pacienteId = parseInt(infoData.pacienteId);
  const meta = extraeAuditMeta(req);
  try {
    const existing = await pool.query(
      `SELECT id_antecedentes, descripcion FROM "${SCHEMA}".antecedentes WHERE id_paciente = $1 AND tipo = 'infomed'`,
      [pacienteId]
    );
    let accion = 'informacion_medica_creada';
    let detalles = `Paciente #${pacienteId} · primera captura de información médica`;
    if (existing.rows.length > 0) {
      let before = {};
      try {
        before = JSON.parse(existing.rows[0].descripcion || '{}');
      } catch {}
      const changed = diffKeys(before, infoData);
      await pool.query(
        `UPDATE "${SCHEMA}".antecedentes SET descripcion = $1 WHERE id_paciente = $2 AND tipo = 'infomed'`,
        [JSON.stringify(infoData), pacienteId]
      );
      accion = 'informacion_medica_editada';
      detalles = `Paciente #${pacienteId} · campos modificados: ${changed.length ? changed.join(', ') : '(sin cambios de estructura)'}`;
    } else {
      await pool.query(
        `INSERT INTO "${SCHEMA}".antecedentes (id_paciente, tipo, descripcion) VALUES ($1, $2, $3)`,
        [pacienteId, 'infomed', JSON.stringify(infoData)]
      );
    }
    res.status(201).json({ ...infoData });
    await recordAudit({
      ...meta,
      paciente_id: pacienteId,
      accion,
      detalles,
    });
  } catch (err) {
    console.error('❌ Error en POST /api/informacion-medica:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:pacienteId', async (req, res) => {
  const { pacienteId } = req.params;
  const infoData = req.body;
  const meta = extraeAuditMeta(req);
  try {
    const existing = await pool.query(
      `SELECT id_antecedentes, descripcion FROM "${SCHEMA}".antecedentes WHERE id_paciente = $1 AND tipo = 'infomed'`,
      [parseInt(pacienteId)]
    );
    let before = {};
    try {
      before = JSON.parse(existing.rows?.[0]?.descripcion || '{}');
    } catch {}
    const changed = diffKeys(before, infoData);
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE "${SCHEMA}".antecedentes SET descripcion = $1 WHERE id_paciente = $2 AND tipo = 'infomed'`,
        [JSON.stringify(infoData), parseInt(pacienteId)]
      );
    } else {
      await pool.query(
        `INSERT INTO "${SCHEMA}".antecedentes (id_paciente, tipo, descripcion) VALUES ($1, $2, $3)`,
        [parseInt(pacienteId), 'infomed', JSON.stringify(infoData)]
      );
    }
    res.json({ ...infoData, pacienteId: String(pacienteId) });
    await recordAudit({
      ...meta,
      paciente_id: parseInt(pacienteId),
      accion: 'informacion_medica_editada',
      detalles: `Paciente #${pacienteId} · PUT · campos modificados: ${changed.length ? changed.join(', ') : '(sin cambios de estructura)'}`,
    });
  } catch (err) {
    console.error('❌ Error en PUT /api/informacion-medica/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
