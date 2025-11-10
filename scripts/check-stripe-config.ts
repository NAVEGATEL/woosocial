/**
 * Script para verificar la configuración de Stripe
 * Ejecutar con: npx ts-node scripts/check-stripe-config.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('🔍 Verificando configuración de Stripe...\n');

let hasErrors = false;

// Verificar clave pública
console.log('📌 Frontend (Clave Pública):');
if (process.env.STRIPE_PUBLIC_KEY) {
  const key = process.env.STRIPE_PUBLIC_KEY;
  const isTest = key.startsWith('pk_test_');
  const isLive = key.startsWith('pk_live_');
  
  if (isTest || isLive) {
    console.log(`  ✅ STRIPE_PUBLIC_KEY configurada (${isTest ? 'TEST' : 'LIVE'} mode)`);
    console.log(`     ${key.substring(0, 20)}...`);
  } else {
    console.log('  ❌ STRIPE_PUBLIC_KEY tiene formato inválido');
    hasErrors = true;
  }
} else {
  console.log('  ❌ STRIPE_PUBLIC_KEY NO está configurada');
  console.log('     Necesitas agregar: STRIPE_PUBLIC_KEY=pk_test_... o pk_live_...');
  hasErrors = true;
}

console.log('\n📌 Backend (Clave Secreta):');
if (process.env.SECRET_Stripe_API_KEY) {
  const key = process.env.SECRET_Stripe_API_KEY;
  const isTest = key.startsWith('sk_test_');
  const isLive = key.startsWith('sk_live_');
  
  if (isTest || isLive) {
    console.log(`  ✅ SECRET_Stripe_API_KEY configurada (${isTest ? 'TEST' : 'LIVE'} mode)`);
    console.log(`     ${key.substring(0, 20)}...`);
  } else {
    console.log('  ❌ SECRET_Stripe_API_KEY tiene formato inválido');
    hasErrors = true;
  }
} else {
  console.log('  ❌ SECRET_Stripe_API_KEY NO está configurada');
  console.log('     Necesitas agregar: SECRET_Stripe_API_KEY=sk_test_... o sk_live_...');
  hasErrors = true;
}

console.log('\n📌 Webhook (Opcional):');
if (process.env.STRIPE_WEBHOOK_SECRET) {
  const key = process.env.STRIPE_WEBHOOK_SECRET;
  if (key.startsWith('whsec_')) {
    console.log('  ✅ STRIPE_WEBHOOK_SECRET configurada');
    console.log(`     ${key.substring(0, 20)}...`);
  } else {
    console.log('  ⚠️  STRIPE_WEBHOOK_SECRET tiene formato inválido (debe empezar con whsec_)');
  }
} else {
  console.log('  ⚠️  STRIPE_WEBHOOK_SECRET no está configurada (opcional para webhooks)');
}

// Verificar que las claves sean del mismo modo (test o live)
if (process.env.STRIPE_PUBLIC_KEY && process.env.SECRET_Stripe_API_KEY) {
  const publicIsTest = process.env.STRIPE_PUBLIC_KEY.startsWith('pk_test_');
  const secretIsTest = process.env.SECRET_Stripe_API_KEY.startsWith('sk_test_');
  
  console.log('\n📌 Consistencia de Modo:');
  if (publicIsTest === secretIsTest) {
    console.log(`  ✅ Ambas claves están en modo ${publicIsTest ? 'TEST' : 'LIVE'}`);
  } else {
    console.log('  ❌ Las claves están en modos diferentes!');
    console.log(`     Clave pública: ${publicIsTest ? 'TEST' : 'LIVE'}`);
    console.log(`     Clave secreta: ${secretIsTest ? 'TEST' : 'LIVE'}`);
    hasErrors = true;
  }
}

console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ HAY ERRORES EN LA CONFIGURACIÓN');
  console.log('\n💡 Para obtener tus claves de Stripe:');
  console.log('   1. Ve a https://dashboard.stripe.com/apikeys');
  console.log('   2. Usa las claves de "TEST" para desarrollo');
  console.log('   3. Usa las claves de "LIVE" solo para producción');
  console.log('\n📝 Agrega las claves a tu archivo .env:');
  console.log('   STRIPE_PUBLIC_KEY=pk_test_...');
  console.log('   SECRET_Stripe_API_KEY=sk_test_...');
  process.exit(1);
} else {
  console.log('✅ CONFIGURACIÓN CORRECTA');
  console.log('\n💡 Tarjetas de prueba para modo TEST:');
  console.log('   Éxito: 4242 4242 4242 4242');
  console.log('   Rechazo: 4000 0000 0000 9995');
  console.log('   CVC: Cualquier 3 dígitos');
  console.log('   Fecha: Cualquier fecha futura');
  process.exit(0);
}

