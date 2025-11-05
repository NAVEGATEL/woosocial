## Desarrollo con Docker

Esta guía explica cómo levantar el entorno de desarrollo usando Docker y Docker Compose.

### Requisitos
- Docker Desktop (WSL2 recomendado en Windows)
- Node 20 (opcional, solo si quieres ejecutar fuera de Docker)

### Archivos relevantes
- `Dockerfile` (objetivo `dev`)
- `docker-compose.yml`
- `docker-entrypoint.sh`
- `.dockerignore`

### Variables de entorno
Crea un archivo `.env` en la raíz con al menos:

```
NODE_ENV=development
PORT=3001

DB_TYPE=mysql
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=token_system
```

Nota: En Docker, `DB_HOST` debe ser `mysql` (nombre del servicio en Compose).

### Levantar el stack (API + Vite + MySQL + phpMyAdmin)

```bash
docker compose up --build
```

- API: `http://localhost:3001/api`
- Frontend (Vite dev): `http://localhost:3000`
- phpMyAdmin: `http://localhost:8080` (host `mysql`, user `root`, pass `password`)

### Hot reload
En desarrollo se monta el código fuente como volumen. Los cambios en `src/` se reflejan automáticamente gracias a `nodemon` (backend) y Vite (frontend).

### Comandos útiles
```bash
# Ver logs
docker compose logs -f app
docker compose logs -f mysql

# Reconstruir tras cambios en dependencias
docker compose up --build

# Parar y eliminar contenedores y volúmenes
docker compose down -v
```

### Solución de problemas
- Si Vite no carga en Windows, verifica que Docker Desktop use WSL2 y que el puerto 5173 no esté ocupado.
- Si la API no conecta a MySQL, confirma que `DB_HOST=mysql` y que el contenedor `mysql` esté saludable.


