import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PreferenciasService } from '../services/preferenciasService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CreatePreferenciasData, UpdatePreferenciasData } from '../models/PreferenciasUsuario';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Validaciones
const createPreferenciasValidation = [
  body('cliente_key').isLength({ min: 1 }).withMessage('Cliente key es requerido'),
  body('url_tienda').isURL().withMessage('URL de tienda debe ser una URL válida'),
  body('cliente_secret').isLength({ min: 1 }).withMessage('Cliente secret es requerido'),
  body('n8n_webhook').optional().custom((value) => {
    if (value && value.trim() !== '') {
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('N8N webhook debe ser una URL válida');
      }
    }
    return true;
  }),
  body('n8n_redes').optional().custom((value) => {
    if (value && value.trim() !== '') {
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('N8N webhook para redes sociales debe ser una URL válida');
      }
    }
    return true;
  })
];

const updatePreferenciasValidation = [
  body('cliente_key').optional().isLength({ min: 1 }).withMessage('Cliente key no puede estar vacío'),
  body('url_tienda').optional().isURL().withMessage('URL de tienda debe ser una URL válida'),
  body('cliente_secret').optional().isLength({ min: 1 }).withMessage('Cliente secret no puede estar vacío'),
  body('n8n_webhook').optional().custom((value) => {
    if (value && value.trim() !== '') {
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('N8N webhook debe ser una URL válida');
      }
    }
    return true;
  }),
  body('n8n_redes').optional().custom((value) => {
    if (value && value.trim() !== '') {
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('N8N webhook para redes sociales debe ser una URL válida');
      }
    }
    return true;
  })
];

// POST /api/preferencias
router.post('/', createPreferenciasValidation, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📝 Datos recibidos:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Errores de validación:', errors.array());
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const preferenciasData: CreatePreferenciasData = {
      ...req.body,
      id_usuario: req.user.id
    };

    const preferencias = await PreferenciasService.createPreferencias(preferenciasData);

    res.status(201).json({
      message: 'Preferencias creadas exitosamente',
      preferencias
    });
  } catch (error: any) {
    res.status(400).json({ 
      error: error.message || 'Error al crear preferencias'
    });
  }
});

// GET /api/preferencias
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const preferencias = await PreferenciasService.getPreferenciasByUserId(req.user.id);

    if (!preferencias) {
      return res.status(404).json({ error: 'Preferencias no encontradas' });
    }

    res.json({ preferencias });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener preferencias'
    });
  }
});

// PUT /api/preferencias
router.put('/', updatePreferenciasValidation, async (req: AuthRequest, res: Response) => {
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

    const updateData: UpdatePreferenciasData = req.body;
    const preferencias = await PreferenciasService.updatePreferencias(req.user.id, updateData);

    if (!preferencias) {
      return res.status(404).json({ error: 'Preferencias no encontradas' });
    }

    res.json({
      message: 'Preferencias actualizadas exitosamente',
      preferencias
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al actualizar preferencias'
    });
  }
});

// DELETE /api/preferencias
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const deleted = await PreferenciasService.deletePreferencias(req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Preferencias no encontradas' });
    }

    res.json({ message: 'Preferencias eliminadas exitosamente' });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al eliminar preferencias'
    });
  }
});

// GET /api/preferencias/all (para administradores)
router.get('/all', async (req: AuthRequest, res: Response) => {
  try {
    const preferencias = await PreferenciasService.getAllPreferencias();
    res.json({ preferencias });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener todas las preferencias'
    });
  }
});

// POST /api/preferencias/test-woocommerce
router.post('/test-woocommerce', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const preferencias = await PreferenciasService.getPreferenciasByUserId(req.user.id);
    if (!preferencias) {
      return res.status(404).json({ error: 'Preferencias no encontradas' });
    }

    const isValid = await PreferenciasService.validateWooCommerceConnection(preferencias);

    res.json({ 
      valid: isValid,
      message: isValid ? 'Conexión con WooCommerce válida' : 'Conexión con WooCommerce inválida'
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al probar conexión con WooCommerce'
    });
  }
});

// POST /api/preferencias/test-n8n
router.post('/test-n8n', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const preferencias = await PreferenciasService.getPreferenciasByUserId(req.user.id);
    if (!preferencias) {
      return res.status(404).json({ error: 'Preferencias no encontradas' });
    }

    const isValid = await PreferenciasService.testN8nWebhook(preferencias.n8n_webhook);

    res.json({ 
      valid: isValid,
      message: isValid ? 'Webhook de N8N válido' : 'Webhook de N8N inválido'
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al probar webhook de N8N'
    });
  }
});

export default router;
