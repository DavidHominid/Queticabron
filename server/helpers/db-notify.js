import pg from 'pg';
import { SCHEMA } from '../config/db.js';
import { broadcast } from './sse.js';

const { Client } = pg;

let started = false;
let client = null;
let reconnectTimer = null;
let broadcastTimer = null;
let lastPayload = {};
let broadcastTimerStatic = null;
let lastPayloadStatic = {};

const buildClient = () => new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: `-c search_path=${SCHEMA}`,
});

export async function startDbNotifyListener() {
  if (started) return;
  started = true;

  const connect = async (attempt = 0) => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    try {
      client?.removeAllListeners();
      await client?.end().catch(() => {});
      client = buildClient();

      client.on('notification', (msg) => {
        if (msg.channel !== 'operacional_change' && msg.channel !== 'static_change') return;
        let payload = {};
        try { payload = msg.payload ? JSON.parse(msg.payload) : {}; } catch {}

        if (msg.channel === 'operacional_change') {
          lastPayload = payload;
          if (broadcastTimer) return;
          broadcastTimer = setTimeout(() => {
            broadcastTimer = null;
            const toSend = lastPayload;
            lastPayload = {};
            broadcast('operacional', toSend);
          }, 250);
          return;
        }

        lastPayloadStatic = payload;
        if (broadcastTimerStatic) return;
        broadcastTimerStatic = setTimeout(() => {
          broadcastTimerStatic = null;
          const toSend = lastPayloadStatic;
          lastPayloadStatic = {};
          broadcast('static', toSend);
        }, 250);
      });

      client.on('error', (err) => {
        console.error('❌ Error en LISTEN/NOTIFY:', err?.message || err);
      });

      client.on('end', () => {
        const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
        reconnectTimer = setTimeout(() => connect(attempt + 1), delay);
      });

      await client.connect();
      await client.query('LISTEN operacional_change');
      await client.query('LISTEN static_change');
      console.log('✅ LISTEN operacional_change activo');
    } catch (err) {
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
      console.error('❌ No se pudo iniciar LISTEN/NOTIFY:', err?.message || err);
      reconnectTimer = setTimeout(() => connect(attempt + 1), delay);
    }
  };

  await connect(0);
}
