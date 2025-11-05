import { db } from '../database/connection';
import { PreferenciasService } from './preferenciasService';

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: any[];
  default_attributes: any[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: any[];
}

export interface WooCommerceProductsResponse {
  products: WooCommerceProduct[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export class WooCommerceService {
  static async getProductsByUserId(userId: number, page: number = 1, perPage: number = 10, categoryId?: number): Promise<WooCommerceProductsResponse> {
    try {
      // Obtener las preferencias del usuario
      const preferencias = await PreferenciasService.getPreferenciasByUserId(userId);
      
      if (!preferencias) {
        throw new Error('Usuario no tiene preferencias de WooCommerce configuradas');
      }

      // Construir la URL de la API de WooCommerce
      const baseUrl = preferencias.url_tienda.replace(/\/$/, ''); // Remover barra final si existe
      const apiUrl = `${baseUrl}/wp-json/wc/v3/products`;
      
      // Parámetros de consulta
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        consumer_key: preferencias.cliente_key,
        consumer_secret: preferencias.cliente_secret
      });
      if (categoryId !== undefined) {
        params.append('category', String(categoryId));
      }

      const response = await fetch(`${apiUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error de WooCommerce: ${response.status} ${response.statusText}`);
      }

      const products = await response.json();
      
      // Obtener información de paginación de los headers
      const total = parseInt(response.headers.get('X-WP-Total') || '0');
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0');

      return {
        products,
        total,
        totalPages,
        currentPage: page
      };
    } catch (error) {
      console.error('Error al obtener productos de WooCommerce:', error);
      throw error;
    }
  }

  static async getProductById(userId: number, productId: number): Promise<WooCommerceProduct> {
    try {
      const preferencias = await PreferenciasService.getPreferenciasByUserId(userId);
      
      if (!preferencias) {
        throw new Error('Usuario no tiene preferencias de WooCommerce configuradas');
      }

      const baseUrl = preferencias.url_tienda.replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wp-json/wc/v3/products/${productId}`;
      
      const params = new URLSearchParams({
        consumer_key: preferencias.cliente_key,
        consumer_secret: preferencias.cliente_secret
      });

      const response = await fetch(`${apiUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error de WooCommerce: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al obtener producto de WooCommerce:', error);
      throw error;
    }
  }

  static async testConnection(userId: number): Promise<boolean> {
    try {
      await this.getProductsByUserId(userId, 1, 1);
      return true;
    } catch (error) {
      return false;
    }
  }
}


