## Configuración de MySQL

Esta guía describe cómo se configura y usa MySQL con la aplicación.

### Dónde se configura
- Código: `src/database/connection.ts`
  - Soporta `DB_TYPE=mysql` (por defecto) y `DB_TYPE=sqlite`.
  - Para MySQL, crea pool con `mysql2/promise` y auto-inicializa base y tablas.

### Variables de entorno
```
DB_TYPE=mysql
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=token_system
```

En Docker Compose, `DB_HOST` debe ser `mysql` (nombre del servicio).

### Inicialización automática
`initDatabase()`:
- Verifica conexión.
- Crea base si no existe: `CREATE DATABASE IF NOT EXISTS \`token_system\``.
- Selecciona la base y crea tablas:
  - `users`
  - `transacciones`
  - `preferencias_usuario`
- Crea índices si no existen.

No requiere migraciones manuales para un arranque básico.

### Levantar MySQL en Docker
Usa `docker-compose.yml` (desarrollo) o `docker-compose.prod.yml` (producción). El servicio `mysql` expone el puerto `3306` y persiste datos en el volumen `mysql_data`.

Conexión desde host:
```
host: localhost
port: 3306
user: root
password: password
database: token_system
```

### phpMyAdmin (opcional)
- Disponible en desarrollo en `http://localhost:8080`.
- Host: `mysql` | Usuario: `root` | Password: `password`.

### Problemas comunes
- "Access denied": valida usuario/contraseña y que `MYSQL_ROOT_PASSWORD` coincide con `DB_PASSWORD`.
- Latencia de arranque: la app depende de MySQL; Compose gestiona el orden con `depends_on`, pero espera unos segundos si MySQL recién inicia.


