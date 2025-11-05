-- ============================================
-- init-db.sql - Script de inicialización de base de datos
-- ============================================
-- 
-- Este script crea la base de datos y todas las tablas necesarias.
-- Se ejecuta automáticamente cuando se inicia docker-compose.
-- 
-- USO DESPUÉS DE HACER PULL EN OTRO DISPOSITIVO:
-- - Se ejecuta automáticamente con docker compose up
-- - No necesitas ejecutarlo manualmente
-- 
-- Si necesitas ejecutarlo manualmente:
--   docker exec -i n8n-mysql mysql -uroot -pnavega < scripts/init-db.sql
-- 
-- CONTENIDO:
-- - Crea la base de datos 'token_system'
-- - Crea todas las tablas necesarias (users, transacciones, etc.)
-- - Crea vistas y procedimientos almacenados
-- - Inserta usuario admin de ejemplo (email: admin@ejemplo.com, password: admin123)
-- 
-- NOTA: El script usa CREATE TABLE IF NOT EXISTS, por lo que es seguro
-- ejecutarlo múltiples veces sin afectar datos existentes.
-- 
-- ============================================

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS token_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE token_system;

-- Configurar codificación UTF-8 para asegurar que los caracteres especiales se lean correctamente
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

-- =============================================
-- Tabla: users
-- Almacena información de los usuarios del sistema
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE COMMENT 'Nombre de usuario unico',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT 'Email unico del usuario',
    contraseña_encriptada VARCHAR(255) NOT NULL COMMENT 'Contrasena hasheada con bcrypt',
    puntos INT DEFAULT 0 COMMENT 'Balance actual de puntos/tokens',
    rol ENUM('admin', 'usuario', 'moderador') DEFAULT 'usuario' COMMENT 'Rol del usuario en el sistema',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de registro del usuario',
    ultimo_login TIMESTAMP NULL COMMENT 'Ultimo acceso del usuario',
    
    -- Índices para mejorar el rendimiento
    INDEX idx_users_email (email),
    INDEX idx_users_nombre_usuario (nombre_usuario),
    INDEX idx_users_fecha_creacion (fecha_creacion),
    INDEX idx_users_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de usuarios del sistema';

-- =============================================
-- Tabla: transacciones
-- Almacena el historial de transacciones de puntos
-- =============================================
CREATE TABLE IF NOT EXISTS transacciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL COMMENT 'ID del usuario que realiza la transacción',
    tipo ENUM('compra', 'venta', 'bonificacion', 'penalizacion', 'reembolso') NOT NULL COMMENT 'Tipo de transacción',
    descripcion TEXT NOT NULL COMMENT 'Descripción detallada de la transacción',
    cantidad_puntos INT NOT NULL COMMENT 'Cantidad de puntos (positivo para añadir, negativo para quitar)',
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de la transacción',
    
    -- Clave foránea
    FOREIGN KEY (id_usuario) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices para mejorar el rendimiento
    INDEX idx_transacciones_usuario (id_usuario),
    INDEX idx_transacciones_fecha (fecha),
    INDEX idx_transacciones_tipo (tipo),
    INDEX idx_transacciones_usuario_fecha (id_usuario, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de transacciones de puntos';

-- =============================================
-- Tabla: preferencias_usuario
-- Almacena las configuraciones de WooCommerce y N8N de cada usuario
-- =============================================
CREATE TABLE IF NOT EXISTS preferencias_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE COMMENT 'ID del usuario (relación 1:1)',
    cliente_key VARCHAR(255) NOT NULL COMMENT 'Consumer Key de WooCommerce',
    url_tienda VARCHAR(500) NOT NULL COMMENT 'URL de la tienda WooCommerce',
    cliente_secret VARCHAR(255) NOT NULL COMMENT 'Consumer Secret de WooCommerce',
    n8n_webhook VARCHAR(500) NULL COMMENT 'URL del webhook de N8N (opcional)',
    n8n_redes VARCHAR(500) NULL COMMENT 'URL del webhook de N8N para redes sociales (opcional)',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación de las preferencias',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización',
    
    -- Clave foránea
    FOREIGN KEY (id_usuario) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_preferencias_usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Preferencias de integración WooCommerce y N8N';

-- =============================================
-- Tabla: social_media_credentials
-- Almacena las credenciales de redes sociales de cada usuario
-- =============================================
CREATE TABLE IF NOT EXISTS social_media_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL COMMENT 'ID del usuario propietario de las credenciales',
    plataforma ENUM('instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'linkedin', 'pinterest') NOT NULL COMMENT 'Red social',
    access_token TEXT COMMENT 'Token de acceso de la API',
    refresh_token TEXT COMMENT 'Token de renovación (si aplica)',
    token_expires_at TIMESTAMP NULL COMMENT 'Fecha de expiración del token',
    app_id VARCHAR(255) COMMENT 'ID de la aplicación en la plataforma',
    app_secret VARCHAR(255) COMMENT 'Secreto de la aplicación',
    username VARCHAR(100) COMMENT 'Nombre de usuario en la plataforma',
    account_id VARCHAR(255) COMMENT 'ID de la cuenta en la plataforma',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Si las credenciales están activas',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación de las credenciales',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización',
    
    -- Clave foránea
    FOREIGN KEY (id_usuario) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_social_usuario (id_usuario),
    INDEX idx_social_plataforma (plataforma),
    INDEX idx_social_activo (is_active),
    UNIQUE KEY uk_usuario_plataforma (id_usuario, plataforma)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Credenciales de redes sociales por usuario';

-- =============================================
-- Tabla: stripe_products
-- Almacena los productos de Stripe configurados en el sistema
-- =============================================
CREATE TABLE IF NOT EXISTS stripe_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stripe_product_id VARCHAR(255) NOT NULL UNIQUE COMMENT 'ID del producto en Stripe',
    nombre VARCHAR(255) NOT NULL COMMENT 'Nombre del producto',
    descripcion TEXT COMMENT 'Descripción del producto',
    precio DECIMAL(10,2) NOT NULL COMMENT 'Precio del producto en la moneda base',
    moneda VARCHAR(3) DEFAULT 'usd' COMMENT 'Moneda del producto (ISO 4217)',
    puntos_otorgados INT NOT NULL COMMENT 'Puntos que se otorgan al comprar este producto',
    tipo_producto ENUM('puntos', 'servicio', 'producto_fisico', 'suscripcion') NOT NULL COMMENT 'Tipo de producto',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Si el producto está activo',
    metadata JSON COMMENT 'Metadatos adicionales del producto',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del producto',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización',
    
    -- Índices
    INDEX idx_stripe_product_id (stripe_product_id),
    INDEX idx_stripe_activo (is_active),
    INDEX idx_stripe_tipo (tipo_producto),
    INDEX idx_stripe_puntos (puntos_otorgados)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Productos de Stripe configurados';

-- =============================================
-- Tabla: logs_sistema (Opcional - para auditoría)
-- Almacena logs del sistema para auditoría
-- =============================================
CREATE TABLE IF NOT EXISTS logs_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL COMMENT 'ID del usuario (NULL si es acción del sistema)',
    accion VARCHAR(100) NOT NULL COMMENT 'Acción realizada',
    descripcion TEXT COMMENT 'Descripción detallada de la acción',
    ip_address VARCHAR(45) COMMENT 'Dirección IP del usuario',
    user_agent TEXT COMMENT 'User Agent del navegador',
    is_done BOOLEAN DEFAULT FALSE COMMENT 'Si el problema ha sido resuelto',
    solucion TEXT COMMENT 'Solución encontrada para el problema',
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora del log',
    
    -- Clave foránea opcional
    FOREIGN KEY (id_usuario) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_logs_usuario (id_usuario),
    INDEX idx_logs_fecha (fecha),
    INDEX idx_logs_accion (accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs del sistema para auditoría';

-- =============================================
-- Vista: vista_usuarios_resumen
-- Vista que muestra un resumen de cada usuario con sus estadísticas
-- =============================================
CREATE OR REPLACE VIEW vista_usuarios_resumen AS
SELECT 
    u.id,
    u.nombre_usuario,
    u.email,
    u.puntos as balance_actual,
    u.rol,
    u.fecha_creacion,
    u.ultimo_login,
    COUNT(t.id) as total_transacciones,
    COALESCE(SUM(CASE WHEN t.cantidad_puntos > 0 THEN t.cantidad_puntos ELSE 0 END), 0) as total_puntos_ganados,
    COALESCE(SUM(CASE WHEN t.cantidad_puntos < 0 THEN ABS(t.cantidad_puntos) ELSE 0 END), 0) as total_puntos_gastados,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Configurado'
        ELSE 'Sin configurar'
    END as estado_preferencias
FROM users u
LEFT JOIN transacciones t ON u.id = t.id_usuario
LEFT JOIN preferencias_usuario p ON u.id = p.id_usuario
GROUP BY u.id, u.nombre_usuario, u.email, u.puntos, u.rol, u.fecha_creacion, u.ultimo_login, p.id;

-- =============================================
-- Procedimiento: sp_actualizar_puntos_usuario
-- Procedimiento para actualizar puntos de un usuario de forma segura
-- =============================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_actualizar_puntos_usuario;
CREATE PROCEDURE sp_actualizar_puntos_usuario(
    IN p_id_usuario INT,
    IN p_cantidad_puntos INT,
    IN p_tipo_transaccion VARCHAR(20),
    IN p_descripcion TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Verificar que el usuario existe
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_id_usuario) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado';
    END IF;
    
    -- Insertar la transacción
    INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos)
    VALUES (p_id_usuario, p_tipo_transaccion, p_descripcion, p_cantidad_puntos);
    
    -- Actualizar los puntos del usuario
    UPDATE users 
    SET puntos = puntos + p_cantidad_puntos
    WHERE id = p_id_usuario;
    
    COMMIT;
END //

DELIMITER ;

-- =============================================
-- Triggers para auditoría y lógica de negocio
-- =============================================

-- Trigger para asignar 10 puntos por defecto a usuarios nuevos (excepto admin)
DELIMITER //
DROP TRIGGER IF EXISTS tr_users_puntos_iniciales;
CREATE TRIGGER tr_users_puntos_iniciales
    BEFORE INSERT ON users
    FOR EACH ROW
BEGIN
    -- Si el usuario NO es admin y no tiene puntos especificados (o tiene 0), asignar 10 puntos
    IF NEW.rol != 'admin' AND (NEW.puntos IS NULL OR NEW.puntos = 0) THEN
        SET NEW.puntos = 10;
    END IF;
END //
DELIMITER ;

-- Trigger para actualizar fecha_actualizacion en preferencias_usuario
DELIMITER //
DROP TRIGGER IF EXISTS tr_preferencias_actualizacion;
CREATE TRIGGER tr_preferencias_actualizacion
    BEFORE UPDATE ON preferencias_usuario
    FOR EACH ROW
BEGIN
    SET NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- =============================================
-- Datos de ejemplo (Opcional)
-- =============================================

-- Insertar un usuario de ejemplo (contraseña: "admin123")
-- Hash bcrypt generado con saltRounds=10 usando bcryptjs
-- Solo se inserta si el usuario no existe (verifica por email y nombre_usuario)
INSERT INTO users (nombre_usuario, email, contraseña_encriptada, puntos, rol)
SELECT 'admin', 'admin@ejemplo.com', '$2a$10$bGh8MbtCTcJLUKALgMn2tObO3tsxHx0p16I7vQd44cT7QHaucTtT6', 1000, 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM users 
    WHERE email = 'admin@ejemplo.com' OR nombre_usuario = 'admin'
);

-- Insertar algunas transacciones de ejemplo
