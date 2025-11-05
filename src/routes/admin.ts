import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/userService';
import { PreferenciasService } from '../services/preferenciasService';
import { SocialMediaService } from '../services/socialMediaService';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { CreateUserData, UpdateUserData } from '../models/User';
import { CreatePreferenciasData, UpdatePreferenciasData } from '../models/PreferenciasUsuario';
import { UpsertSocialCredentialRequest, SocialPlatformId } from '../models/SocialMedia';
import { db } from '../database/connection';

const router = Router();

// Aplicar autenticación y verificación de administrador a todas las rutas
router.use(authenticateToken);
router.use(requireAdmin);

// Validaciones para crear usuario
const createUserValidation = [
  body('nombre_usuario')
    .isLength({ min: 3 })
    .withMessage('El nombre de usuario debe tener al menos 3 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido'),
  body('contraseña')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol')
    .optional()
    .isIn(['admin', 'usuario', 'moderador'])
    .withMessage('El rol debe ser admin, usuario o moderador')
];

// Validaciones para crear preferencias
const createPreferenciasValidation = [
  body('cliente_key')
    .notEmpty()
    .withMessage('El cliente_key es requerido'),
  body('url_tienda')
    .isURL({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('La URL de la tienda debe ser válida'),
  body('cliente_secret')
    .notEmpty()
    .withMessage('El cliente_secret es requerido'),
  body('n8n_webhook')
    .optional()
    .isURL({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('El webhook de N8N debe ser una URL válida'),
  body('n8n_redes')
    .optional()
    .isURL({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('El webhook de N8N para redes sociales debe ser una URL válida')
];

// POST /api/admin/users - Crear usuario simple
router.post('/users', createUserValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const userData: CreateUserData = {
      nombre_usuario: req.body.nombre_usuario,
      email: req.body.email,
      contraseña: req.body.contraseña,
      rol: req.body.rol || 'usuario'
    };

    const user = await UserService.createUser(userData);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al crear usuario'
    });
  }
});

// POST /api/admin/users-with-preferences - Crear usuario con preferencias
router.post('/users-with-preferences', 
  [...createUserValidation, ...createPreferenciasValidation], 
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos de validación incorrectos',
          details: errors.array()
        });
      }

      // Crear usuario primero
      const userData: CreateUserData = {
        nombre_usuario: req.body.nombre_usuario,
        email: req.body.email,
        contraseña: req.body.contraseña,
        rol: req.body.rol || 'usuario'
      };

      const user = await UserService.createUser(userData);

      // Crear preferencias para el usuario
      const preferenciasData: CreatePreferenciasData = {
        id_usuario: user.id,
        cliente_key: req.body.cliente_key,
        url_tienda: req.body.url_tienda,
        cliente_secret: req.body.cliente_secret,
        n8n_webhook: req.body.n8n_webhook || '',
        n8n_redes: req.body.n8n_redes || undefined
      };

      const preferencias = await PreferenciasService.createPreferencias(preferenciasData);

      res.status(201).json({
        message: 'Usuario con preferencias creado exitosamente',
        user,
        preferencias
      });
    } catch (error: any) {
      // Si hay error al crear preferencias, eliminar el usuario creado
      if (req.body.nombre_usuario && req.body.email) {
        try {
          const userToDelete = await UserService.getUserByEmail(req.body.email);
          if (userToDelete) {
            await UserService.deleteUser(userToDelete.id);
          }
        } catch (deleteError) {
          console.error('Error al eliminar usuario después de fallo en preferencias:', deleteError);
        }
      }
      
      res.status(500).json({ 
        error: error.message || 'Error al crear usuario con preferencias'
      });
    }
  }
);

// GET /api/admin/users - Obtener todos los usuarios (solo admin)
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await UserService.getAllUsers();
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener usuarios'
    });
  }
});

// GET /api/admin/users/:id - Obtener usuario específico (solo admin)
router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
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

// DELETE /api/admin/users/:id - Eliminar usuario (solo admin)
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // No permitir que un admin se elimine a sí mismo
    if (req.user && req.user.id === userId) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
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

// GET /api/admin/preferences - Obtener todas las preferencias (solo admin)
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const preferencias = await PreferenciasService.getAllPreferencias();
    res.json({ preferencias });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener preferencias'
    });
  }
});

// Validaciones para actualizar usuario
const updateUserValidation = [
  body('nombre_usuario')
    .optional()
    .isLength({ min: 3 })
    .withMessage('El nombre de usuario debe tener al menos 3 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Debe ser un email válido'),
  body('contraseña')
    .optional()
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol')
    .optional()
    .isIn(['admin', 'usuario', 'moderador'])
    .withMessage('El rol debe ser admin, usuario o moderador'),
  body('puntos')
    .optional()
    .isInt()
    .withMessage('Los puntos deben ser un número entero')
];

// Validaciones para actualizar preferencias
const updatePreferenciasValidation = [
  body('cliente_key')
    .optional()
    .notEmpty()
    .withMessage('El cliente_key no puede estar vacío'),
  body('url_tienda')
    .optional()
    .isURL({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('La URL de la tienda debe ser válida'),
  body('cliente_secret')
    .optional()
    .notEmpty()
    .withMessage('El cliente_secret no puede estar vacío'),
  body('n8n_webhook')
    .optional()
    .isURL({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('El webhook de N8N debe ser una URL válida'),
  body('n8n_redes')
    .optional()
    .isURL({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('El webhook de N8N para redes sociales debe ser una URL válida')
];

// PUT /api/admin/users/:id - Actualizar usuario (solo admin)
router.put('/users/:id', updateUserValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const updateData: UpdateUserData = {
      nombre_usuario: req.body.nombre_usuario,
      email: req.body.email,
      contraseña: req.body.contraseña,
      rol: req.body.rol,
      puntos: req.body.puntos
    };

    // Eliminar campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateUserData] === undefined) {
        delete updateData[key as keyof UpdateUserData];
      }
    });

    const user = await UserService.updateUser(userId, updateData);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      message: 'Usuario actualizado exitosamente',
      user
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al actualizar usuario'
    });
  }
});

// PUT /api/admin/users/:id/preferences - Actualizar preferencias de un usuario (solo admin)
router.put('/users/:id/preferences', updatePreferenciasValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Verificar que el usuario existe
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updateData: UpdatePreferenciasData = {
      cliente_key: req.body.cliente_key,
      url_tienda: req.body.url_tienda,
      cliente_secret: req.body.cliente_secret,
      n8n_webhook: req.body.n8n_webhook,
      n8n_redes: req.body.n8n_redes
    };

    // Eliminar campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdatePreferenciasData] === undefined) {
        delete updateData[key as keyof UpdatePreferenciasData];
      }
    });

    // Intentar actualizar, si no existen, crear nuevas
    let preferencias = await PreferenciasService.updatePreferencias(userId, updateData);
    
    if (!preferencias) {
      // Si no existen, crear nuevas preferencias
      const createData: CreatePreferenciasData = {
        id_usuario: userId,
        cliente_key: updateData.cliente_key || '',
        url_tienda: updateData.url_tienda || '',
        cliente_secret: updateData.cliente_secret || '',
        n8n_webhook: updateData.n8n_webhook || '',
        n8n_redes: updateData.n8n_redes
      };
      
      const created = await PreferenciasService.createPreferencias(createData);
      return res.json({
        message: 'Preferencias creadas exitosamente',
        preferencias: created
      });
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

// GET /api/admin/users/:id/preferences - Obtener preferencias de un usuario (solo admin)
router.get('/users/:id/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const preferencias = await PreferenciasService.getPreferenciasByUserId(userId);
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

// POST /api/admin/users/:id/preferences - Crear preferencias para un usuario (solo admin)
router.post('/users/:id/preferences', createPreferenciasValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Verificar que el usuario existe
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const preferenciasData: CreatePreferenciasData = {
      id_usuario: userId,
      cliente_key: req.body.cliente_key,
      url_tienda: req.body.url_tienda,
      cliente_secret: req.body.cliente_secret,
      n8n_webhook: req.body.n8n_webhook,
      n8n_redes: req.body.n8n_redes
    };

    const preferencias = await PreferenciasService.createPreferencias(preferenciasData);

    res.status(201).json({
      message: 'Preferencias creadas exitosamente',
      preferencias
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al crear preferencias'
    });
  }
});

// GET /api/admin/messages - Obtener mensajes de contacto (solo admin)
router.get('/messages', async (req: AuthRequest, res: Response) => {
  try {
    // Obtener mensajes de contacto desde logs_sistema
    // Los mensajes de contacto tienen accion en ['consulta', 'soporte', 'sugerencia', 'error', 'otro']
    const sql = `
      SELECT 
        l.id,
        l.id_usuario,
        l.accion as tipo,
        l.descripcion,
        l.ip_address,
        l.user_agent,
        l.fecha,
        l.is_done,
        l.solucion,
        u.nombre_usuario,
        u.email
      FROM logs_sistema l
      LEFT JOIN users u ON l.id_usuario = u.id
      WHERE l.accion IN ('consulta', 'soporte', 'sugerencia', 'error', 'otro')
      ORDER BY l.fecha DESC
    `;

    const [rows] = await db.execute(sql);
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
        is_done: row.is_done || false,
        solucion: row.solucion || null,
        nombre_usuario: row.nombre_usuario || 'Usuario eliminado',
        email: row.email || 'N/A'
      };
    });

    res.json({ messages });
  } catch (error: any) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ 
      error: error.message || 'Error al obtener mensajes'
    });
  }
});

// PUT /api/admin/messages/:id - Actualizar estado y solución de un mensaje (solo admin)
router.put('/messages/:id', [
  body('is_done').optional().isBoolean().withMessage('is_done debe ser un booleano'),
  body('solucion').optional().isString().withMessage('solucion debe ser un string')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'ID de mensaje inválido' });
    }

    const { is_done, solucion } = req.body;

    // Construir la consulta SQL dinámicamente
    const updates: string[] = [];
    const params: any[] = [];

    if (is_done !== undefined) {
      updates.push('is_done = ?');
      params.push(is_done);
    }

    if (solucion !== undefined) {
      updates.push('solucion = ?');
      params.push(solucion);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    params.push(messageId);

    const sql = `
      UPDATE logs_sistema 
      SET ${updates.join(', ')}
      WHERE id = ? AND accion IN ('consulta', 'soporte', 'sugerencia', 'error', 'otro')
    `;

    const [result] = await db.execute(sql, params) as any[];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    // Obtener el mensaje actualizado
    const [updatedRows] = await db.execute(`
      SELECT 
        l.id,
        l.id_usuario,
        l.accion as tipo,
        l.descripcion,
        l.ip_address,
        l.user_agent,
        l.fecha,
        l.is_done,
        l.solucion,
        u.nombre_usuario,
        u.email
      FROM logs_sistema l
      LEFT JOIN users u ON l.id_usuario = u.id
      WHERE l.id = ?
    `, [messageId]) as any[];

    const row = updatedRows[0];
    const descripcion = row.descripcion || '';
    const parts = descripcion.split(':');
    const asunto = parts[0] || '';
    const mensaje = parts.slice(1).join(':') || '';

    const updatedMessage = {
      id: row.id,
      id_usuario: row.id_usuario,
      tipo: row.tipo,
      asunto,
      mensaje,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      fecha: row.fecha,
      is_done: row.is_done || false,
      solucion: row.solucion || null,
      nombre_usuario: row.nombre_usuario || 'Usuario eliminado',
      email: row.email || 'N/A'
    };

    res.json({
      message: 'Mensaje actualizado exitosamente',
      mensaje: updatedMessage
    });
  } catch (error: any) {
    console.error('Error al actualizar mensaje:', error);
    res.status(500).json({ 
      error: error.message || 'Error al actualizar mensaje'
    });
  }
});

// GET /api/admin/users/:id/social - Obtener credenciales de redes sociales de un usuario (solo admin)
router.get('/users/:id/social', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const credentials = await SocialMediaService.listConnectionsByUser(userId);
    res.json({ credentials });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener credenciales de redes sociales'
    });
  }
});

// PUT /api/admin/users/:id/social/:plataforma - Actualizar credenciales de redes sociales (solo admin)
router.put('/users/:id/social/:plataforma', [
  body('account_id').optional().isString(),
  body('is_active').optional().isBoolean(),
  body('access_token').optional().isString(),
  body('username').optional().isString(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    const plataforma = req.params.plataforma as SocialPlatformId;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const validPlatforms: SocialPlatformId[] = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'linkedin', 'pinterest'];
    if (!validPlatforms.includes(plataforma)) {
      return res.status(400).json({ error: 'Plataforma inválida' });
    }

    // Verificar que el usuario existe
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar o crear credencial
    const updateData: UpsertSocialCredentialRequest = {
      plataforma,
      account_id: req.body.account_id,
      access_token: req.body.access_token,
      username: req.body.username,
      is_active: req.body.is_active,
    };

    // Eliminar campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpsertSocialCredentialRequest] === undefined) {
        delete updateData[key as keyof UpsertSocialCredentialRequest];
      }
    });

    const credential = await SocialMediaService.upsertCredential(userId, updateData);

    res.json({
      message: 'Credencial actualizada exitosamente',
      credential
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al actualizar credenciales de redes sociales'
    });
  }
});

export default router;


