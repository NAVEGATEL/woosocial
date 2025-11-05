# Scripts de Base de Datos

Esta carpeta contiene scripts útiles para gestionar la base de datos del Sistema de Tokens.

## 📁 Archivos Disponibles

### 1. `create-admin-user.sql`
Script SQL para crear el usuario administrador directamente en MySQL.

**Uso:**
```bash
mysql -u root -p < create-admin-user.sql
```

### 2. `create-admin.js`
Script de Node.js para crear/actualizar el usuario administrador.

**Uso:**
```bash
node create-admin.js
```

**Credenciales del admin:**
- Usuario: `admin`
- Contraseña: `admin123`
- Email: `admin@tokensystem.com`
- Puntos: `10,000`

### 3. `create-user.js`
Script de Node.js para crear usuarios adicionales.

**Uso:**
```bash
node create-user.js <nombre_usuario> <email> <contraseña> [puntos] [rol]
```

**Ejemplos:**
```bash
# Crear usuario sin puntos
node create-user.js juan juan@email.com password123

# Crear usuario con 1000 puntos
node create-user.js maria maria@email.com password123 1000

# Crear usuario con rol específico
node create-user.js admin admin@email.com password123 0 admin
```

### 4. `migrate-add-rol.js`
Script de migración para añadir la columna rol a la tabla users.

**Uso:**
```bash
node migrate-add-rol.js
```

### 5. `migrate-add-rol.sql`
Script SQL para migrar la columna rol.

**Uso:**
```bash
mysql -u root -p < migrate-add-rol.sql
```

## 🔧 Configuración

Asegúrate de tener configurado el archivo `.env` con las credenciales de MySQL:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=token_system
DB_PORT=3306
```

## 📊 Funcionalidades

- ✅ Crear usuario administrador
- ✅ Crear usuarios adicionales con roles
- ✅ Verificar usuarios existentes
- ✅ Crear transacciones de bienvenida
- ✅ Mostrar estadísticas de usuarios
- ✅ Validación de datos
- ✅ Migración de base de datos
- ✅ Gestión de roles (admin, usuario, moderador)

## 🚀 Uso Rápido

1. **Crear usuario admin:**
   ```bash
   node create-admin.js
   ```

2. **Crear usuario normal:**
   ```bash
   node create-user.js test test@email.com test123 500
   ```

3. **Crear usuario moderador:**
   ```bash
   node create-user.js mod moderador@email.com mod123 1000 moderador
   ```

4. **Migrar base de datos existente:**
   ```bash
   node migrate-add-rol.js
   ```

5. **Verificar en la base de datos:**
   ```sql
   SELECT * FROM users;
   SELECT * FROM transacciones;
   ```
