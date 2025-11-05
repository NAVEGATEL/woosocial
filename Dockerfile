# ============================================
# Dockerfile - Configuración de contenedores Docker
# ============================================
# 
# Este archivo define las imágenes Docker para desarrollo y producción.
# 
# USO DESPUÉS DE HACER PULL EN OTRO DISPOSITIVO:
# 
# 1. Desarrollo:
#    docker compose up --build
#    - Construye la imagen de desarrollo
#    - Inicia todos los servicios (app, MySQL, phpMyAdmin)
#    - La app estará disponible en http://localhost:3000
#    - La API estará disponible en http://localhost:3001
# 
# 2. Producción:
#    docker compose -f docker-compose.prod.yml up --build
#    - Construye la imagen optimizada de producción
#    - Solo incluye dependencias necesarias
# 
# NOTAS:
# - Las imágenes se construyen automáticamente con docker compose
# - No necesitas ejecutar 'docker build' manualmente
# - El Dockerfile usa multi-stage builds para optimizar el tamaño
#
# ============================================

# Imagen base para construir y ejecutar la app
FROM node:20-alpine AS base

WORKDIR /app

# Instalar dependencias del sistema si hiciera falta (mysql client opcional)
RUN apk add --no-cache bash

# Copiar archivos de proyecto
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar resto del código
COPY . .

# --------- Etapa de desarrollo ---------
FROM base AS dev
ENV NODE_ENV=development

# Exponer puertos de dev (API 3001, Vite 3000)
EXPOSE 3001 3000

# Comando directo para desarrollo
CMD ["npm", "run", "dev"]

# --------- Etapa de build (producción) ---------
FROM base AS build
ENV NODE_ENV=production

# Construir server y client
RUN npm run build

# --------- Imagen final de producción ---------
FROM node:20-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copiar artefactos de build
COPY --from=build /app/dist ./dist
COPY .env* ./  # opcional si quieres inyectar variables de entorno en runtime (no recomendado en imagenes públicas)

EXPOSE 3001

CMD ["node", "dist/server.js"]


