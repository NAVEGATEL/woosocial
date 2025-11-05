-- =============================================
-- Migración: Hacer n8n_webhook opcional
-- Fecha: 2024
-- Descripción: Actualizar la tabla preferencias_usuario para hacer n8n_webhook opcional
-- =============================================

USE token_system;

-- Modificar la columna n8n_webhook para permitir valores NULL
ALTER TABLE preferencias_usuario 
MODIFY COLUMN n8n_webhook VARCHAR(500) NULL COMMENT 'URL del webhook de N8N (opcional)';

-- Verificar el cambio
DESCRIBE preferencias_usuario;