# Guía de Diagnóstico de Stripe - Logs Detallados

## 📋 Resumen

Se han agregado logs detallados en todo el flujo de integración de Stripe para diagnosticar el problema con el procesamiento de tarjetas.

## 🔍 Logs Agregados

### 1. **Frontend (Cliente)**

#### `src/client/components/PointsPurchaseModal.tsx`

Los logs del frontend te ayudarán a identificar problemas en el navegador:

- **Inicialización de Stripe**
  - `🔵 [STRIPE] Inicializando Stripe con clave pública: CONFIGURADA/❌ NO CONFIGURADA`
  - Verifica si la clave pública está configurada correctamente

- **Carga de Productos**
  - `🔵 [STRIPE] Cargando productos...`
  - `✅ [STRIPE] Productos cargados: X productos`
  - `📦 [STRIPE] Productos: [array de productos]`

- **Selección de Producto**
  - `🔵 [STRIPE] Producto seleccionado: {...}`

- **CardElement (Elemento de Tarjeta)**
  - `✅ [STRIPE] CardElement listo` - El elemento de la tarjeta se ha cargado
  - `🔵 [STRIPE] CardElement cambió:` - Cada vez que escribes en la tarjeta
    - `complete`: Si la tarjeta está completa y válida
    - `empty`: Si el campo está vacío
    - `error`: Detalles del error si hay problemas

- **Proceso de Pago**
  - `🔵 [STRIPE] Iniciando proceso de pago`
  - `✅ [STRIPE] CardElement disponible`
  - `🔵 [STRIPE] Solicitando clientSecret para producto: ID`
  - `✅ [STRIPE] ClientSecret recibido`
  - `🔵 [STRIPE] Confirmando pago con tarjeta...`
  - `❌ [STRIPE] Error al confirmar pago:` - **MUY IMPORTANTE**: Aquí verás el error exacto
    - `type`: Tipo de error
    - `code`: Código de error de Stripe
    - `message`: Mensaje de error
    - `declineCode`: Código de rechazo si la tarjeta fue rechazada

### 2. **Backend API (src/routes/stripe.ts)**

Logs de las rutas API:

- **GET /api/stripe/products**
  - `🔵 [STRIPE-API] GET /products - Inicio`
  - `✅ [STRIPE-API] GET /products - Productos obtenidos: X`

- **POST /api/stripe/create-payment-intent**
  - `🔵 [STRIPE-API] POST /create-payment-intent - Inicio`
  - `🔵 [STRIPE-API] Request body: {...}`
  - `🔵 [STRIPE-API] Datos validados: {...}`
  - `✅ [STRIPE-API] Payment intent creado exitosamente`

- **POST /api/stripe/confirm-payment**
  - `🔵 [STRIPE-API] POST /confirm-payment - Inicio`
  - `✅ [STRIPE-API] Pago confirmado exitosamente`

- **POST /api/stripe/webhook**
  - `🔵 [STRIPE-API] POST /webhook - Inicio`
  - `✅ [STRIPE-API] Webhook procesado exitosamente`

### 3. **Servicio de Stripe (src/services/stripeService.ts)**

Logs del servicio que interactúa con la API de Stripe:

- **getProducts()**
  - `🔵 [STRIPE-SERVICE] getProducts iniciado`
  - `✅ [STRIPE-SERVICE] Retornando productos desde caché`
  - `🔵 [STRIPE-SERVICE] Obteniendo productos desde Stripe API...`
  - `✅ [STRIPE-SERVICE] Producto obtenido: {...}`

- **createPaymentIntent()**
  - `🔵 [STRIPE-SERVICE] createPaymentIntent iniciado: {...}`
  - `✅ [STRIPE-SERVICE] Producto encontrado: {...}`
  - `✅ [STRIPE-SERVICE] Usuario encontrado: nombre`
  - `🔵 [STRIPE-SERVICE] Monto calculado: {...}`
  - `🔵 [STRIPE-SERVICE] Creando PaymentIntent en Stripe...`
  - `✅ [STRIPE-SERVICE] PaymentIntent creado exitosamente: {...}`
  - `❌ [STRIPE-SERVICE] Error creating payment intent:` - **CRÍTICO**: Error al crear el intento de pago

- **confirmPayment()**
  - `🔵 [STRIPE-SERVICE] confirmPayment iniciado`
  - `✅ [STRIPE-SERVICE] PaymentIntent recuperado: {...}`
  - `✅ [STRIPE-SERVICE] Puntos actualizados en la base de datos`
  - `✅ [STRIPE-SERVICE] Transacción registrada en la base de datos`

## 🚀 Cómo Usar Esta Información

### Paso 1: Abrir las Herramientas de Desarrollo

1. Abre tu navegador y ve a la aplicación
2. Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux) o `Cmd+Option+I` (Mac)
3. Ve a la pestaña **Console**

### Paso 2: Abrir los Logs del Servidor

En tu terminal donde corre el servidor backend:
```bash
npm run dev:server
```

### Paso 3: Reproducir el Problema

1. Intenta comprar puntos
2. Selecciona un producto
3. Intenta ingresar los datos de la tarjeta
4. Observa los logs en **ambos lugares** (navegador y servidor)

### Paso 4: Identificar el Problema

Busca estos patrones:

#### ❌ **Problema: Clave Pública No Configurada**
```
❌ NO CONFIGURADA
```
**Solución**: Verifica que `STRIPE_PUBLIC_KEY` esté en tu archivo `.env`

#### ❌ **Problema: CardElement No Se Carga**
Si no ves:
```
✅ [STRIPE] CardElement listo
```
**Solución**: Problema con la carga de Stripe.js. Verifica tu conexión a internet y la clave pública.

#### ❌ **Problema: Error al Ingresar Tarjeta**
```
🔵 [STRIPE] CardElement cambió: {
  error: {
    type: "validation_error",
    code: "incomplete_number",
    message: "..."
  }
}
```
**Solución**: El formato de la tarjeta es incorrecto. Stripe validará en tiempo real.

#### ❌ **Problema: Error al Confirmar Pago**
```
❌ [STRIPE] Error al confirmar pago: {
  type: "card_error",
  code: "card_declined",
  message: "Your card was declined",
  declineCode: "insufficient_funds"
}
```
**Soluciones Comunes**:
- `card_declined`: La tarjeta fue rechazada por el banco
- `insufficient_funds`: Fondos insuficientes
- `invalid_cvc`: CVC inválido
- `expired_card`: Tarjeta expirada
- `incorrect_zip`: Código postal incorrecto

#### ❌ **Problema: Error en el Backend**
```
❌ [STRIPE-SERVICE] Error creating payment intent: {
  message: "...",
  type: "StripeInvalidRequestError"
}
```
**Solución**: Problema con la API de Stripe. Verifica:
- Clave secreta (`SECRET_Stripe_API_KEY`)
- Configuración de productos en Stripe
- Conexión a internet del servidor

## 🧪 Tarjetas de Prueba de Stripe

Si estás en modo de prueba, usa estas tarjetas:

### ✅ Tarjetas Exitosas
```
Número: 4242 4242 4242 4242
CVC: Cualquier 3 dígitos
Fecha: Cualquier fecha futura
```

### ❌ Tarjetas con Errores (para pruebas)
```
4000 0000 0000 9995 - Fondos insuficientes
4000 0000 0000 9987 - Tarjeta perdida
4000 0000 0000 9979 - Tarjeta robada
4000 0000 0000 0069 - Expirada
```

## 📊 Interpretación de Logs

### Flujo Exitoso Completo
```
🔵 [STRIPE] Inicializando Stripe con clave pública: CONFIGURADA
🔵 [STRIPE] Cargando productos...
✅ [STRIPE] Productos cargados: 5 productos
🔵 [STRIPE] Producto seleccionado: {...}
✅ [STRIPE] CardElement listo
🔵 [STRIPE] CardElement cambió: { complete: true, empty: false, error: null }
🔵 [STRIPE] Iniciando proceso de pago
✅ [STRIPE] CardElement disponible
🔵 [STRIPE] Solicitando clientSecret para producto: prod_XXX
✅ [STRIPE] ClientSecret recibido
🔵 [STRIPE] Confirmando pago con tarjeta...
✅ [STRIPE] Pago exitoso en Stripe: pi_XXX
🔵 [STRIPE] Confirmando pago en backend...
✅ [STRIPE] Pago confirmado en backend, puntos agregados: 10
```

## 📝 Checklist de Diagnóstico

- [ ] ¿La clave pública de Stripe está configurada?
- [ ] ¿Los productos se cargan correctamente?
- [ ] ¿El CardElement se carga y está listo?
- [ ] ¿Hay errores de validación al ingresar la tarjeta?
- [ ] ¿El error ocurre al confirmar el pago?
- [ ] ¿Qué código de error específico aparece?
- [ ] ¿Estás usando una tarjeta de prueba válida?
- [ ] ¿La clave secreta del backend está configurada?

## 🔧 Variables de Entorno Necesarias

Asegúrate de tener en tu archivo `.env`:

```bash
# Stripe - Frontend
STRIPE_PUBLIC_KEY=pk_test_... o pk_live_...

# Stripe - Backend
SECRET_Stripe_API_KEY=sk_test_... o sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (si usas webhooks)
```

## 💡 Próximos Pasos

1. **Reproduce el error** mientras observas los logs
2. **Copia el error específico** que aparece en los logs
3. **Compártelo** para obtener ayuda más específica
4. **Verifica** las variables de entorno

## 📞 Información Adicional

Los logs incluyen información detallada sobre:
- Estado de Stripe en cada paso
- Errores con contexto completo
- Metadatos de las transacciones
- Flujo de datos completo

Esto te permitirá identificar exactamente dónde falla el proceso de pago.

