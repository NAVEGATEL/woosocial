# Implementación de Página de Preferencias

## Resumen
Se ha implementado una página completa de preferencias que permite a los usuarios configurar sus credenciales de WooCommerce y opcionalmente un webhook de N8N para sincronizar transacciones.

## Características Implementadas

### 1. Página de Preferencias (`/preferencias`)
- **Formulario completo** para configurar credenciales de WooCommerce
- **Campos requeridos:**
  - URL de la tienda
  - Clave del cliente (Consumer Key)
  - Clave secreta del cliente (Consumer Secret)
- **Campo opcional:**
  - Webhook de N8N
- **Validaciones en tiempo real** con mensajes de error claros
- **Botones de prueba** para verificar conexiones

### 2. Componentes Creados

#### `ConnectStoreModal.tsx`
- Modal para conectar/actualizar tienda WooCommerce
- Formulario con validaciones
- Manejo de estados de carga y errores

#### `StoreConnectionStatus.tsx`
- Componente que muestra el estado de conexión en el dashboard
- Indicador visual de conexión (verde/rojo)
- Botón para abrir modal de configuración
- Diferentes comportamientos para admin vs usuarios regulares

### 3. Integración en Dashboard
- **Para usuarios no-admin:** Botón "Conectar Mi Tienda Online"
- **Para admins:** También pueden ver y configurar conexiones
- **Estado visual** de conexión con indicadores de color
- **Mensajes informativos** sobre el estado de la configuración

### 4. Backend Actualizado

#### Base de Datos
- **Migración ejecutada:** Campo `n8n_webhook` ahora es opcional (NULL permitido)
- **Estructura actualizada** de la tabla `preferencias_usuario`
- **Compatibilidad** con SQLite y MySQL

#### API Endpoints
- `GET /api/preferencias` - Obtener preferencias del usuario
- `POST /api/preferencias` - Crear nuevas preferencias
- `PUT /api/preferencias` - Actualizar preferencias existentes
- `DELETE /api/preferencias` - Eliminar preferencias
- `POST /api/preferencias/test-woocommerce` - Probar conexión WooCommerce
- `POST /api/preferencias/test-n8n` - Probar webhook N8N

### 5. Validaciones y Seguridad
- **Validación de URLs** para tienda y webhook
- **Campos requeridos** para credenciales esenciales
- **Autenticación** requerida para todas las operaciones
- **Manejo de errores** robusto con mensajes informativos

## Uso de la Funcionalidad

### Para Usuarios Regulares
1. Acceder al dashboard
2. Ver el estado de conexión de su tienda
3. Hacer clic en "Conectar Mi Tienda Online" si no está conectada
4. Completar el formulario con las credenciales de WooCommerce
5. Opcionalmente configurar webhook de N8N
6. Probar las conexiones antes de guardar

### Para Administradores
1. Acceder al dashboard
2. Ver el estado de conexión de su tienda
3. Configurar o actualizar preferencias
4. Gestionar conexiones de otros usuarios (funcionalidad futura)

## Credenciales de Ejemplo
```
URL de Tienda: https://taviralopez.com
Clave del Cliente: ck_32eebf079f7e378ac59840e436f81c8980d541b5
Clave Secreta: cs_9ac82c0031d7f37ad14fe265aaeb01ecb07a1656
```

## Archivos Modificados/Creados

### Frontend
- `src/client/pages/Preferencias.tsx` - Página principal de preferencias
- `src/client/components/ConnectStoreModal.tsx` - Modal de conexión
- `src/client/components/StoreConnectionStatus.tsx` - Estado de conexión
- `src/client/pages/Dashboard.tsx` - Integración del componente
- `src/client/App.tsx` - Ruta de preferencias
- `src/client/types/index.ts` - Tipos actualizados

### Backend
- `src/routes/preferencias.ts` - Rutas de API
- `src/services/preferenciasService.ts` - Lógica de negocio
- `database_schema.sql` - Esquema actualizado

### Scripts
- `scripts/migrate-sqlite.js` - Migración para SQLite
- `scripts/migrate-n8n-webhook-optional.sql` - Migración SQL
- `scripts/migrate-n8n-webhook-optional.js` - Migración para MySQL

## Próximos Pasos
1. **Implementar validación real** de conexión con WooCommerce
2. **Agregar sincronización automática** de transacciones
3. **Panel de administración** para gestionar preferencias de usuarios
4. **Logs de conexión** para debugging
5. **Configuración de webhooks** automática

## Notas Técnicas
- La migración de base de datos se ejecutó exitosamente
- El campo `n8n_webhook` ahora permite valores NULL
- Todas las validaciones están implementadas en frontend y backend
- La interfaz es responsive y accesible
- Los errores se manejan de forma consistente en toda la aplicación
