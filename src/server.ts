// Cargar variables de entorno ANTES de cualquier importación
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './database/connection';
import routes from './routes';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware de seguridad
app.use(helmet());

// Configuración de CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tu-dominio.com'] 
    : true, // En desarrollo, permitir cualquier origen
  credentials: true
}));

// Rate limiting - aumentado para considerar el uso de caché en el frontend
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // máximo 300 requests por IP por ventana de tiempo (aumentado de 100)
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiting más permisivo para el proxy de imágenes
const imageProxyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // máximo 200 requests por IP por minuto para imágenes
  message: {
    error: 'Demasiadas solicitudes de imágenes, intenta de nuevo más tarde.'
  }
});

// Aplicar rate limiting general a todas las rutas API excepto el proxy de imágenes
app.use('/api/', (req, res, next) => {
  if (req.path.includes('/woocommerce/proxy-image') ||
      req.path.includes('/video-callback/status') ||
      req.path.includes('/video-callback/stream')) {
    return imageProxyLimiter(req, res, next);
  }
  return limiter(req, res, next);
});

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas de la API
app.use('/api', routes);

// Ruta de bienvenida
app.get('/', (_req, res) => {
  res.json({
    message: 'API del Sistema de Tokens con N8N y WooCommerce',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      transacciones: '/api/transacciones',
      preferencias: '/api/preferencias',
      health: '/api/health'
    }
  });
});

// Middleware de manejo de errores
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Inicializar base de datos
    await initDatabase();
    console.log('Base de datos inicializada correctamente');

    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📊 API disponible en http://localhost:${PORT}/api`);
      console.log(`🌐 API disponible en la red: http://0.0.0.0:${PORT}/api`);
      console.log(`🔍 Health check en http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales de cierre
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();

export default app;
