const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

async function runMigration() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Conectado a la base de datos SQLite');
    });

    // Verificar la estructura actual
    db.all("PRAGMA table_info(preferencias_usuario)", (err, rows) => {
      if (err) {
        console.error('❌ Error al obtener información de la tabla:', err.message);
        reject(err);
        return;
      }

      console.log('\n📋 Estructura actual de la tabla preferencias_usuario:');
      console.table(rows);

      // SQLite no soporta ALTER COLUMN directamente, necesitamos recrear la tabla
      console.log('\n🔄 Iniciando migración...');
      
      // Crear tabla temporal con la nueva estructura
      const createTempTable = `
        CREATE TABLE preferencias_usuario_temp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_usuario INTEGER NOT NULL UNIQUE,
          cliente_key TEXT NOT NULL,
          url_tienda TEXT NOT NULL,
          cliente_secret TEXT NOT NULL,
          n8n_webhook TEXT,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id_usuario) REFERENCES users(id) ON DELETE CASCADE
        )
      `;

      db.run(createTempTable, (err) => {
        if (err) {
          console.error('❌ Error al crear tabla temporal:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Tabla temporal creada');

        // Copiar datos de la tabla original a la temporal
        const copyData = `
          INSERT INTO preferencias_usuario_temp 
          (id, id_usuario, cliente_key, url_tienda, cliente_secret, n8n_webhook, fecha_creacion, fecha_actualizacion)
          SELECT id, id_usuario, cliente_key, url_tienda, cliente_secret, n8n_webhook, fecha_creacion, fecha_actualizacion
          FROM preferencias_usuario
        `;

        db.run(copyData, (err) => {
          if (err) {
            console.error('❌ Error al copiar datos:', err.message);
            reject(err);
            return;
          }
          console.log('✅ Datos copiados a tabla temporal');

          // Eliminar tabla original
          db.run('DROP TABLE preferencias_usuario', (err) => {
            if (err) {
              console.error('❌ Error al eliminar tabla original:', err.message);
              reject(err);
              return;
            }
            console.log('✅ Tabla original eliminada');

            // Renombrar tabla temporal
            db.run('ALTER TABLE preferencias_usuario_temp RENAME TO preferencias_usuario', (err) => {
              if (err) {
                console.error('❌ Error al renombrar tabla:', err.message);
                reject(err);
                return;
              }
              console.log('✅ Tabla renombrada exitosamente');

              // Verificar la nueva estructura
              db.all("PRAGMA table_info(preferencias_usuario)", (err, rows) => {
                if (err) {
                  console.error('❌ Error al verificar nueva estructura:', err.message);
                  reject(err);
                  return;
                }

                console.log('\n📋 Nueva estructura de la tabla preferencias_usuario:');
                console.table(rows);

                console.log('\n🎉 Migración completada exitosamente!');
                console.log('   - El campo n8n_webhook ahora es opcional (NULL permitido)');
                console.log('   - Los usuarios pueden conectar sus tiendas sin configurar N8N');

                db.close((err) => {
                  if (err) {
                    console.error('❌ Error al cerrar la base de datos:', err.message);
                    reject(err);
                    return;
                  }
                  console.log('🔌 Conexión a la base de datos cerrada');
                  resolve();
                });
              });
            });
          });
        });
      });
    });
  });
}

// Ejecutar la migración
runMigration().catch(console.error);
