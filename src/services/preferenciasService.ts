import { db } from '../database/connection';
import { PreferenciasUsuario, CreatePreferenciasData, UpdatePreferenciasData, PreferenciasResponse } from '../models/PreferenciasUsuario';
import { UserService } from './userService';

export class PreferenciasService {
  static async createPreferencias(preferenciasData: CreatePreferenciasData): Promise<PreferenciasResponse> {
    // Verificar que el usuario existe
    const user = await UserService.getUserById(preferenciasData.id_usuario);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar que el usuario no tenga preferencias ya configuradas
    const existingPreferencias = await this.getPreferenciasByUserId(preferenciasData.id_usuario);
    if (existingPreferencias) {
      throw new Error('El usuario ya tiene preferencias configuradas');
    }

    const sql = `
      INSERT INTO preferencias_usuario (id_usuario, cliente_key, url_tienda, cliente_secret, n8n_webhook, n8n_redes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(sql, [
      preferenciasData.id_usuario,
      preferenciasData.cliente_key,
      preferenciasData.url_tienda,
      preferenciasData.cliente_secret,
      preferenciasData.n8n_webhook,
      preferenciasData.n8n_redes || null
    ]) as any;

    return {
      id: result.insertId,
      id_usuario: preferenciasData.id_usuario,
      cliente_key: preferenciasData.cliente_key,
      url_tienda: preferenciasData.url_tienda,
      cliente_secret: preferenciasData.cliente_secret,
      n8n_webhook: preferenciasData.n8n_webhook,
      n8n_redes: preferenciasData.n8n_redes,
      usuario: {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        email: user.email
      }
    };
  }

  static async getPreferenciasById(id: number): Promise<PreferenciasResponse | null> {
    const sql = `
      SELECT p.*, u.nombre_usuario, u.email
      FROM preferencias_usuario p
      LEFT JOIN users u ON p.id_usuario = u.id
      WHERE p.id = ?
    `;
    
    const [rows] = await db.execute(sql, [id]) as any[];
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      id_usuario: row.id_usuario,
      cliente_key: row.cliente_key,
      url_tienda: row.url_tienda,
      cliente_secret: row.cliente_secret,
      n8n_webhook: row.n8n_webhook,
      n8n_redes: row.n8n_redes || undefined,
      usuario: {
        id: row.id_usuario,
        nombre_usuario: row.nombre_usuario,
        email: row.email
      }
    };
  }

  static async getPreferenciasByUserId(id_usuario: number): Promise<PreferenciasResponse | null> {
    const sql = `
      SELECT p.*, u.nombre_usuario, u.email
      FROM preferencias_usuario p
      LEFT JOIN users u ON p.id_usuario = u.id
      WHERE p.id_usuario = ?
    `;
    
    const [rows] = await db.execute(sql, [id_usuario]) as any[];
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      id_usuario: row.id_usuario,
      cliente_key: row.cliente_key,
      url_tienda: row.url_tienda,
      cliente_secret: row.cliente_secret,
      n8n_webhook: row.n8n_webhook,
      n8n_redes: row.n8n_redes || undefined,
      usuario: {
        id: row.id_usuario,
        nombre_usuario: row.nombre_usuario,
        email: row.email
      }
    };
  }

  static async updatePreferencias(id_usuario: number, preferenciasData: UpdatePreferenciasData): Promise<PreferenciasResponse | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (preferenciasData.cliente_key) {
      fields.push('cliente_key = ?');
      values.push(preferenciasData.cliente_key);
    }

    if (preferenciasData.url_tienda) {
      fields.push('url_tienda = ?');
      values.push(preferenciasData.url_tienda);
    }

    if (preferenciasData.cliente_secret) {
      fields.push('cliente_secret = ?');
      values.push(preferenciasData.cliente_secret);
    }

    if (preferenciasData.n8n_webhook) {
      fields.push('n8n_webhook = ?');
      values.push(preferenciasData.n8n_webhook);
    }

    if (preferenciasData.n8n_redes !== undefined) {
      fields.push('n8n_redes = ?');
      values.push(preferenciasData.n8n_redes || null);
    }

    if (fields.length === 0) {
      return this.getPreferenciasByUserId(id_usuario);
    }

    values.push(id_usuario);

    const sql = `UPDATE preferencias_usuario SET ${fields.join(', ')} WHERE id_usuario = ?`;
    const [result] = await db.execute(sql, values) as any;
    
    if (result.affectedRows === 0) {
      return null;
    }

    return this.getPreferenciasByUserId(id_usuario);
  }

  static async deletePreferencias(id_usuario: number): Promise<boolean> {
    const sql = 'DELETE FROM preferencias_usuario WHERE id_usuario = ?';
    const [result] = await db.execute(sql, [id_usuario]) as any;
    
    return result.affectedRows > 0;
  }

  static async getAllPreferencias(): Promise<PreferenciasResponse[]> {
    const sql = `
      SELECT p.*, u.nombre_usuario, u.email
      FROM preferencias_usuario p
      LEFT JOIN users u ON p.id_usuario = u.id
      ORDER BY p.id DESC
    `;
    
    const [rows] = await db.execute(sql) as any[];
    
    return rows.map((row: any) => ({
      id: row.id,
      id_usuario: row.id_usuario,
      cliente_key: row.cliente_key,
      url_tienda: row.url_tienda,
      cliente_secret: row.cliente_secret,
      n8n_webhook: row.n8n_webhook,
      n8n_redes: row.n8n_redes || undefined,
      usuario: {
        id: row.id_usuario,
        nombre_usuario: row.nombre_usuario,
        email: row.email
      }
    }));
  }

  static async validateWooCommerceConnection(preferencias: PreferenciasResponse): Promise<boolean> {
    try {
      // Aquí podrías implementar una validación real de la conexión con WooCommerce
      // Por ahora, solo validamos que los campos principales estén presentes
      return !!(
        preferencias.cliente_key &&
        preferencias.url_tienda &&
        preferencias.cliente_secret
      );
    } catch (error) {
      return false;
    }
  }

  static async testN8nWebhook(webhookUrl: string): Promise<boolean> {
    try {
      // Aquí podrías implementar una prueba real del webhook de n8n
      // Por ahora, solo validamos que sea una URL válida
      const url = new URL(webhookUrl);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }
}