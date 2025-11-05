#!/bin/bash
# ============================================
# init-db-wrapper.sh - Script de inicialización de base de datos
# ============================================
# 
# Este script se ejecuta automáticamente cuando se inicia docker-compose.
# Espera a que MySQL esté listo y luego ejecuta el script SQL de inicialización.
# 
# USO DESPUÉS DE HACER PULL EN OTRO DISPOSITIVO:
# - Se ejecuta automáticamente con docker compose up
# - No necesitas ejecutarlo manualmente
# 
# Si necesitas ejecutarlo manualmente:
#   docker compose run --rm init-db bash /scripts/init-db-wrapper.sh
# 
# COMPATIBILIDAD:
# - Linux: ✅ Totalmente compatible
# - Windows: ✅ Compatible a través de Docker
# - macOS: ✅ Totalmente compatible
#
# ============================================

set -euo pipefail

echo "=========================================="
echo "Inicializando base de datos..."
echo "=========================================="

# Validar variables de entorno requeridas
if [ -z "${DB_HOST:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_PASSWORD:-}" ]; then
  echo "ERROR: Variables de entorno DB_HOST, DB_USER o DB_PASSWORD no están definidas"
  exit 1
fi

echo "Esperando a que MySQL esté listo..."
RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $RETRIES ]; do
  if mysqladmin ping -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" --silent 2>/dev/null; then
    break
  fi
  echo "MySQL no está listo aún, esperando... ($((RETRIES - RETRY_COUNT)) intentos restantes)"
  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep 2
done

if [ $RETRY_COUNT -eq $RETRIES ]; then
  echo "ERROR: MySQL no está disponible después de $((RETRIES * 2)) segundos"
  exit 1
fi

echo "✓ MySQL está listo"
echo "Ejecutando script de inicialización..."

# Configurar variables de entorno para UTF-8
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# Crear un script temporal con configuración UTF-8
TMP_SQL="/tmp/init-db-utf8.sql"

# Copiar el archivo SQL y asegurar codificación UTF-8
# Intentar convertir desde diferentes codificaciones comunes a UTF-8
if command -v iconv >/dev/null 2>&1; then
  # Intentar diferentes codificaciones de origen comunes
  for encoding in UTF-8 ISO-8859-1 Windows-1252; do
    if iconv -f "$encoding" -t UTF-8 /scripts/init-db.sql > "$TMP_SQL" 2>/dev/null; then
      # Verificar que el archivo convertido no esté vacío y contenga caracteres válidos
      if [ -s "$TMP_SQL" ] && grep -q "contraseña_encriptada" "$TMP_SQL" 2>/dev/null; then
        break
      fi
    fi
  done
  # Si ninguna conversión funcionó, usar el archivo original
  if [ ! -f "$TMP_SQL" ] || [ ! -s "$TMP_SQL" ]; then
    cp /scripts/init-db.sql "$TMP_SQL"
  fi
else
  cp /scripts/init-db.sql "$TMP_SQL"
fi

# Ejecutar el script SQL con codificación UTF-8 explícita
# Primero configurar MySQL para usar UTF-8, luego ejecutar el script
{
  echo "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;"
  echo "SET CHARACTER SET utf8mb4;"
  cat "$TMP_SQL"
} | mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" \
  --default-character-set=utf8mb4 \
  --force \
  2>&1 | while IFS= read -r line || [ -n "$line" ]; do
    # Filtrar warnings y líneas vacías, pero mostrar errores
    if [[ ! "$line" =~ ^Warning ]] && [[ ! "$line" =~ ^mysql:.*Warning ]] && [[ ! -z "$line" ]]; then
      echo "$line"
    fi
  done

# Capturar el código de salida de mysql
mysql_exit_code=${PIPESTATUS[0]}

# Limpiar archivo temporal
rm -f "$TMP_SQL"

# Verificar resultado
if [ $mysql_exit_code -eq 0 ]; then
  echo "✓ Script de inicialización ejecutado correctamente"
else
  echo "⚠ Error al ejecutar el script SQL (código: $mysql_exit_code)"
  echo "Revisa los logs anteriores para más detalles"
  exit $mysql_exit_code
fi

echo "=========================================="

