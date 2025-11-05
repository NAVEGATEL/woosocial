# Inicialización Automática de Base de Datos

## Problema

MySQL solo ejecuta scripts de `/docker-entrypoint-initdb.d/` cuando el volumen de datos está **vacío** (primera inicialización). Si el volumen ya existe de una ejecución anterior, estos scripts no se ejecutan.

## Solución Implementada

Se ha creado un contenedor `init-db` que **siempre** ejecuta el script de inicialización SQL después de que MySQL esté listo, independientemente de si el volumen ya existe o no.

### Componentes

1. **`scripts/init-db-wrapper.sh`**: Script bash que:
   - Espera a que MySQL esté disponible
   - Ejecuta el script SQL de inicialización
   - Maneja errores y warnings correctamente

2. **Servicio `init-db` en docker-compose**: Contenedor que ejecuta el wrapper antes de que la aplicación se inicie.

### Cómo Funciona

1. MySQL se inicia y espera a estar saludable (`service_healthy`)
2. El contenedor `init-db` se ejecuta **una vez** y ejecuta el script SQL
3. La aplicación (`app`) espera a que `init-db` complete exitosamente (`service_completed_successfully`)
4. phpMyAdmin también espera a que `init-db` complete

### Ventajas

- ✅ Se ejecuta en **cada inicio** de docker-compose
- ✅ Funciona incluso si el volumen ya existe
- ✅ Las tablas se crean/actualizan con `CREATE TABLE IF NOT EXISTS`
- ✅ No afecta datos existentes
- ✅ Solo se ejecuta una vez por inicio (`restart: "no"`)

### Uso

Simplemente ejecuta:

```bash
docker compose up -d
```

El contenedor `init-db` se ejecutará automáticamente y luego iniciará la aplicación.

### Ver Logs

Para ver los logs del proceso de inicialización:

```bash
docker compose logs init-db
```

### Compatibilidad

✅ **Linux**: Totalmente compatible. El script usa sintaxis estándar de bash.

✅ **Windows**: Compatible a través de Docker. Docker maneja los finales de línea automáticamente.

✅ **macOS**: Totalmente compatible.

### Notas

- El script usa `--force` para continuar aunque haya warnings (por ejemplo, si las tablas ya existen)
- Se usa codificación UTF-8 (`utf8mb4`) para soportar caracteres especiales
- El script espera hasta 60 segundos a que MySQL esté listo
- Los archivos `.sh` deben tener finales de línea LF (Unix). Git lo maneja automáticamente con `.gitattributes`
- Docker ejecuta el script con `bash` explícitamente, por lo que no requiere permisos de ejecución en el sistema host

### Solución de Problemas

Si el script no se ejecuta en Linux:

1. Verifica que el archivo tenga finales de línea LF:
   ```bash
   file scripts/init-db-wrapper.sh
   # Debe mostrar: scripts/init-db-wrapper.sh: Bourne-Again shell script
   ```

2. Verifica los logs del contenedor:
   ```bash
   docker compose logs init-db
   ```

3. Ejecuta el script manualmente para debug:
   ```bash
   docker compose run --rm init-db bash /scripts/init-db-wrapper.sh
   ```

### Generar Hash Bcrypt para Contraseñas

Si necesitas generar un nuevo hash bcrypt para una contraseña (por ejemplo, para el usuario admin en el script SQL):

```bash
# Generar hash para "admin123" (contraseña por defecto)
node scripts/generate-bcrypt-hash.js admin123

# Generar hash para otra contraseña
node scripts/generate-bcrypt-hash.js mi_contraseña_segura
```

El script generará un hash bcrypt válido usando `saltRounds=10` (igual que la aplicación), que puedes copiar y pegar en el archivo `init-db.sql`.

**Nota**: El hash en `init-db.sql` ya está actualizado con un hash bcrypt válido para la contraseña "admin123".

