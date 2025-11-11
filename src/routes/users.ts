import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/userService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { UpdateUserData } from '../models/User';
import { db } from '../database/connection';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Validaciones
const updateUserValidation = [
  body('nombre_usuario').optional().isLength({ min: 3 }).withMessage('El nombre de usuario debe tener al menos 3 caracteres'),
  body('email').optional().isEmail().withMessage('Debe ser un email válido'),
  body('contraseña').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('puntos').optional().isInt({ min: 0 }).withMessage('Los puntos deben ser un número entero positivo')
];

// GET /api/users/profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const user = await UserService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener perfil de usuario'
    });
  }
});

// PUT /api/users/profile
router.put('/profile', updateUserValidation, async (req: AuthRequest, res: Response) => {
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

    const updateData: UpdateUserData = req.body;
    const user = await UserService.updateUser(req.user.id, updateData);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      message: 'Perfil actualizado exitosamente',
      user
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al actualizar perfil de usuario'
    });
  }
});

// GET /api/users (solo para administradores - por ahora permitimos a todos los usuarios autenticados)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const users = await UserService.getAllUsers();
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener usuarios'
    });
  }
});

// GET /api/users/messages - Obtener mensajes de contacto del usuario autenticado
// IMPORTANTE: Esta ruta debe ir ANTES de /:id para evitar conflictos
router.get('/messages', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener mensajes de contacto del usuario desde logs_sistema
    const sql = `
      SELECT 
        l.id,
        l.id_usuario,
        l.accion as tipo,
        l.descripcion,
        l.ip_address,
        l.user_agent,
        l.fecha,
        u.nombre_usuario,
        u.email
      FROM logs_sistema l
      LEFT JOIN users u ON l.id_usuario = u.id
      WHERE l.id_usuario = ? AND l.accion IN ('consulta', 'soporte', 'sugerencia', 'error', 'otro')
      ORDER BY l.fecha DESC
    `;

    const [rows] = await db.execute(sql, [req.user.id]);
    const messages = (rows as any[]).map(row => {
      // Parsear descripcion que tiene formato "asunto:mensaje"
      const descripcion = row.descripcion || '';
      const parts = descripcion.split(':');
      const asunto = parts[0] || '';
      const mensaje = parts.slice(1).join(':') || '';

      return {
        id: row.id,
        id_usuario: row.id_usuario,
        tipo: row.tipo,
        asunto,
        mensaje,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        fecha: row.fecha,
        nombre_usuario: row.nombre_usuario || 'Usuario eliminado',
        email: row.email || 'N/A'
      };
    });

    res.json({ messages });
  } catch (error: any) {
    console.error('Error al obtener mensajes del usuario:', error);
    res.status(500).json({ 
      error: error.message || 'Error al obtener mensajes'
    });
  }
});

// GET /api/users/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Solo permitir ver el propio perfil o ser administrador
    if (req.user && req.user.id !== userId) {
      // Aquí podrías agregar lógica de administrador
      // Por ahora permitimos ver cualquier perfil
    }

    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener usuario'
    });
  }
});

// DELETE /api/users/:id (solo para administradores)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Solo permitir eliminar el propio usuario o ser administrador
    if (req.user && req.user.id !== userId) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este usuario' });
    }

    const deleted = await UserService.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al eliminar usuario'
    });
  }
});

// Validaciones para cambio de contraseña
const changePasswordValidation = [
  body('contraseña_actual')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  body('nueva_contraseña')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  body('confirmar_contraseña')
    .custom((value, { req }) => {
      if (value !== req.body.nueva_contraseña) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    })
];

// POST /api/users/change-password - Cambiar contraseña
router.post('/change-password', changePasswordValidation, async (req: AuthRequest, res: Response) => {
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

    const { contraseña_actual, nueva_contraseña } = req.body;

    // Obtener usuario con contraseña para validar
    const user = await UserService.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const isValidPassword = await UserService.verifyPassword(contraseña_actual, user.contraseña_encriptada);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Actualizar contraseña
    const updatedUser = await UserService.updateUser(req.user.id, { contraseña: nueva_contraseña });
    if (!updatedUser) {
      return res.status(500).json({ error: 'Error al actualizar la contraseña' });
    }

    res.json({
      message: 'Contraseña actualizada exitosamente',
      user: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al cambiar contraseña'
    });
  }
});

export default router;
