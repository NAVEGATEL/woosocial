import crypto from 'crypto';

// Clave de cifrado desde variable de entorno (debe ser de 32 bytes para AES-256)
// Si no está definida, se generará una clave temporal (no recomendado para producción)
let ENCRYPTION_KEY: Buffer;

if (process.env.ENCRYPTION_KEY) {
  const keyHex = process.env.ENCRYPTION_KEY.trim();
  // Validar que sea hexadecimal y de 64 caracteres (32 bytes)
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
    console.warn('⚠️  ENCRYPTION_KEY debe ser de 64 caracteres hexadecimales. Generando clave temporal.');
    ENCRYPTION_KEY = crypto.randomBytes(32);
  } else {
    ENCRYPTION_KEY = Buffer.from(keyHex, 'hex');
  }
} else {
  console.warn('⚠️  ENCRYPTION_KEY no está definida. Generando clave temporal (no recomendado para producción).');
  ENCRYPTION_KEY = crypto.randomBytes(32);
}

// Algoritmo de cifrado
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Longitud del vector de inicialización
const SALT_LENGTH = 64; // Longitud del salt
const TAG_LENGTH = 16; // Longitud del tag de autenticación

/**
 * Cifra un texto usando AES-256-GCM
 * @param text Texto a cifrar
 * @returns Texto cifrado en formato: salt:iv:tag:encryptedData (todos en hex)
 */
export function encrypt(text: string): string {
  if (!text) {
    return text;
  }

  try {
    // Generar salt único para cada cifrado
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derivar clave usando PBKDF2 con el salt
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    
    // Generar IV aleatorio
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Crear cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Cifrar el texto
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Obtener el tag de autenticación
    const tag = cipher.getAuthTag();
    
    // Combinar salt:iv:tag:encryptedData
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error al cifrar:', error);
    throw new Error('Error al cifrar los datos');
  }
}

/**
 * Descifra un texto cifrado con AES-256-GCM
 * @param encryptedText Texto cifrado en formato: salt:iv:tag:encryptedData
 * @returns Texto descifrado
 */
export function decrypt(encryptedText: string | null | undefined): string {
  // Manejar valores null/undefined
  if (encryptedText === null || encryptedText === undefined) {
    return '';
  }

  // Manejar strings vacíos
  if (typeof encryptedText !== 'string' || encryptedText.trim() === '') {
    return encryptedText || '';
  }

  try {
    // Verificar que el formato sea correcto
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
      // Si no tiene el formato correcto, asumimos que no está cifrado (para migración)
      return encryptedText;
    }

    const [saltHex, ivHex, tagHex, encrypted] = parts;
    
    // Validar que todas las partes sean hexadecimales válidas
    if (!saltHex || !ivHex || !tagHex || !encrypted) {
      return encryptedText;
    }

    // Validar formato hexadecimal
    const hexPattern = /^[0-9a-f]+$/i;
    if (!hexPattern.test(saltHex) || !hexPattern.test(ivHex) || 
        !hexPattern.test(tagHex) || !hexPattern.test(encrypted)) {
      return encryptedText;
    }
    
    // Convertir de hex a Buffer
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    // Validar longitudes esperadas
    if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
      return encryptedText;
    }
    
    // Derivar la misma clave usando el salt almacenado
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    
    // Crear decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Descifrar
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Si falla el descifrado, podría ser un valor no cifrado (para migración)
    // Retornamos el texto original sin mostrar error en consola
    return encryptedText;
  }
}

/**
 * Verifica si un texto está cifrado (tiene el formato correcto)
 * @param text Texto a verificar
 * @returns true si está cifrado, false si no
 */
export function isEncrypted(text: string): boolean {
  if (!text) {
    return false;
  }
  const parts = text.split(':');
  return parts.length === 4 && parts.every(part => /^[0-9a-f]+$/i.test(part));
}

