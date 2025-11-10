# 🔴 Stripe TEST vs LIVE - Guía de Solución

## ⚠️ Tu Problema Específico

**Síntoma:** La integración funciona con claves TEST pero NO con claves LIVE.

Esto es **muy común** y generalmente se debe a una de estas causas:

---

## 🎯 Causa 1: IDs de Productos Diferentes (90% de probabilidad)

### El Problema
Los productos que creaste en modo TEST tienen IDs diferentes a los de LIVE.

**Ejemplo:**
- TEST: `prod_TNXcHPv7kFuCrz` 
- LIVE: `prod_ABC123xyz456` (diferente!)

### ✅ Solución

**Paso 1:** Obtén los IDs de tus productos LIVE

```bash
npm run get-stripe-products
```

Este comando te mostrará:
- Todos tus productos en Stripe (TEST o LIVE según tu configuración)
- Sus IDs correctos
- Sus precios
- Código listo para copiar y pegar

**Paso 2:** Actualiza `src/services/stripeService.ts`

Reemplaza los IDs actuales con los IDs de LIVE:

```typescript
// ANTES (IDs de TEST)
const STRIPE_PRODUCTS = {
  'prod_TNXcHPv7kFuCrz': { points: 10, price: 9.99, name: 'Pack Básico' },
  // ...
};

// DESPUÉS (IDs de LIVE - los que obtuviste del comando)
const STRIPE_PRODUCTS = {
  'prod_ABC123xyz456': { points: 10, price: 9.99, name: 'Pack Básico' },
  // ...
};
```

**Paso 3:** También actualiza `ALLOWED_PRODUCT_IDS`:

```typescript
const ALLOWED_PRODUCT_IDS = [
  'prod_ABC123xyz456', // Usa los IDs de LIVE
  'prod_DEF789abc012',
  // ...
];
```

---

## 🎯 Causa 2: Cuenta de Stripe No Activada Completamente

### El Problema
Stripe requiere que completes la verificación de tu cuenta antes de aceptar pagos reales.

### ✅ Cómo Verificar

1. Ve a tu Dashboard de Stripe: https://dashboard.stripe.com/
2. Busca un banner que diga algo como:
   - "Complete su verificación"
   - "Activate your account"
   - "Restricted access"

### ✅ Solución

1. Completa la información solicitada:
   - Información del negocio
   - Información bancaria
   - Documentos de identidad (si se requieren)

2. **Mientras tanto**, continúa usando claves TEST para desarrollo.

---

## 🎯 Causa 3: Restricciones de API Key

### El Problema
Las claves LIVE pueden tener restricciones de dominio o IP configuradas.

### ✅ Cómo Verificar

1. Ve a: https://dashboard.stripe.com/apikeys
2. Click en tu clave API (la `pk_live_...`)
3. Revisa si tiene restricciones

### ✅ Solución

Si hay restricciones:
- Asegúrate de que tu dominio HTTPS esté en la lista permitida
- O quita las restricciones temporalmente para probar

---

## 🎯 Causa 4: Variables de Entorno

### El Problema
Las claves TEST y LIVE están mezcladas o mal configuradas.

### ✅ Cómo Verificar

```bash
npm run check-stripe
```

Esto verificará que:
- Ambas claves (pública y secreta) estén en el mismo modo (TEST o LIVE)
- El formato sea correcto

### ✅ Solución

Asegúrate de que en tu `.env`:

```bash
# Para LIVE
STRIPE_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXX
SECRET_Stripe_API_KEY=sk_live_XXXXXXXXXXXXXXX

# NO mezcles con TEST
```

---

## 🎯 Causa 5: Productos No Existen en LIVE

### El Problema
Creaste productos en TEST pero no los recreaste en LIVE.

### ✅ Cómo Verificar

```bash
npm run get-stripe-products
```

Si ves "No se encontraron productos", necesitas crearlos.

### ✅ Solución

1. Ve a: https://dashboard.stripe.com/products
2. Crea los mismos productos que tienes en TEST:
   - Pack Básico - 10 puntos - $9.99
   - Pack Medio - 50 puntos - $45.99
   - Pack Avanzado - 100 puntos - $79.99
   - Pack Profesional - 500 puntos - $399.99
   - Pack Empresa - 1000 puntos - $749.99

3. Ejecuta de nuevo:
```bash
npm run get-stripe-products
```

4. Copia los IDs que te da y actualiza tu código.

---

## 🎯 Causa 6: Webhooks Mal Configurados

### El Problema
El webhook secret es de TEST en lugar de LIVE.

### ✅ Solución

Si usas webhooks, asegúrate de que `STRIPE_WEBHOOK_SECRET` también sea de LIVE:

```bash
# En .env
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXX  # Debe ser el de LIVE
```

Para obtenerlo:
1. Ve a: https://dashboard.stripe.com/webhooks
2. Selecciona tu webhook
3. Copia el "Signing secret"

---

## 📋 Checklist de Diagnóstico

Ejecuta estos comandos en orden:

1. **Verificar configuración:**
```bash
npm run check-stripe
```
✅ ¿Ambas claves son de LIVE?

2. **Verificar productos:**
```bash
npm run get-stripe-products
```
✅ ¿Ves tus productos?  
✅ ¿Los IDs coinciden con tu código?

3. **Ver logs detallados:**
```bash
npm run dev:server
```
En otra terminal:
```bash
npm run dev:client
```
Luego abre F12 en el navegador e intenta comprar puntos.

4. **Buscar este error específico en los logs:**
```
❌ [STRIPE-SERVICE] Producto no encontrado: prod_XXXXX
```
Si ves este error, **confirma que es el problema de IDs diferentes**.

---

## 🚀 Solución Rápida (Más Probable)

**Si tu problema es que los productos cargan pero no puedes pagar:**

```bash
# 1. Obtén los IDs correctos de LIVE
npm run get-stripe-products

# 2. Copia los IDs que te muestra

# 3. Edita src/services/stripeService.ts
# 4. Reemplaza los IDs de TEST por los de LIVE

# 5. Reinicia el servidor
npm run dev:server
```

---

## 💡 Mejora Recomendada: Usar Variables de Entorno

Para evitar este problema en el futuro, puedes usar variables de entorno para los IDs:

```typescript
// src/services/stripeService.ts
const STRIPE_PRODUCTS = {
  [process.env.PRODUCT_BASIC_ID!]: { points: 10, price: 9.99, name: 'Pack Básico' },
  [process.env.PRODUCT_MEDIUM_ID!]: { points: 50, price: 45.99, name: 'Pack Medio' },
  // ...
};
```

En tu `.env`:
```bash
# TEST
PRODUCT_BASIC_ID=prod_TNXcHPv7kFuCrz

# LIVE
PRODUCT_BASIC_ID=prod_ABC123xyz456
```

---

## 🔍 Qué Dicen los Logs

Con los logs que agregué, deberías ver algo así si el problema son los IDs:

**En el servidor:**
```
🔵 [STRIPE-SERVICE] getProducts iniciado
🔵 [STRIPE-SERVICE] Obteniendo productos desde Stripe API...
🔵 [STRIPE-SERVICE] Obteniendo producto: prod_TNXcHPv7kFuCrz
❌ [STRIPE-SERVICE] Error al obtener producto: prod_TNXcHPv7kFuCrz No such product
```

O cuando intentas comprar:
```
🔵 [STRIPE-SERVICE] createPaymentIntent iniciado: {productId: 'prod_TNXcHPv7kFuCrz', userId: 1}
🔵 [STRIPE-SERVICE] Productos disponibles: 0
❌ [STRIPE-SERVICE] Producto no encontrado: prod_TNXcHPv7kFuCrz
```

Esto **confirma** que los IDs son el problema.

---

## 📞 Próximo Paso

Ejecuta ahora mismo:

```bash
npm run get-stripe-products
```

Y comparte aquí:
1. ¿Cuántos productos te muestra?
2. ¿Qué IDs aparecen?
3. ¿Son diferentes a los que tienes en el código?

¡Así podemos confirmar la causa exacta! 🎯

