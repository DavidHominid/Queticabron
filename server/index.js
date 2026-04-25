import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/db.js';

// Importación de rutas
import pacientesRoutes from './routes/pacientes.js';
import citasRoutes from './routes/citas.js';
import usuariosRoutes from './routes/usuarios.js';
import triageRoutes from './routes/triage.js';
import consultasRoutes from './routes/consultas.js';
import cirugiasRoutes from './routes/cirugias.js';
import seguimientosRoutes from './routes/seguimientos.js';
import estudiosRoutes from './routes/estudios.js';
import eventosRoutes from './routes/eventos.js';
import auditoriaRoutes from './routes/auditoria.js';
import informacionMedicaRoutes from './routes/informacion-medica.js';
import uploadRoutes from './routes/upload.js';
import especialidadesRoutes from './routes/especialidades.js';
import ciudadesRoutes from './routes/ciudades.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const basePort = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '127.0.0.1';

// Middlewares globales
app.use(cors());
app.use(express.json());

// Middleware de logging simple
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
  next();
});

// Diagnóstico de la base de datos (opcional, solo al iniciar)
async function diagnoseDB() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Base de datos conectada correctamente (Diagnostic Check).');
  } catch (err) {
    console.error('❌ Error de diagnóstico DB:', err.message);
  }
}
diagnoseDB();

// Montaje de rutas
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/consultas', consultasRoutes);
app.use('/api/cirugias', cirugiasRoutes);
app.use('/api/seguimientos', seguimientosRoutes);
app.use('/api/estudios', estudiosRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/especialidades', especialidadesRoutes);
app.use('/api/ciudades', ciudadesRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/informacion-medica', informacionMedicaRoutes);
app.use('/api/upload', uploadRoutes);

// Caso especial para el login
app.use('/api', usuariosRoutes);

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback: send index.html for all non-API routes (SPA routing)
app.get('/{*path}', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send('Server error');
    }
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const server = app.listen(basePort, host, () => {
  console.log(`🚀 Servidor backend corriendo en http://${host}:${basePort}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${basePort} ocupado. Ajusta PORT (env) o libera el puerto.`);
    process.exit(1);
  }
  console.error('❌ Error al iniciar el backend:', err);
  process.exit(1);
});
