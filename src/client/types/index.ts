// Tipos para la API
export interface User {
  id: number;
  nombre_usuario: string;
  email: string;
  puntos: number;
  fecha_creacion: string;
  ultimo_login: string | null;
  rol: 'admin' | 'usuario';
}

export interface Transaccion {
  id: number;
  id_usuario: number;
  tipo: 'compra' | 'venta' | 'bonificacion' | 'penalizacion' | 'reembolso';
  descripcion: string;
  cantidad_puntos: number;
  fecha: string;
  usuario?: {
    id: number;
    nombre_usuario: string;
    email: string;
  };
}

export interface PreferenciasUsuario {
  id: number;
  id_usuario: number;
  cliente_key: string;
  url_tienda: string;
  cliente_secret: string;
  n8n_webhook: string;
  usuario?: {
    id: number;
    nombre_usuario: string;
    email: string;
  };
}

// Tipos para formularios
export interface LoginForm {
  email: string;
  contraseña: string;
}

export interface RegisterForm {
  nombre_usuario: string;
  email: string;
  contraseña: string;
  confirmar_contraseña: string;
}

export interface TransaccionForm {
  id_usuario: number;
  tipo: 'compra' | 'venta' | 'bonificacion' | 'penalizacion' | 'reembolso';
  descripcion: string;
  cantidad_puntos: number;
}

export interface PreferenciasForm {
  cliente_key: string;
  url_tienda: string;
  cliente_secret: string;
  n8n_webhook: string;
}

// Tipos para respuestas de la API
export interface ApiResponse<T> {
  message?: string;
  error?: string;
  data?: T;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface TransaccionesResponse {
  transacciones: Transaccion[];
}

// Redes sociales
export type SocialPlatformId = 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube' | 'linkedin' | 'pinterest';

export interface SocialConnection {
  plataforma: SocialPlatformId;
  connected: boolean;
  username: string | null;
  account_id: string | null;
}

export interface SocialConnectionsResponse {
  connections: SocialConnection[];
}

export interface UpsertSocialCredentialRequest {
  plataforma: SocialPlatformId;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string | null;
  app_id?: string;
  app_secret?: string;
  username?: string;
  account_id?: string;
}

export interface PreferenciasResponse {
  preferencias: PreferenciasUsuario;
}

// Tipos para el contexto de autenticación
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, contraseña: string) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

// Tipos para filtros
export interface TransaccionFilters {
  tipo?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  limite?: number;
  offset?: number;
}

// Tipos para estadísticas
export interface TransaccionStats {
  total_transacciones: number;
  total_puntos_ganados: number;
  total_puntos_gastados: number;
  balance_actual: number;
}

// Tipos para videos
export interface Video {
  id: number;
  video_id: string;
  video_url: string;
  fecha: string;
  puntos_deducidos: number;
}

// Tipos para publicaciones
export interface Publicacion {
  id: number;
  video_id: string;
  video_url: string;
  plataforma: 'instagram' | 'tiktok' | 'facebook';
  fecha: string;
  descripcion: string;
}

// Tipos para Stripe
export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  points: number;
  price: number;
  currency: string;
  priceId: string;
}

export interface CreatePaymentIntentRequest {
  productId: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  amount: number;
  points: number;
}
