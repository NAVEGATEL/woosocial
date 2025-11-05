import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import transaccionRoutes from './transacciones';
import preferenciasRoutes from './preferencias';
import woocommerceRoutes from './woocommerce';
import stripeRoutes from './stripe';
import adminRoutes from './admin';
import videoCallbackRoutes from './video-callback';
import socialRoutes from './social';
import contactRoutes from './contact';

const router = Router();

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de usuarios
router.use('/users', userRoutes);

// Rutas de transacciones
router.use('/transacciones', transaccionRoutes);

// Rutas de preferencias
router.use('/preferencias', preferenciasRoutes);

// Rutas de WooCommerce
router.use('/woocommerce', woocommerceRoutes);

// Rutas de Stripe
router.use('/stripe', stripeRoutes);

// Rutas de Redes Sociales
router.use('/social', socialRoutes);

// Rutas de contacto
router.use('/contact', contactRoutes);

// Rutas de administración
router.use('/admin', adminRoutes);

// Rutas de generación de video y puntos
router.use('/video-callback', videoCallbackRoutes);

// Ruta de salud del API
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

export default router;
