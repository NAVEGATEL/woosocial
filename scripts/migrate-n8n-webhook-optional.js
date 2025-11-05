const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'token_system',
  multipleStatements: true
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Iniciando migración: Hacer n8n_webhook opcional...');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');

    // Leer el archivo SQL de migración
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrate-n8n-webhook-optional.sql'), 
      'utf8'
    );

    // Ejecutar la migración
    await connection.execute(migrationSQL);
    console.log('✅ Migración ejecutada exitosamente');

    // Verificar el cambio
    const [rows] = await connection.execute('DESCRIBE preferencias_usuario');
    console.log('\n📋 Estructura actualizada de la tabla preferencias_usuario:');
    console.table(rows);

    console.log('\n🎉 Migración completada exitosamente!');
    console.log('   - El campo n8n_webhook ahora es opcional (NULL permitido)');
    console.log('   - Los usuarios pueden conectar sus tiendas sin configurar N8N');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión a la base de datos cerrada');
    }
  }
}

// Ejecutar la migración
runMigration();