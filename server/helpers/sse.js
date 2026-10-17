/**
 * Server-Sent Events (SSE) — módulo de difusión en tiempo real.
 *
 * Permite notificar a todos los clientes conectados cuando hay cambios en la
 * base de datos, sin necesidad de librerías adicionales.
 *
 * Uso en una ruta:
 *   import { broadcast } from '../helpers/sse.js';
 *   // después de mutación exitosa:
 *   broadcast('citas');          // recarga citas en todos los clientes
 *   broadcast('triage');         // recarga triage
 *   broadcast('operacional');    // recarga citas + triage + consultas + cirugias + seguimientos
 */

/** @type {Map<import('express').Response, () => void>} */
const clients = new Map();

/**
 * Middleware Express: abre una conexión SSE persistente con el cliente.
 * Registra el endpoint en el servidor principal como:
 *   app.get('/api/sse', sseMiddleware);
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export function sseMiddleware(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Necesario para que nginx/proxies no buffereen la respuesta
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Ping inicial para confirmar la conexión
  res.write('event: connected\ndata: ok\n\n');

  let cleanedUp = false;
  let keepAlive;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(keepAlive);
    clients.delete(res);
    console.log(`📡 SSE: cliente desconectado. Total: ${clients.size}`);
  };

  clients.set(res, cleanup);
  console.log(`📡 SSE: cliente conectado. Total: ${clients.size}`);

  // Ping cada 25s para mantener la conexión viva a través de proxies
  keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (_) {
      cleanup();
    }
  }, 25_000);

  res.on('close', cleanup);
  res.on('error', cleanup);
}

/**
 * Difunde un evento SSE a todos los clientes conectados.
 *
 * @param {string} eventName  - Nombre del evento (ej. 'citas', 'triage', 'operacional')
 * @param {object} [data={}]  - Payload JSON opcional
 */
export function broadcast(eventName, data = {}) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  let removed = 0;
  for (const [client, cleanup] of clients) {
    try {
      client.write(payload);
    } catch (_) {
      cleanup();
      removed++;
    }
  }
  if (clients.size > 0 || removed > 0) {
    console.log(`📡 SSE broadcast "${eventName}" → ${clients.size} cliente(s)${removed ? ` (${removed} eliminados)` : ''}`);
  }
}
