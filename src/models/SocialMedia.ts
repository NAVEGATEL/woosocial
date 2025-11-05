export type SocialPlatformId = 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube' | 'linkedin' | 'pinterest';

export interface SocialMediaCredential {
  id: number;
  id_usuario: number;
  plataforma: SocialPlatformId;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null; // ISO string
  app_id: string | null;
  app_secret: string | null;
  username: string | null;
  account_id: string | null;
  is_active: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface UpsertSocialCredentialRequest {
  plataforma: SocialPlatformId;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string | null; // ISO string or null
  app_id?: string;
  app_secret?: string;
  username?: string;
  account_id?: string;
  is_active?: boolean;
}

export interface SocialConnectionsResponse {
  connections: Array<{
    plataforma: SocialPlatformId;
    connected: boolean;
    username: string | null;
    account_id: string | null;
  }>;
}

