import { 
  User, 
  Transaccion, 
  PreferenciasUsuario, 
  LoginForm, 
  RegisterForm, 
  TransaccionForm, 
  PreferenciasForm,
  AuthResponse,
  TransaccionesResponse,
  PreferenciasResponse,
  TransaccionFilters,
  TransaccionStats,
  StripeProduct,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  SocialConnectionsResponse,
  UpsertSocialCredentialRequest,
  SocialPlatformId,
  Video,
  Publicacion
} from '../types';

const API_BASE_URL = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    // Inicializar token desde localStorage si existe
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      this.token = storedToken;
    }
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      // Manejar errores de conexión específicamente
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Error de conexión: El servidor no está disponible');
      }
      throw error;
    }
  }

  // Redes sociales
  async getSocialConnections(): Promise<SocialConnectionsResponse> {
    return this.request<SocialConnectionsResponse>('/social', { method: 'GET' });
  }

  async connectSocial(data: UpsertSocialCredentialRequest): Promise<{ message: string } & any> {
    return this.request('/social/connect', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async disconnectSocial(plataforma: SocialPlatformId): Promise<{ message: string }> {
    return this.request(`/social/${plataforma}`, { method: 'DELETE' });
  }

  async validateSocialToken(plataforma: 'instagram' | 'facebook', access_token: string): Promise<{ valid: boolean; username?: string | null; account_id?: string | null; error?: string }> {
    return this.request('/social/validate', {
      method: 'POST',
      body: JSON.stringify({ plataforma, access_token })
    });
  }

  // TikTok OAuth: inicia redirección
  getTikTokAuthUrl(userId?: number) {
    const qs = userId ? `?userId=${encodeURIComponent(String(userId))}` : '';
    return `/api/social/tiktok/auth${qs}`;
  }

  // Publicar video en redes sociales
  async publishToSocialMedia(data: {
    video_id: string;
    social_platforms: Array<{ plataforma: string; account_id: string | null }>;
    message?: string;
  }): Promise<{ success: boolean; message: string; data: any }> {
    return this.request('/social/publish', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Callbacks de publicación en redes sociales
  async publishSuccessCallback(platform: 'instagram' | 'tiktok' | 'facebook', data: {
    user_id: number;
    video_id: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request(`/video-callback/publish/success/${platform}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async publishErrorCallback(platform: 'instagram' | 'tiktok' | 'facebook', data: {
    user_id: number;
    video_id: string;
    error_message?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request(`/video-callback/publish/error/${platform}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async publishExternalErrorCallback(data: {
    user_id: number;
    video_id: string;
    error_message?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request('/video-callback/publish/error/external', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Autenticación
  async login(data: LoginForm): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: RegisterForm): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  // Usuarios
  async getUserProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/users/profile');
  }

  async updateUserProfile(data: Partial<User>): Promise<{ user: User; message: string }> {
    return this.request<{ user: User; message: string }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: {
    contraseña_actual: string;
    nueva_contraseña: string;
    confirmar_contraseña: string;
  }): Promise<{ user: User; message: string }> {
    return this.request<{ user: User; message: string }>('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendContactForm(data: {
    asunto: string;
    mensaje: string;
    tipo?: 'consulta' | 'soporte' | 'sugerencia' | 'error' | 'otro';
  }): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Transacciones
  async getTransacciones(filters?: TransaccionFilters): Promise<TransaccionesResponse> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/transacciones?${queryString}` : '/transacciones';
    
    return this.request<TransaccionesResponse>(endpoint);
  }

  async createTransaccion(data: TransaccionForm): Promise<{ transaccion: Transaccion; message: string }> {
    return this.request<{ transaccion: Transaccion; message: string }>('/transacciones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransaccionById(id: number): Promise<{ transaccion: Transaccion }> {
    return this.request<{ transaccion: Transaccion }>(`/transacciones/${id}`);
  }

  async deleteTransaccion(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/transacciones/${id}`, {
      method: 'DELETE',
    });
  }

  async getTransaccionStats(): Promise<{ stats: TransaccionStats }> {
    return this.request<{ stats: TransaccionStats }>('/transacciones/stats');
  }

  // Preferencias
  async getPreferencias(): Promise<PreferenciasResponse> {
    return this.request<PreferenciasResponse>('/preferencias');
  }

  async createPreferencias(data: PreferenciasForm): Promise<{ preferencias: PreferenciasUsuario; message: string }> {
    return this.request<{ preferencias: PreferenciasUsuario; message: string }>('/preferencias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePreferencias(data: Partial<PreferenciasForm>): Promise<{ preferencias: PreferenciasUsuario; message: string }> {
    return this.request<{ preferencias: PreferenciasUsuario; message: string }>('/preferencias', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePreferencias(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/preferencias', {
      method: 'DELETE',
    });
  }

  async testWooCommerceConnection(): Promise<{ valid: boolean; message: string }> {
    return this.request<{ valid: boolean; message: string }>('/preferencias/test-woocommerce', {
      method: 'POST',
    });
  }

  async testN8nWebhook(): Promise<{ valid: boolean; message: string }> {
    return this.request<{ valid: boolean; message: string }>('/preferencias/test-n8n', {
      method: 'POST',
    });
  }

  // Video generation
  async checkUserPoints(): Promise<{ points: number; canGenerate: boolean }> {
    return this.request<{ points: number; canGenerate: boolean }>('/video-callback/check-points');
  }

  async generateVideo(data: {
    product: any;
    prompt_config: any;
    callback_url: string;
  }): Promise<{ success: boolean; message: string; video_id: string }> {
    return this.request<{ success: boolean; message: string; video_id: string }>('/video-callback/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Obtener videos generados por el usuario
  async getUserVideos(): Promise<{ videos: Video[] }> {
    return this.request<{ videos: Video[] }>('/transacciones/videos');
  }

  // Obtener videos generados por el usuario con paginación
  async getUserVideosPaginated(page: number = 1, perPage: number = 12): Promise<{
    videos: Video[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    return this.request<{
      videos: Video[];
      total: number;
      totalPages: number;
      currentPage: number;
    }>(`/transacciones/videos?page=${page}&per_page=${perPage}`);
  }

  // Obtener publicaciones en redes sociales
  async getPublicaciones(): Promise<{ publicaciones: Publicacion[] }> {
    return this.request<{ publicaciones: Publicacion[] }>('/transacciones/publicaciones');
  }

  // Administrador - Usuarios
  async createUser(data: {
    nombre_usuario: string;
    email: string;
    contraseña: string;
    rol: 'admin' | 'usuario' | 'moderador';
  }): Promise<{ user: User; message: string }> {
    return this.request<{ user: User; message: string }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createUserWithPreferences(data: {
    nombre_usuario: string;
    email: string;
    contraseña: string;
    rol: 'admin' | 'usuario' | 'moderador';
    cliente_key: string;
    url_tienda: string;
    cliente_secret: string;
    n8n_webhook?: string;
    n8n_redes?: string;
  }): Promise<{ user: User; preferencias: PreferenciasUsuario; message: string }> {
    return this.request<{ user: User; preferencias: PreferenciasUsuario; message: string }>('/admin/users-with-preferences', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAllUsers(): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>('/admin/users');
  }

  async getUserById(id: number): Promise<{ user: User }> {
    return this.request<{ user: User }>(`/admin/users/${id}`);
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getAllPreferencias(): Promise<{ preferencias: PreferenciasUsuario[] }> {
    return this.request<{ preferencias: PreferenciasUsuario[] }>('/admin/preferences');
  }

  async updateUser(userId: number, data: {
    nombre_usuario?: string;
    email?: string;
    contraseña?: string;
    rol?: 'admin' | 'usuario' | 'moderador';
    puntos?: number;
  }): Promise<{ user: User; message: string }> {
    return this.request<{ user: User; message: string }>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUserPreferences(userId: number): Promise<{ preferencias: PreferenciasUsuario }> {
    return this.request<{ preferencias: PreferenciasUsuario }>(`/admin/users/${userId}/preferences`);
  }

  async updateUserPreferences(userId: number, data: {
    cliente_key?: string;
    url_tienda?: string;
    cliente_secret?: string;
    n8n_webhook?: string;
    n8n_redes?: string;
  }): Promise<{ preferencias: PreferenciasUsuario; message: string }> {
    return this.request<{ preferencias: PreferenciasUsuario; message: string }>(`/admin/users/${userId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getMessages(): Promise<{ messages: Array<{
    id: number;
    id_usuario: number | null;
    tipo: 'consulta' | 'soporte' | 'sugerencia' | 'error' | 'otro';
    asunto: string;
    mensaje: string;
    ip_address: string | null;
    user_agent: string | null;
    fecha: string;
    nombre_usuario: string;
    email: string;
  }> }> {
    return this.request<{ messages: Array<{
      id: number;
      id_usuario: number | null;
      tipo: 'consulta' | 'soporte' | 'sugerencia' | 'error' | 'otro';
      asunto: string;
      mensaje: string;
      ip_address: string | null;
      user_agent: string | null;
      fecha: string;
      nombre_usuario: string;
      email: string;
    }> }>('/admin/messages');
  }

  // WooCommerce
  async getWooCommerceProducts(page: number = 1, perPage: number = 10, categoryId?: number): Promise<{
    products: any[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (categoryId !== undefined) qs.append('category', String(categoryId));
    return this.request<{
      products: any[];
      total: number;
      totalPages: number;
      currentPage: number;
    }>(`/woocommerce/products?${qs.toString()}`);
  }

  async getWooCommerceProduct(id: number): Promise<{ product: any }> {
    return this.request<{ product: any }>(`/woocommerce/products/${id}`);
  }

  // Enviar datos al webhook de N8N
  async sendToN8nWebhook(data: {
    product: any;
    prompt_config: any;
    timestamp: string;
  }): Promise<{ success: boolean; message: string; data: any }> {
    return this.request<{ success: boolean; message: string; data: any }>('/n8n/webhook', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Stripe
  async getStripeProducts(): Promise<{ success: boolean; products: StripeProduct[] }> {
    return this.request<{ success: boolean; products: StripeProduct[] }>('/stripe/products');
  }

  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    return this.request<CreatePaymentIntentResponse>('/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmPayment(paymentIntentId: string): Promise<{ success: boolean; message: string; points: number }> {
    return this.request<{ success: boolean; message: string; points: number }>('/stripe/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId }),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    return this.request<{ status: string; message: string; timestamp: string }>('/health');
  }
}

export const apiService = new ApiService();
