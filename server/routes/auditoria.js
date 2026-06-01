import express from 'express';
import pool, { SCHEMA } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const paged = ['1', 'true', 'si', 'sí'].includes(String(req.query.paged || '').trim().toLowerCase());
    const limitRaw = Number(req.query.limit);
    const limitDefault = paged ? 10 : 100;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 500) : limitDefault;
    const pageRaw = Number(req.query.page);
    const offsetRaw = Number(req.query.offset);
    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : (page - 1) * limit;
    const pacienteIdRaw = req.query.pacienteId ?? req.query.paciente_id;
    const pacienteIdNum = Number.isFinite(Number(pacienteIdRaw)) ? parseInt(String(pacienteIdRaw), 10) : null;
    const q = String(req.query.q || req.query.search || '').trim();
    const like = q ? `%${q}%` : null;
    const rol = String(req.query.rol || '').trim().toLowerCase();
    const usuarioId = String(req.query.usuarioId ?? req.query.usuario_id ?? '').trim();

    const buildWhere = (pacienteExpr) => {
      const where = [];
      const params = [];
      if (pacienteExpr) {
        where.push(pacienteExpr);
        params.push(pacienteIdNum);
      }

      if (rol) {
        where.push(`lower(COALESCE(rol::text, '')) = $${params.length + 1}`);
        params.push(rol);
      }

      if (usuarioId) {
        where.push(`COALESCE(usuario_id::text, '') = $${params.length + 1}`);
        params.push(usuarioId);
      }

      if (like) {
        const idx = params.length + 1;
        where.push(`(
          COALESCE(accion::text, '') ILIKE $${idx}
          OR COALESCE(detalles::text, '') ILIKE $${idx}
          OR COALESCE(nombre_usuario::text, '') ILIKE $${idx}
          OR COALESCE(rol::text, '') ILIKE $${idx}
          OR COALESCE(ciudad::text, '') ILIKE $${idx}
          OR COALESCE(usuario_id::text, '') ILIKE $${idx}
          OR COALESCE(id_auditoria::text, '') ILIKE $${idx}
          OR COALESCE(id::text, '') ILIKE $${idx}
          OR COALESCE(paciente_id::text, '') ILIKE $${idx}
        )`);
        params.push(like);
      }

      return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
    };

    let result;
    let total = null;
    if (pacienteIdNum !== null) {
      try {
        const { where, params } = buildWhere(`paciente_id = $1`);
        const paramsCount = [...params];
        const paramsData = [...params, limit, offset];
        if (paged) {
          const totalRes = await pool.query(`SELECT COUNT(*)::int AS total FROM "${SCHEMA}".auditoria ${where}`, paramsCount);
          total = Number(totalRes.rows?.[0]?.total || 0);
        }
        result = await pool.query(
          `SELECT * FROM "${SCHEMA}".auditoria ${where} ORDER BY fecha_hora DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          paramsData,
        );
      } catch {
        const { where, params } = buildWhere(`substring(detalles from '(?i)paciente\\s*id\\s*:\\s*(\\d+)')::int = $1`);
        const paramsCount = [...params];
        const paramsData = [...params, limit, offset];
        if (paged) {
          const totalRes = await pool.query(`SELECT COUNT(*)::int AS total FROM "${SCHEMA}".auditoria ${where}`, paramsCount);
          total = Number(totalRes.rows?.[0]?.total || 0);
        }
        result = await pool.query(
          `SELECT * FROM "${SCHEMA}".auditoria ${where} ORDER BY fecha_hora DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          paramsData,
        );
      }
    } else {
      const { where, params } = buildWhere(null);
      const paramsCount = [...params];
      const paramsData = [...params, limit, offset];
      if (paged) {
        const totalRes = await pool.query(`SELECT COUNT(*)::int AS total FROM "${SCHEMA}".auditoria ${where}`, paramsCount);
        total = Number(totalRes.rows?.[0]?.total || 0);
      }
      result = await pool.query(
        `SELECT * FROM "${SCHEMA}".auditoria ${where} ORDER BY fecha_hora DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        paramsData,
      );
    }
    const mapped = result.rows.map(r => ({
      id: String(r.id_auditoria || r.id || ''),
      usuarioId: String(r.usuario_id || ''),
      nombreUsuario: r.nombre_usuario || 'Sistema',
      rol: r.rol || '---',
      accion: r.accion || '---',
      detalles: r.detalles || '---',
      fechaHora: r.fecha_hora || r.fechaHora || new Date().toISOString(),
      ciudad: r.ciudad || '---',
      pacienteId: r.paciente_id !== undefined && r.paciente_id !== null ? String(r.paciente_id) : undefined,
    }));
    if (paged) {
      res.json({ total: Number.isFinite(Number(total)) ? Number(total) : 0, data: mapped, limit, offset });
      return;
    }
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const a = req.body;
  console.log(' Auditoría recibida:', a.accion);
  try {
    const tableInfo = await pool.query(`SELECT * FROM "${SCHEMA}".auditoria LIMIT 0`);
    const dbCols = tableInfo.fields.map(f => f.name);

    const incomingData = {
      usuario_id: String(a.usuarioId || ''),
      nombre_usuario: a.nombreUsuario || 'Sistema',
      rol: a.rol || 'triage',
      accion: a.accion,
      detalles: a.detalles || '',
      fecha_hora: a.fechaHora || new Date(),
      ciudad: a.ciudad || 'Sonoyta',
      paciente_id: a.pacienteId ?? a.paciente_id ?? null,
    };

    const finalData = {};
    for (const key in incomingData) {
      const dbColName = dbCols.find(c => c.trim().toLowerCase() === key.toLowerCase());
      if (dbColName) {
        finalData[dbColName] = incomingData[key];
      }
    }

    if (!finalData.detalles && !finalData.Detalles) {
      finalData['detalles'] = a.detalles || '';
    }

    if (!finalData.id && !finalData.Id) {
      const dbColId = dbCols.find(c => c.trim().toLowerCase() === 'id');
      if (dbColId) {
        finalData[dbColId] = a.id || `aud${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      }
    }

    const queryCols = Object.keys(finalData).map(c => `"${c}"`).join(', ');
    const placeholders = Object.keys(finalData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(finalData);

    const query = `INSERT INTO "${SCHEMA}".auditoria (${queryCols}) VALUES (${placeholders})`;
    try {
      await pool.query(query, values);
    } catch (auditErr) {
      console.warn('⚠️ Auditoría falló (no crítica):', auditErr.message);
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('❌ Error en endpoint auditoría:', err.message);
    res.status(200).json({ success: false, warning: 'Audit failed but operation proceeded' });
  }
});

export default router;
