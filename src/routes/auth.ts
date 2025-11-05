import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/userService';
import { generateToken } from '../middleware/auth';
import { CreateUserData, LoginData } from '../models/User';

const router = Router();

// Validaciones
const registerValidation = [
  body('nombre_usuario').isLength({ min: 3 }).withMessage('El nombre de usuario debe tener al menos 3 caracteres'),
  body('email').isEmail().withMessage('Debe ser un email válido'),
  body('contraseña').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
];

const loginValidation = [
  body('email').isEmail().withMessage('Debe ser un email válido'),
  body('contraseña').notEmpty().withMessage('La contraseña es requerida')
];

// POST /api/auth/register
router.post('/register', registerValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const userData: CreateUserData = req.body;
    const user = await UserService.createUser(userData);
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user,
      token
    });
  } catch (error: any) {
    res.status(400).json({ 
      error: error.message || 'Error al registrar usuario'
    });
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const loginData: LoginData = req.body;
    const user = await UserService.login(loginData);

    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales incorrectas'
      });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login exitoso',
      user,
      token
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al hacer login'
    });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no configurado');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    const user = await UserService.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error: any) {
    res.status(403).json({ error: 'Token inválido' });
  }
});

export default router;