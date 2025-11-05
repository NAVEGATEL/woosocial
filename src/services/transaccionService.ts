import { db } from '../database/connection';
import { Transaccion, CreateTransaccionData, TransaccionResponse, TransaccionFilters } from '../models/Transaccion';
import { UserService } from './userService';

export class TransaccionService {
  static async createTransaccion(transaccionData: CreateTransaccionData): Promise<TransaccionResponse> {
    // Verificar que el usuario existe
    const user = await UserService.getUserById(transaccionData.id_usuario);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const sql = `
      INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos)
      VALUES (?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(sql, [
      transaccionData.id_usuario,
      transaccionData.tipo,
      transaccionData.descripcion,
      transaccionData.cantidad_puntos
    ]) as any;

    // Actualizar puntos del usuario
    const newPuntos = user.puntos + transaccionData.cantidad_puntos;
    await UserService.updateUser(transaccionData.id_usuario, { puntos: newPuntos });

    return {
      id: result.insertId,
      id_usuario: transaccionData.id_usuario,
      tipo: transaccionData.tipo,
      descripcion: transaccionData.descripcion,
      cantidad_puntos: transaccionData.cantidad_puntos,
      fecha: new Date().toISOString(),
      usuario: {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        email: user.email
      }
    };
  }

  static async getTransaccionById(id: number): Promise<TransaccionResponse | null> {
    const sql = `
      SELECT t.*, u.nombre_usuario, u.email
      FROM transacciones t
      LEFT JOIN users u ON t.id_usuario = u.id
      WHERE t.id = ?
    `;
    
    const [rows] = await db.execute(sql, [id]) as any[];
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      id_usuario: row.id_usuario,
      tipo: row.tipo,
      descripcion: row.descripcion,
      cantidad_puntos: row.cantidad_puntos,
      fecha: row.fecha,
      usuario: {
        id: row.id_usuario,
        nombre_usuario: row.nombre_usuario,
        email: row.email
      }
    };
  }

  static async getTransaccionesByUser(id_usuario: number, filters?: TransaccionFilters): Promise<TransaccionResponse[]> {
    let sql = `
      SELECT t.*, u.nombre_usuario, u.email
      FROM transacciones t
      LEFT JOIN users u ON t.id_usuario = u.id
      WHERE t.id_usuario = ?
    `;
    const params: any[] = [id_usuario];

    if (filters?.tipo) {
      sql += ' AND t.tipo = ?';
      params.push(filters.tipo);
    }

    if (filters?.fecha_desde) {
      sql += ' AND t.fecha >= ?';
      params.push(filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      sql += ' AND t.fecha <= ?';
      params.push(filters.fecha_hasta);
    }

    sql += ' ORDER BY t.fecha DESC';

    if (filters?.limite) {
      sql += ' LIMIT ?';
      params.push(filters.limite);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const [rows] = await db.execute(sql, params) as any[];
    
    return rows.map((row: any) => ({
      id: row.id,
      id_usuario: row.id_usuario,
      tipo: row.tipo,
      descripcion: row.descripcion,
      cantidad_puntos: row.cantidad_puntos,
      fecha: row.fecha,
      usuario: {
        id: row.id_usuario,
        nombre_usuario: row.nombre_usuario,
        email: row.email
      }
    }));
  }

  static async getAllTransacciones(filters?: TransaccionFilters): Promise<TransaccionResponse[]> {
    let sql = `
      SELECT t.*, u.nombre_usuario, u.email
      FROM transacciones t
      LEFT JOIN users u ON t.id_usuario = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.id_usuario) {
      sql += ' AND t.id_usuario = ?';
      params.push(filters.id_usuario);
    }

    if (filters?.tipo) {
      sql += ' AND t.tipo = ?';
      params.push(filters.tipo);
    }

    if (filters?.fecha_desde) {
      sql += ' AND t.fecha >= ?';
      params.push(filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      sql += ' AND t.fecha <= ?';
      params.push(filters.fecha_hasta);
    }

    sql += ' ORDER BY t.fecha DESC';

    if (filters?.limite) {
      sql += ' LIMIT ?';
      params.push(filters.limite);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const [rows] = await db.execute(sql, params) as any[];
    
    return rows.map((row: any) => ({
      id: row.id,
      id_usuario: row.id_usuario,
      tipo: row.tipo,
      descripcion: row.descripcion,
      cantidad_puntos: row.cantidad_puntos,
      fecha: row.fecha,
      usuario: {
        id: row.id_usuario,
        nombre_usuario: row.nombre_usuario,
        email: row.email
      }
    }));
  }

  static async deleteTransaccion(id: number): Promise<boolean> {
    // Primero obtener la transacción para revertir los puntos
    const transaccion = await this.getTransaccionById(id);
    if (!transaccion) {
      return false;
    }

    const sql = 'DELETE FROM transacciones WHERE id = ?';
    const [result] = await db.execute(sql, [id]) as any;
    
    if (result.affectedRows > 0) {
      // Revertir los puntos del usuario
      const user = await UserService.getUserById(transaccion.id_usuario);
      if (user) {
        const newPuntos = user.puntos - transaccion.cantidad_puntos;
        await UserService.updateUser(transaccion.id_usuario, { puntos: newPuntos });
      }
      return true;
    }
    
    return false;
  }

  static async getTransaccionesStats(id_usuario?: number): Promise<{
    total_transacciones: number;
    total_puntos_ganados: number;
    total_puntos_gastados: number;
    balance_actual: number;
  }> {
    console.log(`[TRANSACTION_SERVICE] Obteniendo estadísticas para usuario: ${id_usuario}`);
    
    let sql = `
      SELECT 
        COUNT(*) as total_transacciones,
        COALESCE(SUM(CASE WHEN cantidad_puntos > 0 THEN cantidad_puntos ELSE 0 END), 0) as total_puntos_ganados,
        COALESCE(SUM(CASE WHEN cantidad_puntos < 0 THEN ABS(cantidad_puntos) ELSE 0 END), 0) as total_puntos_gastados,
        COALESCE(SUM(cantidad_puntos), 0) as balance_actual
      FROM transacciones
    `;
    const params: any[] = [];

    if (id_usuario) {
      sql += ' WHERE id_usuario = ?';
      params.push(id_usuario);
    }

    console.log(`[TRANSACTION_SERVICE] SQL: ${sql}`);
    console.log(`[TRANSACTION_SERVICE] Params:`, params);

    try {
      const [rows] = await db.execute(sql, params) as any[];
      console.log(`[TRANSACTION_SERVICE] Resultado de la consulta:`, rows);
      
      const row = rows[0];
      console.log(`[TRANSACTION_SERVICE] Primera fila:`, row);
      
      // Asegurar que todos los valores sean números (manejar null explícitamente)
      const result = {
        total_transacciones: Number(row.total_transacciones) || 0,
        total_puntos_ganados: Number(row.total_puntos_ganados) || 0,
        total_puntos_gastados: Number(row.total_puntos_gastados) || 0,
        balance_actual: Number(row.balance_actual) || 0
      };
      
      console.log(`[TRANSACTION_SERVICE] Estadísticas calculadas:`, result);
      return result;
    } catch (error) {
      console.log(`[TRANSACTION_SERVICE] Error en la consulta SQL:`, error);
      throw error;
    }
  }

}