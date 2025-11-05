import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../database/connection';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Validaciones para formulario de contacto
const contactValidation = [
  body('asunto')
    .notEmpty()
    .withMessage('El asunto es requerido')
    .isLength({ min: 3, max: 200 })
    .withMessage('El asunto debe tener entre 3 y 200 caracteres'),
  body('mensaje')
    .notEmpty()
    .withMessage('El mensaje es requerido')
    .isLength({ min: 10, max: 2000 })
    .withMessage('El mensaje debe tener entre 10 y 2000 caracteres'),
  body('tipo')
    .optional()
    .isIn(['consulta', 'soporte', 'sugerencia', 'error', 'otro'])
    .withMessage('Tipo de contacto inválido')
];

// POST /api/contact - Enviar formulario de contacto
router.post('/', contactValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { asunto, mensaje, tipo = 'consulta' } = req.body;

    // Obtener IP address (considerando proxies)
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                      req.headers['x-real-ip'] as string || 
                      req.ip || 
                      req.socket.remoteAddress || 
                      'unknown';
    
    // Obtener User Agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Guardar el mensaje de contacto en logs_sistema
    const sql = `
      INSERT INTO logs_sistema (id_usuario, accion, descripcion, ip_address, user_agent, fecha)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const descripcion = `${asunto}:${mensaje}`;
    
    await db.execute(sql, [req.user.id, tipo, descripcion, ipAddress, userAgent]);

    // Aquí podrías también enviar un email o webhook a N8N
    // Por ahora solo guardamos en la base de datos

    res.json({
      success: true,
      message: 'Mensaje de contacto enviado exitosamente. Nos pondremos en contacto contigo pronto.'
    });
  } catch (error: any) {
    console.error('Error al enviar formulario de contacto:', error);
    res.status(500).json({ 
      error: error.message || 'Error al enviar formulario de contacto'
    });
  }
});

export default router;

