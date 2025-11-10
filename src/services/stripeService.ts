import Stripe from 'stripe';
import { db } from '../database/connection';

const stripe = new Stripe(process.env.SECRET_Stripe_API_KEY!, {
  apiVersion: '2025-09-30.clover',
});

// Productos de Stripe con sus precios y puntos (corregidos según descripciones)
const STRIPE_PRODUCTS = {
  'prod_TNXcHPv7kFuCrz': { points: 10, price: 9.99, name: 'Pack Básico' },
  'prod_TNXebYTnEs1AZk': { points: 50, price: 45.99, name: 'Pack Medio' },     // Pack de 10 puntos
  'prod_TNXf2f6p032dKz': { points: 100, price: 79.99, name: 'Pack Avanzado' },  // Pack de 100 puntos
       
  'prod_TNXgBVFBGHapAU': { points: 500, price: 399.99, name: 'Pack Profesional' },      // Pack de 500 puntos
  'prod_TNXisdKKYeqahX': { points: 1000, price: 749.99, name: 'Pack Empresa' }, // Pack de 1000 puntos
};

// IDs permitidos (proporcionados por el usuario)
const ALLOWED_PRODUCT_IDS = [
  'prod_TNXcHPv7kFuCrz',
  'prod_TNXebYTnEs1AZk',
  'prod_TNXf2f6p032dKz',
  
  'prod_TNXgBVFBGHapAU',
  'prod_TNXisdKKYeqahX',
];

// Cache para productos de Stripe
let stripeProductsCache: any[] = [];
let cacheExpiry = 0;

export interface CreatePaymentIntentRequest {
  productId: string;
  userId: number;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  amount: number;
  points: number;
}

export class StripeService {
  static async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    const { productId, userId } = data;
    console.log('🔵 [STRIPE-SERVICE] createPaymentIntent iniciado:', { productId, userId });
    
    // Obtener productos para encontrar el priceId
    const products = await this.getProducts();
    console.log('🔵 [STRIPE-SERVICE] Productos disponibles:', products.length);
    
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      console.error('❌ [STRIPE-SERVICE] Producto no encontrado:', productId);
      throw new Error('Producto no encontrado');
    }

    console.log('✅ [STRIPE-SERVICE] Producto encontrado:', product);

    // Verificar que el usuario existe
    const [users] = await db.execute(
      'SELECT id, nombre_usuario FROM users WHERE id = ?',
      [userId]
    );
    
    if (!Array.isArray(users) || users.length === 0) {
      console.error('❌ [STRIPE-SERVICE] Usuario no encontrado:', userId);
      throw new Error('Usuario no encontrado');
    }

    console.log('✅ [STRIPE-SERVICE] Usuario encontrado:', (users as any)[0].nombre_usuario);

    const amount = Math.round(product.price * 100); // Convertir a centavos
    console.log('🔵 [STRIPE-SERVICE] Monto calculado:', { amount, currency: product.currency || 'usd' });

    try {
      console.log('🔵 [STRIPE-SERVICE] Creando PaymentIntent en Stripe...');
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: product.currency || 'usd',
        metadata: {
          userId: userId.toString(),
          productId,
          points: product.points.toString(),
        },
        description: `Compra de ${product.points} puntos - ${product.name}`,
      });

      console.log('✅ [STRIPE-SERVICE] PaymentIntent creado exitosamente:', {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        amount: product.price,
        points: product.points,
      };
    } catch (error: any) {
      console.error('❌ [STRIPE-SERVICE] Error creating payment intent:', {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        raw: error.raw,
        fullError: error
      });
      throw new Error('Error al crear el intento de pago');
    }
  }

  static async confirmPayment(paymentIntentId: string): Promise<{ success: boolean; points: number }> {
    console.log('🔵 [STRIPE-SERVICE] confirmPayment iniciado:', paymentIntentId);
    try {
      console.log('🔵 [STRIPE-SERVICE] Recuperando PaymentIntent de Stripe...');
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      console.log('✅ [STRIPE-SERVICE] PaymentIntent recuperado:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        metadata: paymentIntent.metadata
      });
      
      if (paymentIntent.status !== 'succeeded') {
        console.error('❌ [STRIPE-SERVICE] Estado de pago no exitoso:', paymentIntent.status);
        throw new Error('El pago no fue exitoso');
      }

      const { userId, points } = paymentIntent.metadata;
      const pointsToAdd = parseInt(points);

      console.log('🔵 [STRIPE-SERVICE] Actualizando puntos del usuario:', { userId, pointsToAdd });

      // Actualizar los puntos del usuario en la base de datos
      await db.execute(
        'UPDATE users SET puntos = puntos + ? WHERE id = ?',
        [pointsToAdd, userId]
      );

      console.log('✅ [STRIPE-SERVICE] Puntos actualizados en la base de datos');

      // Crear una transacción de compra
      await db.execute(
        'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos, fecha) VALUES (?, ?, ?, ?, NOW())',
        [
          userId,
          'compra',
          `Compra de ${pointsToAdd} puntos mediante Stripe`,
          pointsToAdd
        ]
      );

      console.log('✅ [STRIPE-SERVICE] Transacción registrada en la base de datos');

      return {
        success: true,
        points: pointsToAdd,
      };
    } catch (error: any) {
      console.error('❌ [STRIPE-SERVICE] Error confirming payment:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      throw new Error('Error al confirmar el pago');
    }
  }

  static async getProducts() {
    console.log('🔵 [STRIPE-SERVICE] getProducts iniciado');
    // Verificar si el cache está válido (5 minutos)
    if (stripeProductsCache.length > 0 && Date.now() < cacheExpiry) {
      console.log('✅ [STRIPE-SERVICE] Retornando productos desde caché:', stripeProductsCache.length);
      return stripeProductsCache;
    }

    console.log('🔵 [STRIPE-SERVICE] Obteniendo productos desde Stripe API...');
    try {
      // Traer únicamente los productos permitidos, con sus precios
      const productsWithPrices = await Promise.all(
        ALLOWED_PRODUCT_IDS.map(async (productId) => {
          try {
            console.log('🔵 [STRIPE-SERVICE] Obteniendo producto:', productId);
            const product = await stripe.products.retrieve(productId);
            const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
            const price = prices.data[0];
            if (!price) {
              console.warn('⚠️ [STRIPE-SERVICE] No se encontró precio para producto:', productId);
              return null;
            }

            const localProduct = STRIPE_PRODUCTS[product.id as keyof typeof STRIPE_PRODUCTS];

            const productData = {
              id: product.id,
              name: product.name,
              description: product.description || '',
              price: price.unit_amount ? price.unit_amount / 100 : 0,
              points: localProduct?.points || 0,
              currency: price.currency,
              priceId: price.id,
            };

            console.log('✅ [STRIPE-SERVICE] Producto obtenido:', productData);
            return productData;
          } catch (e: any) {
            console.error('❌ [STRIPE-SERVICE] Error al obtener producto:', productId, e.message);
            return null;
          }
        })
      );

      stripeProductsCache = productsWithPrices.filter(Boolean) as any[];
      cacheExpiry = Date.now() + 5 * 60 * 1000; // 5 minutos
      console.log('✅ [STRIPE-SERVICE] Productos guardados en caché:', stripeProductsCache.length);
      return stripeProductsCache;
    } catch (error: any) {
      console.error('❌ [STRIPE-SERVICE] Error fetching Stripe products:', {
        message: error.message,
        type: error.type,
        fullError: error
      });
      // Fallback: usar solo los productos permitidos locales
      console.log('⚠️ [STRIPE-SERVICE] Usando fallback de productos locales');
      return Object.entries(STRIPE_PRODUCTS)
        .filter(([id]) => ALLOWED_PRODUCT_IDS.includes(id))
        .map(([id, product]) => ({
          id,
          ...product,
          description: `Paquete de ${product.points} puntos`,
          currency: 'usd',
          priceId: '',
        }));
    }
  }

  static async handleWebhook(payload: string, signature: string): Promise<{ success: boolean }> {
    console.log('🔵 [STRIPE-SERVICE] handleWebhook iniciado');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('❌ [STRIPE-SERVICE] Webhook secret no configurado');
      throw new Error('Webhook secret no configurado');
    }

    console.log('🔵 [STRIPE-SERVICE] Webhook secret configurado, construyendo evento...');
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      console.log('✅ [STRIPE-SERVICE] Evento de webhook construido:', {
        type: event.type,
        id: event.id
      });

      if (event.type === 'payment_intent.succeeded') {
        console.log('🔵 [STRIPE-SERVICE] Evento payment_intent.succeeded recibido');
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('🔵 [STRIPE-SERVICE] PaymentIntent del webhook:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          status: paymentIntent.status
        });
        await this.confirmPayment(paymentIntent.id);
      } else {
        console.log('⚠️ [STRIPE-SERVICE] Evento de tipo diferente ignorado:', event.type);
      }

      console.log('✅ [STRIPE-SERVICE] Webhook procesado exitosamente');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [STRIPE-SERVICE] Error handling webhook:', {
        message: error.message,
        type: error.type,
        stack: error.stack,
        fullError: error
      });
      throw new Error('Error al procesar webhook');
    }
  }
}
