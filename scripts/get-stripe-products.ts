/**
 * Script para obtener los productos de Stripe y sus IDs
 * Ejecutar con: npx ts-node scripts/get-stripe-products.ts
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.SECRET_Stripe_API_KEY;

if (!apiKey) {
  console.error('❌ ERROR: SECRET_Stripe_API_KEY no está configurada en .env');
  console.log('\n💡 Agrega tu clave secreta al archivo .env:');
  console.log('   SECRET_Stripe_API_KEY=sk_test_... o sk_live_...\n');
  process.exit(1);
}

const isLiveMode = apiKey.startsWith('sk_live_');
const stripe = new Stripe(apiKey, {
  apiVersion: '2025-09-30.clover',
});

console.log(`\n🔍 Obteniendo productos de Stripe (${isLiveMode ? '🔴 LIVE' : '🟡 TEST'} mode)...\n`);
console.log('='.repeat(80));

async function getProducts() {
  try {
    // Obtener todos los productos activos
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    if (products.data.length === 0) {
      console.log('\n⚠️  No se encontraron productos activos en Stripe.');
      console.log('\n💡 Necesitas crear productos en tu Dashboard de Stripe:');
      console.log(`   https://dashboard.stripe.com/${isLiveMode ? '' : 'test/'}products\n`);
      return;
    }

    console.log(`\n✅ Se encontraron ${products.data.length} productos:\n`);

    for (const product of products.data) {
      console.log(`📦 ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Descripción: ${product.description || '(sin descripción)'}`);
      console.log(`   Estado: ${product.active ? '✅ Activo' : '❌ Inactivo'}`);

      // Obtener precios del producto
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      if (prices.data.length > 0) {
        console.log(`   Precios:`);
        for (const price of prices.data) {
          const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : '0.00';
          console.log(`      - ${amount} ${price.currency.toUpperCase()} (ID: ${price.id})`);
        }
      } else {
        console.log(`   ⚠️  Sin precios configurados`);
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('\n📝 CONFIGURACIÓN PARA TU CÓDIGO:\n');
    console.log('Copia esto a tu archivo src/services/stripeService.ts:\n');
    console.log('```typescript');
    console.log(`// Productos de Stripe (${isLiveMode ? 'LIVE' : 'TEST'} mode)`);
    console.log('const STRIPE_PRODUCTS = {');
    
    for (const product of products.data) {
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 1,
      });
      
      const price = prices.data[0];
      const amount = price?.unit_amount ? (price.unit_amount / 100) : 0;
      
      console.log(`  '${product.id}': { points: 0, price: ${amount}, name: '${product.name}' }, // AJUSTA 'points' según corresponda`);
    }
    
    console.log('};');
    console.log('```\n');

    console.log('⚠️  IMPORTANTE: Ajusta el valor de "points" para cada producto según corresponda.\n');
    
    console.log('📋 IDs para ALLOWED_PRODUCT_IDS:\n');
    console.log('const ALLOWED_PRODUCT_IDS = [');
    for (const product of products.data) {
      console.log(`  '${product.id}', // ${product.name}`);
    }
    console.log('];\n');

  } catch (error: any) {
    console.error('\n❌ ERROR al obtener productos:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n💡 Tu clave API es inválida o ha expirado.');
      console.log('   Verifica en: https://dashboard.stripe.com/apikeys\n');
    } else if (error.type === 'StripePermissionError') {
      console.log('\n💡 Tu cuenta de Stripe puede no estar completamente activada.');
      console.log('   Verifica tu cuenta en: https://dashboard.stripe.com/\n');
    } else {
      console.log('\n💡 Detalles del error:', error);
    }
    
    process.exit(1);
  }
}

getProducts();

