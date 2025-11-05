import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    nombre_usuario: string;
    email: string;
    puntos: number;
    rol: 'admin' | 'usuario' | 'moderador';
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log(`[AUTH] Verificando autenticación para: ${req.method} ${req.path}`);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log(`[AUTH] Token presente: ${!!token}`);
  console.log(`[AUTH] Auth header: ${authHeader}`);

  if (!token) {
    console.log('[AUTH] Error: Token de acceso requerido');
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.log('[AUTH] Error: JWT_SECRET no configurado');
      throw new Error('JWT_SECRET no configurado');
    }

    console.log(`[AUTH] Verificando token con JWT_SECRET: ${!!jwtSecret}`);
    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    console.log(`[AUTH] Token decodificado - userId: ${decoded.userId}`);

    const user = await UserService.getUserById(decoded.userId);
    console.log(`[AUTH] Usuario encontrado: ${!!user}`);

    if (!user) {
      console.log('[AUTH] Error: Usuario no encontrado');
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = {
      id: user.id,
      nombre_usuario: user.nombre_usuario,
      email: user.email,
      puntos: user.puntos,
      rol: user.rol
    };

    console.log(`[AUTH] Usuario autenticado: ${user.nombre_usuario} (ID: ${user.id})`);
    next();
  } catch (error) {
    console.log(`[AUTH] Error al verificar token: ${error}`);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

export const generateToken = (userId: number): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET no configurado');
  }

  return jwt.sign({ userId }, jwtSecret, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
  } as jwt.SignOptions);
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log(`[AUTH] Verificando rol de administrador para: ${req.user?.nombre_usuario}`);
  
  if (!req.user) {
    console.log('[AUTH] Error: Usuario no autenticado');
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (req.user.rol !== 'admin') {
    console.log(`[AUTH] Error: Acceso denegado. Rol requerido: admin, rol actual: ${req.user.rol}`);
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
  }

  console.log(`[AUTH] Acceso de administrador autorizado para: ${req.user.nombre_usuario}`);
  next();
};