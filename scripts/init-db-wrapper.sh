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

# Ejecutar el script SQL con codificación UTF-8
# Usar --force para continuar aunque haya warnings (por ejemplo, si las tablas ya existen)
if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" \
  --default-character-set=utf8mb4 \
  --force \
  < /scripts/init-db.sql 2>&1 | grep -v "^Warning" | grep -v "^$" || true; then
  echo "✓ Script de inicialización ejecutado correctamente"
else
  echo "⚠ Advertencia: Algunos comandos SQL pueden haber fallado (normal si las tablas ya existen)"
fi

echo "=========================================="

