import bcrypt from 'bcryptjs';
import { db } from '../database/connection';
import { User, CreateUserData, UpdateUserData, LoginData, UserResponse } from '../models/User';

export class UserService {
  static async createUser(userData: CreateUserData): Promise<UserResponse> {
    const { nombre_usuario, email, contraseña, rol = 'usuario' } = userData;
    
    // Verificar si el usuario ya existe
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    const existingUsername = await this.getUserByUsername(nombre_usuario);
    if (existingUsername) {
      throw new Error('El nombre de usuario ya está en uso');
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const contraseña_encriptada = await bcrypt.hash(contraseña, saltRounds);

    const sql = `
      INSERT INTO users (nombre_usuario, email, contraseña_encriptada, puntos, rol)
      VALUES (?, ?, ?, 0, ?)
    `;
    
    const [result] = await db.execute(sql, [nombre_usuario, email, contraseña_encriptada, rol]) as any;
    
    return {
      id: result.insertId,
      nombre_usuario,
      email,
      puntos: 0,
      rol,
      fecha_creacion: new Date().toISOString(),
      ultimo_login: null
    };
  }

  static async getUserById(id: number): Promise<UserResponse | null> {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const [rows] = await db.execute(sql, [id]) as any[];
    
    if (rows.length === 0) {
      return null;
    }
    
    const { contraseña_encriptada, ...userResponse } = rows[0];
    return userResponse;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await db.execute(sql, [email]) as any[];
    
    return rows.length > 0 ? rows[0] : null;
  }

  static async getUserByUsername(nombre_usuario: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE nombre_usuario = ?';
    const [rows] = await db.execute(sql, [nombre_usuario]) as any[];
    
    return rows.length > 0 ? rows[0] : null;
  }

  static async updateUser(id: number, userData: UpdateUserData): Promise<UserResponse | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (userData.nombre_usuario) {
      fields.push('nombre_usuario = ?');
      values.push(userData.nombre_usuario);
    }

    if (userData.email) {
      fields.push('email = ?');
      values.push(userData.email);
    }

    if (userData.contraseña) {
      const saltRounds = 10;
      const contraseña_encriptada = await bcrypt.hash(userData.contraseña, saltRounds);
      fields.push('contraseña_encriptada = ?');
      values.push(contraseña_encriptada);
    }

    if (userData.puntos !== undefined) {
      fields.push('puntos = ?');
      values.push(userData.puntos);
    }

    if (userData.rol) {
      fields.push('rol = ?');
      values.push(userData.rol);
    }

    if (fields.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await db.execute(sql, values) as any;
    
    if (result.affectedRows === 0) {
      return null;
    }

    return this.getUserById(id);
  }

  static async deleteUser(id: number): Promise<boolean> {
    const sql = 'DELETE FROM users WHERE id = ?';
    const [result] = await db.execute(sql, [id]) as any;
    
    return result.affectedRows > 0;
  }

  static async getAllUsers(): Promise<UserResponse[]> {
    const sql = 'SELECT id, nombre_usuario, email, puntos, rol, fecha_creacion, ultimo_login FROM users ORDER BY fecha_creacion DESC';
    const [rows] = await db.execute(sql) as any[];
    
    return rows;
  }

  static async updateLastLogin(id: number): Promise<void> {
    const sql = 'UPDATE users SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?';
    await db.execute(sql, [id]);
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async login(loginData: LoginData): Promise<UserResponse | null> {
    console.log(`[USER_SERVICE] Intentando login para email: ${loginData.email}`);
    
    const user = await this.getUserByEmail(loginData.email);
    console.log(`[USER_SERVICE] Usuario encontrado: ${!!user}`);
    
    if (!user) {
      console.log('[USER_SERVICE] Usuario no encontrado');
      return null;
    }

    console.log(`[USER_SERVICE] Verificando contraseña para usuario: ${user.nombre_usuario}`);
    const isValidPassword = await this.verifyPassword(loginData.contraseña, user.contraseña_encriptada);
    console.log(`[USER_SERVICE] Contraseña válida: ${isValidPassword}`);
    
    if (!isValidPassword) {
      console.log('[USER_SERVICE] Contraseña incorrecta');
      return null;
    }

    await this.updateLastLogin(user.id);

    const { contraseña_encriptada, ...userResponse } = user;
    console.log(`[USER_SERVICE] Login exitoso para usuario: ${userResponse.nombre_usuario}`);
    return userResponse;
  }
}