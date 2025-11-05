#!/usr/bin/env node
/**
 * ============================================
 * generate-bcrypt-hash.js - Generador de hash bcrypt
 * ============================================
 * 
 * Este script genera hashes bcrypt para contraseñas usando la misma
 * configuración que la aplicación (saltRounds=10).
 * 
 * USO DESPUÉS DE HACER PULL EN OTRO DISPOSITIVO:
 * 
 * 1. Generar hash para contraseña por defecto "admin123":
 *    node scripts/generate-bcrypt-hash.js admin123
 * 
 * 2. Generar hash para otra contraseña:
 *    node scripts/generate-bcrypt-hash.js mi_contraseña_segura
 * 
 * 3. Copiar el hash generado y pegarlo en scripts/init-db.sql
 *    (reemplazar el hash existente en el INSERT del usuario admin)
 * 
 * EJEMPLO DE SALIDA:
 *    Hash generado: $2a$10$bGh8MbtCTcJLUKALgMn2tO...
 * 
 * NOTA: El hash en init-db.sql ya está actualizado con un hash válido
 * para la contraseña "admin123". Solo necesitas ejecutar este script
 * si quieres cambiar la contraseña del usuario admin.
 * 
 * ============================================
 */

const bcrypt = require('bcryptjs');

async function generateHash(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function main() {
  const password = process.argv[2] || 'admin123';
  
  console.log('Generando hash bcrypt...');
  console.log(`Contraseña: ${password}`);
  
  const hash = await generateHash(password);
  
  console.log('\nHash generado:');
  console.log(hash);
  console.log('\nPara usar en SQL:');
  console.log(`'${hash}'`);
  console.log('\nEjemplo de INSERT:');
  console.log(`INSERT INTO users (nombre_usuario, email, contraseña_encriptada, puntos, rol) VALUES`);
  console.log(`('admin', 'admin@ejemplo.com', '${hash}', 1000, 'admin');`);
}

main().catch(console.error);

