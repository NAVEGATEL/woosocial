## Variables de entorno

Esta guía lista las variables de entorno usadas por la aplicación y su efecto.

### Aplicación
- `NODE_ENV`: `development` | `production`. Determina si se ejecuta `npm run dev` o `npm start` en Docker.
- `PORT`: Puerto del servidor Express (por defecto `5000`).

### Base de datos
- `DB_TYPE`: `mysql` (por defecto) o `sqlite`.
- `DB_HOST`: Host de la base (en Docker, `mysql`).
- `DB_PORT`: Puerto de MySQL (por defecto `3306`).
- `DB_USER`: Usuario de MySQL.
- `DB_PASSWORD`: Password de MySQL.
- `DB_NAME`: Nombre de la base. Se crea automáticamente si no existe.
- `DB_PATH` (solo `sqlite`): Ruta del archivo SQLite (por defecto `./database.sqlite`).

### CORS y seguridad
- La configuración de CORS en `src/server.ts` permite todos los orígenes en desarrollo y restringe en producción. Considera parametrizar el dominio permitido mediante una variable (ej: `CORS_ORIGIN`).

### Cifrado
- `ENCRYPTION_KEY`: Clave de cifrado de 32 bytes (64 caracteres hex) para cifrar datos sensibles como `cliente_key` y `cliente_secret` en preferencias. 
  - **IMPORTANTE**: Esta clave es crítica para la seguridad. Debe ser:
    - Única para cada entorno (desarrollo/producción)
    - Mantenida en secreto
    - Nunca compartida ni versionada
    - De 64 caracteres hexadecimales (32 bytes)
  - Si no se proporciona, se generará una clave temporal (solo para desarrollo, no recomendado para producción).
  - Para generar una clave segura, ejecuta: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Ejemplo de `.env` (desarrollo Docker)
```
NODE_ENV=development
PORT=5000

DB_TYPE=mysql
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=token_system
ENCRYPTION_KEY=tu_clave_de_64_caracteres_hexadecimales_aqui_genera_una_nueva_para_cada_entorno
```

### Ejemplo de `.env` (producción local)
```
NODE_ENV=production
PORT=5000

DB_TYPE=mysql
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=cambia-esta-password
DB_NAME=token_system

# Clave de cifrado (generar una nueva con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=tu_clave_de_64_caracteres_hexadecimales_aqui_genera_una_nueva_para_cada_entorno
```


