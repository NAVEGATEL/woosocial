# Sistema de Tokens con N8N y WooCommerce

Un sistema completo de gestión de tokens/puntos que integra con WooCommerce y N8N, construido con TypeScript, Node.js y React.

## 🚀 Características

- **Gestión de Usuarios**: Registro, login y perfil de usuario
- **Sistema de Tokens**: Transacciones de puntos (compra, venta, bonificación, penalización, reembolso)
- **Integración WooCommerce**: Configuración de tienda y credenciales
- **Webhook N8N**: Integración con flujos de automatización
- **Base de Datos SQLite**: Almacenamiento local con 3 tablas principales
- **API REST**: Backend completo con Express y TypeScript
- **Frontend React**: Interfaz moderna con Tailwind CSS

## 📊 Estructura de Base de Datos

### Tabla `users`
- `id` - Identificador único
- `nombre_usuario` - Nombre de usuario único
- `email` - Email único
- `contraseña_encriptada` - Contraseña hasheada con bcrypt
- `puntos` - Balance actual de puntos/tokens
- `fecha_creacion` - Fecha de registro
- `ultimo_login` - Último acceso

### Tabla `transacciones`
- `id` - Identificador único
- `id_usuario` - Referencia al usuario
- `tipo` - Tipo de transacción (compra, venta, bonificación, penalización, reembolso)
- `descripcion` - Descripción de la transacción
- `cantidad_puntos` - Cantidad de puntos (positivo para añadir, negativo para quitar)
- `fecha` - Fecha de la transacción

### Tabla `preferencias_usuario`
- `id` - Identificador único
- `id_usuario` - Referencia al usuario
- `cliente_key` - Consumer Key de WooCommerce
- `url_tienda` - URL de la tienda WooCommerce
- `cliente_secret` - Consumer Secret de WooCommerce
- `n8n_webhook` - URL del webhook de N8N

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **TypeScript** - Tipado estático
- **Express** - Framework web
- **SQLite3** - Base de datos
- **bcryptjs** - Encriptación de contraseñas
- **jsonwebtoken** - Autenticación JWT
- **express-validator** - Validación de datos
- **helmet** - Seguridad HTTP
- **cors** - Configuración CORS

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Herramienta de construcción
- **Tailwind CSS** - Framework de CSS
- **React Router** - Enrutamiento

## 📦 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd n8n-token-system
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env
   ```
   
   Editar el archivo `.env` con tus configuraciones:
   ```env
   PORT=3001
   NODE_ENV=development
   DATABASE_PATH=./database.sqlite
   JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
   JWT_EXPIRES_IN=24h
   N8N_WEBHOOK_URL=http://localhost:5678/webhook
   WOOCOMMERCE_URL=https://tu-tienda.com
   WOOCOMMERCE_CONSUMER_KEY=tu_consumer_key
   WOOCOMMERCE_CONSUMER_SECRET=tu_consumer_secret
   ```

## 🚀 Uso

### Desarrollo
```bash
# Ejecutar en modo desarrollo (backend + frontend)
npm run dev

# Solo backend
npm run dev:server

# Solo frontend
npm run dev:client
```

### Producción
```bash
# Construir para producción
npm run build

# Ejecutar en producción
npm start
```

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Obtener usuario actual

### Usuarios
- `GET /api/users/profile` - Obtener perfil
- `PUT /api/users/profile` - Actualizar perfil
- `GET /api/users` - Listar usuarios (admin)
- `GET /api/users/:id` - Obtener usuario por ID
- `DELETE /api/users/:id` - Eliminar usuario

### Transacciones
- `GET /api/transacciones` - Listar transacciones del usuario
- `POST /api/transacciones` - Crear transacción
- `GET /api/transacciones/:id` - Obtener transacción por ID
- `DELETE /api/transacciones/:id` - Eliminar transacción
- `GET /api/transacciones/stats` - Estadísticas de transacciones
- `GET /api/transacciones/all` - Todas las transacciones (admin)

### Preferencias
- `GET /api/preferencias` - Obtener preferencias del usuario
- `POST /api/preferencias` - Crear preferencias
- `PUT /api/preferencias` - Actualizar preferencias
- `DELETE /api/preferencias` - Eliminar preferencias
- `POST /api/preferencias/test-woocommerce` - Probar conexión WooCommerce
- `POST /api/preferencias/test-n8n` - Probar webhook N8N

## 🔧 Configuración

### WooCommerce
1. Ve a WooCommerce > Configuración > Avanzado > REST API
2. Crea una nueva clave API
3. Copia el Consumer Key y Consumer Secret
4. Configúralos en las preferencias del usuario

### N8N
1. Crea un webhook en tu flujo de N8N
2. Copia la URL del webhook
3. Configúrala en las preferencias del usuario

## 🛡️ Seguridad

- Contraseñas encriptadas con bcrypt
- Autenticación JWT
- Validación de datos con express-validator
- Headers de seguridad con helmet
- Rate limiting
- CORS configurado

## 📝 Licencia

MIT License - ver archivo LICENSE para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si tienes problemas o preguntas, por favor abre un issue en el repositorio.