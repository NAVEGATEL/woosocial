# 🎯 Diagnóstico Stripe: TEST funciona, LIVE no

## Tu Situación

✅ **TEST funciona** - La integración funciona perfectamente con claves de prueba  
❌ **LIVE no funciona** - Con claves reales no deja ingresar la tarjeta  
✅ **HTTPS OK** - Tu servidor está en HTTPS (necesario para LIVE)

## 🔍 Causa Más Probable (95%)

### **Los IDs de productos son diferentes entre TEST y LIVE**

Cuando creas productos en Stripe:
- En TEST: Los IDs son como `prod_TNXcHPv7kFuCrz`
- En LIVE: Los IDs son DIFERENTES, como `prod_ABC123xyz456`

Tu código actualmente tiene **IDs de TEST** hardcodeados. Por eso funciona en TEST pero no en LIVE.

---

## ✅ Solución en 3 Pasos

### 1️⃣ Obtén los IDs correctos de LIVE

```bash
npm run get-stripe-products
```

Este comando:
- Se conectará a Stripe con tus claves LIVE
- Te mostrará todos tus productos
- Te dará los IDs correctos
- Te generará el código listo para copiar

### 2️⃣ Actualiza tu código

Abre `src/services/stripeService.ts` y reemplaza:

**ANTES (IDs de TEST):**
```typescript
const STRIPE_PRODUCTS = {
  'prod_TNXcHPv7kFuCrz': { points: 10, price: 9.99, name: 'Pack Básico' },
  'prod_TNXebYTnEs1AZk': { points: 50, price: 45.99, name: 'Pack Medio' },
  'prod_TNXf2f6p032dKz': { points: 100, price: 79.99, name: 'Pack Avanzado' },
  'prod_TNXgBVFBGHapAU': { points: 500, price: 399.99, name: 'Pack Profesional' },
  'prod_TNXisdKKYeqahX': { points: 1000, price: 749.99, name: 'Pack Empresa' },
};
```

**DESPUÉS (IDs de LIVE - usa los que obtuviste):**
```typescript
const STRIPE_PRODUCTS = {
  'prod_ABC123xyz456': { points: 10, price: 9.99, name: 'Pack Básico' },
  'prod_DEF789abc012': { points: 50, price: 45.99, name: 'Pack Medio' },
  // ... usa los IDs que te dio el comando
};
```

También actualiza:
```typescript
const ALLOWED_PRODUCT_IDS = [
  'prod_ABC123xyz456', // Usa los IDs de LIVE
  'prod_DEF789abc012',
  // ...
];
```

### 3️⃣ Reinicia el servidor

```bash
npm run dev:server
```

---

## 🔍 Verificación

### Antes de cambiar los IDs:

Con los logs que agregué, verás este error en el servidor:

```
🔵 [STRIPE-SERVICE] Obteniendo producto: prod_TNXcHPv7kFuCrz
❌ [STRIPE-SERVICE] Error al obtener producto: prod_TNXcHPv7kFuCrz No such product
```

o

```
❌ [STRIPE-SERVICE] Producto no encontrado: prod_TNXcHPv7kFuCrz
```

### Después de cambiar los IDs:

```
✅ [STRIPE-SERVICE] Producto obtenido: {id: 'prod_ABC123xyz456', ...}
✅ [STRIPE-API] Productos obtenidos: 5
```

---

## 🛠️ Comandos Útiles

```bash
# Verificar configuración de Stripe
npm run check-stripe

# Obtener productos de Stripe (TEST o LIVE según tu .env)
npm run get-stripe-products

# Ver logs detallados
npm run dev:server  # En una terminal
npm run dev:client  # En otra terminal
# Luego abre F12 en el navegador
```

---

## 📚 Documentación Completa

- **`STRIPE_LOGS_RESUMEN.md`** - Guía rápida de logs
- **`STRIPE_TEST_VS_LIVE.md`** - Guía completa del problema TEST vs LIVE
- **`STRIPE_DEBUG_GUIDE.md`** - Guía detallada de todos los logs

---

## ⚠️ Otras Causas Posibles (5%)

Si cambiar los IDs no soluciona el problema, podría ser:

1. **Cuenta no activada**: Ve a https://dashboard.stripe.com/ y verifica si necesitas completar información
2. **Restricciones de API**: Ve a https://dashboard.stripe.com/apikeys y verifica que no haya restricciones
3. **Productos no existen**: Crea los productos manualmente en el dashboard de LIVE

---

## 🎯 Qué Hacer Ahora

**Ejecuta esto AHORA:**

```bash
npm run get-stripe-products
```

Luego copia aquí (o revisa):
1. ¿Cuántos productos te mostró?
2. ¿Los IDs son diferentes a los del código?

**Si no te muestra productos:**
- Ve a https://dashboard.stripe.com/products
- Crea los productos que necesitas
- Vuelve a ejecutar `npm run get-stripe-products`

---

## 💡 Prevención Futura

Para evitar este problema, puedes usar variables de entorno:

```typescript
// src/services/stripeService.ts
const STRIPE_PRODUCTS = {
  [process.env.PRODUCT_BASIC_ID!]: { points: 10, price: 9.99, name: 'Pack Básico' },
};
```

En `.env`:
```bash
# Para TEST
PRODUCT_BASIC_ID=prod_TNXcHPv7kFuCrz

# Para LIVE
PRODUCT_BASIC_ID=prod_ABC123xyz456
```

---

## 🆘 Si Sigue Sin Funcionar

Ejecuta todo con logs activados:

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:client

# En el navegador: F12 -> Console
```

Luego intenta comprar puntos y copia aquí el error exacto que aparece en:
- ❌ La consola del navegador
- ❌ La terminal del servidor

Con los logs detallados que agregué, sabremos exactamente qué está fallando.

---

**¡El 95% de las veces, cambiar los IDs soluciona el problema!** 🎯

