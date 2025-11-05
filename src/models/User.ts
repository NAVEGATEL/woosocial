export interface User {
  id: number;
  nombre_usuario: string;
  email: string;
  contraseña_encriptada: string;
  puntos: number;
  rol: 'admin' | 'usuario' | 'moderador';
  fecha_creacion: string;
  ultimo_login: string | null;
}

export interface CreateUserData {
  nombre_usuario: string;
  email: string;
  contraseña: string;
  rol?: 'admin' | 'usuario' | 'moderador';
}

export interface UpdateUserData {
  nombre_usuario?: string;
  email?: string;
  contraseña?: string;
  puntos?: number;
  rol?: 'admin' | 'usuario' | 'moderador';
}

export interface LoginData {
  email: string;
  contraseña: string;
}

export interface UserResponse {
  id: number;
  nombre_usuario: string;
  email: string;
  puntos: number;
  rol: 'admin' | 'usuario' | 'moderador';
  fecha_creacion: string;
  ultimo_login: string | null;
}