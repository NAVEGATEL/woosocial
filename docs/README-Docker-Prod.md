## Producción con Docker

Esta guía explica cómo construir y ejecutar la aplicación en modo producción con Docker.

### Archivos relevantes
- `Dockerfile` (objetivos `build` y `prod`)
- `docker-compose.prod.yml`
- `.dockerignore`

### Variables de entorno
Define variables (idealmente en tu orquestador/secret manager). Para pruebas locales puedes usar `.env`:

```
NODE_ENV=production
PORT=3001

DB_TYPE=mysql
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=token_system
```

### Levantar en producción (local)

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- API: `http://localhost:3001/api`

### Imagen de producción
La imagen final `prod` instala solo dependencias de runtime y ejecuta:

```bash
node dist/server.js
```

El `dist/` es generado en la etapa `build` (`npm run build`).

### Comandos útiles
```bash
# Ver logs en background
docker compose -f docker-compose.prod.yml logs -f app

# Reconstruir
docker compose -f docker-compose.prod.yml up --build -d

# Parar y borrar
docker compose -f docker-compose.prod.yml down -v
```

### Consideraciones de seguridad
- No copies `.env` dentro de la imagen final. Inyéctalo como variables en runtime.
- Configura CORS para tu dominio en `src/server.ts` o por variable de entorno.
- Usa contraseñas fuertes y volúmenes cifrados para MySQL en entornos sensibles.


