const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateTable() {
  let connection;
  
  try {
    console.log('🔄 Actualizando tabla preferencias_usuario en MySQL...');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'token_system',
      multipleStatements: true
    });
    
    console.log('✅ Conectado a MySQL');

    // Actualizar la tabla para hacer n8n_webhook opcional
    await connection.execute(`
      ALTER TABLE preferencias_usuario 
      MODIFY COLUMN n8n_webhook VARCHAR(500) NULL COMMENT 'URL del webhook de N8N (opcional)'
    `);
    
    console.log('✅ Campo n8n_webhook actualizado a NULL');

    // Agregar campos de fecha si no existen
    try {
      await connection.execute(`
        ALTER TABLE preferencias_usuario 
        ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación de las preferencias'
      `);
      console.log('✅ Campo fecha_creacion agregado');
    } catch (e) {
      console.log('ℹ️ Campo fecha_creacion ya existe');
    }

    try {
      await connection.execute(`
        ALTER TABLE preferencias_usuario 
        ADD COLUMN fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización'
      `);
      console.log('✅ Campo fecha_actualizacion agregado');
    } catch (e) {
      console.log('ℹ️ Campo fecha_actualizacion ya existe');
    }

    // Verificar la estructura actualizada
    const [rows] = await connection.execute('DESCRIBE preferencias_usuario');
    console.log('\n📋 Estructura actualizada de la tabla preferencias_usuario:');
    console.table(rows);

    console.log('\n🎉 Actualización completada exitosamente!');
    console.log('   - El campo n8n_webhook ahora permite valores NULL');
    console.log('   - Los usuarios pueden actualizar sus preferencias sin problemas');

  } catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión a MySQL cerrada');
    }
  }
}

// Ejecutar la actualización
updateTable();
