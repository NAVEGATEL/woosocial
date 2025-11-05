import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';

// Configuración de base de datos
const dbType = process.env.DB_TYPE || 'mysql';

let db: any;
let sqliteDb: sqlite3.Database | null = null;

if (dbType === 'sqlite') {
  // Configuración SQLite
  const dbPath = process.env.DB_PATH || './database.sqlite';
  sqliteDb = new sqlite3.Database(dbPath);
  
  // Habilitar claves foráneas en SQLite
  sqliteDb.run('PRAGMA foreign_keys = ON');
  
  // Wrappers async para métodos de SQLite
  const getAsync = (sql: string, params?: any[]): Promise<any> => {
    return new Promise((resolve, reject) => {
      sqliteDb!.get(sql, params || [], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };
  
  const allAsync = (sql: string, params?: any[]): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      sqliteDb!.all(sql, params || [], (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };
  
  const closeAsync = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      sqliteDb!.close((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };
  
  // Wrapper para run() que maneja correctamente el callback y los resultados
  const runAsync = (sql: string, params?: any[]): Promise<any> => {
    return new Promise((resolve, reject) => {
      sqliteDb!.run(sql, params || [], function(err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  };
  
  // Crear wrapper para execute que sea compatible con MySQL
  db = {
    execute: async (sql: string, params?: any[]): Promise<any> => {
      const upperSql = sql.trim().toUpperCase();
      if (upperSql.startsWith('SELECT')) {
        // Para SELECT, usar all() y retornar formato compatible con MySQL
        const rows = await allAsync(sql, params);
        return [rows];
      } else {
        // Para INSERT/UPDATE/DELETE, usar run() y retornar formato compatible con MySQL
        const result: any = await runAsync(sql, params);
        // Convertir a formato MySQL: { insertId: lastID, ... }
        return [{ insertId: result.lastID, affectedRows: result.changes }];
      }
    },
    get: getAsync,
    all: allAsync,
    close: closeAsync
  };
} else {
  // Configuración MySQL
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'token_system',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
  
  db = mysql.createPool(dbConfig);
}

export { db };

// Función para probar la conexión
export const testConnection = async () => {
  try {
    if (dbType === 'sqlite') {
      // Para SQLite, simplemente ejecutamos una consulta simple
      await db.execute('SELECT 1');
      console.log('Conectado a la base de datos SQLite');
      return true;
    } else {
      // Para MySQL
      const connection = await db.getConnection();
      console.log('Conectado a la base de datos MySQL');
      connection.release();
      return true;
    }
  } catch (err: any) {
    const dbName = dbType === 'sqlite' ? 'SQLite' : 'MySQL';
    console.error(`Error al conectar con la base de datos ${dbName}:`, err.message);
    return false;
  }
};

export const initDatabase = async (): Promise<void> => {
  try {
    // Verificar conexión
    await testConnection();

    if (dbType === 'mysql') {
      // Crear base de datos si no existe (solo MySQL)
      const databaseName = process.env.DB_NAME || 'token_system';
      const createDbQuery = `CREATE DATABASE IF NOT EXISTS \`${databaseName}\``;
      await db.execute(createDbQuery);

      // Usar la base de datos - crear nueva conexión con la base de datos específica
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: databaseName,
        port: parseInt(process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      };
      
      // Recrear la conexión con la base de datos específica
      const mysql = require('mysql2/promise');
      db = mysql.createPool(dbConfig);
    }

    // Tabla de usuarios
    if (dbType === 'sqlite') {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre_usuario TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          contraseña_encriptada TEXT NOT NULL,
          puntos INTEGER DEFAULT 0,
          rol TEXT DEFAULT 'usuario' CHECK(rol IN ('admin', 'usuario', 'moderador')),
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          ultimo_login DATETIME NULL
        )
      `);
    } else {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL UNIQUE,
          contraseña_encriptada VARCHAR(255) NOT NULL,
          puntos INT DEFAULT 0,
          rol ENUM('admin', 'usuario', 'moderador') DEFAULT 'usuario',
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ultimo_login TIMESTAMP NULL
        )
      `);
    }

    // Tabla de transacciones
    if (dbType === 'sqlite') {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS transacciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_usuario INTEGER NOT NULL,
          tipo TEXT NOT NULL CHECK(tipo IN ('compra', 'venta', 'bonificacion', 'penalizacion', 'reembolso')),
          descripcion TEXT NOT NULL,
          cantidad_puntos INTEGER NOT NULL,
          fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id_usuario) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
    } else {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS transacciones (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_usuario INT NOT NULL,
          tipo ENUM('compra', 'venta', 'bonificacion', 'penalizacion', 'reembolso') NOT NULL,
          descripcion TEXT NOT NULL,
          cantidad_puntos INT NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id_usuario) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
    }

    // Tabla de preferencias de usuario
    if (dbType === 'sqlite') {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS preferencias_usuario (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_usuario INTEGER NOT NULL UNIQUE,
          cliente_key TEXT NOT NULL,
          url_tienda TEXT NOT NULL,
          cliente_secret TEXT NOT NULL,
          n8n_webhook TEXT NULL,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id_usuario) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
    } else {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS preferencias_usuario (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_usuario INT NOT NULL UNIQUE,
          cliente_key TEXT NOT NULL,
          url_tienda VARCHAR(500) NOT NULL,
          cliente_secret TEXT NOT NULL,
          n8n_webhook VARCHAR(500) NULL,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (id_usuario) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
    }

    // Índices para mejorar el rendimiento
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_transacciones_usuario ON transacciones (id_usuario)`);
    } catch (e) { /* Índice ya existe */ }
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones (fecha)`);
    } catch (e) { /* Índice ya existe */ }
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones (tipo)`);
    } catch (e) { /* Índice ya existe */ }
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`);
    } catch (e) { /* Índice ya existe */ }

    const dbName = dbType === 'sqlite' ? 'SQLite' : 'MySQL';
    console.log(`Base de datos ${dbName} inicializada correctamente`);
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (dbType === 'sqlite') {
      if (sqliteDb) {
        await new Promise<void>((resolve, reject) => {
          sqliteDb!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('Base de datos SQLite cerrada correctamente');
      }
    } else {
      await db.end();
      console.log('Base de datos MySQL cerrada correctamente');
    }
  } catch (error) {
    const dbName = dbType === 'sqlite' ? 'SQLite' : 'MySQL';
    console.error(`Error al cerrar la base de datos ${dbName}:`, error);
    throw error;
  }
};
