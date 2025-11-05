export interface PreferenciasUsuario {
  id: number;
  id_usuario: number;
  cliente_key: string;
  url_tienda: string;
  cliente_secret: string;
  n8n_webhook: string;
  n8n_redes?: string;
}

export interface CreatePreferenciasData {
  id_usuario: number;
  cliente_key: string;
  url_tienda: string;
  cliente_secret: string;
  n8n_webhook: string;
  n8n_redes?: string;
}

export interface UpdatePreferenciasData {
  cliente_key?: string;
  url_tienda?: string;
  cliente_secret?: string;
  n8n_webhook?: string;
  n8n_redes?: string;
}

export interface PreferenciasResponse {
  id: number;
  id_usuario: number;
  cliente_key: string;
  url_tienda: string;
  cliente_secret: string;
  n8n_webhook: string;
  n8n_redes?: string;
  usuario?: {
    id: number;
    nombre_usuario: string;
    email: string;
  };
}
