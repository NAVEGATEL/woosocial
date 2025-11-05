export type TipoTransaccion = 'compra' | 'venta' | 'bonificacion' | 'penalizacion' | 'reembolso';

export interface Transaccion {
  id: number;
  id_usuario: number;
  tipo: TipoTransaccion;
  descripcion: string;
  cantidad_puntos: number; // Positivo para añadir, negativo para quitar
  fecha: string;
}

export interface CreateTransaccionData {
  id_usuario: number;
  tipo: TipoTransaccion;
  descripcion: string;
  cantidad_puntos: number;
}

export interface TransaccionResponse {
  id: number;
  id_usuario: number;
  tipo: TipoTransaccion;
  descripcion: string;
  cantidad_puntos: number;
  fecha: string;
  usuario?: {
    id: number;
    nombre_usuario: string;
    email: string;
  };
}

export interface TransaccionFilters {
  id_usuario?: number;
  tipo?: TipoTransaccion;
  fecha_desde?: string;
  fecha_hasta?: string;
  limite?: number;
  offset?: number;
}
