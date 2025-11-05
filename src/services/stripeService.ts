import Stripe from 'stripe';
import { db } from '../database/connection';

const stripe = new Stripe(process.env.SECRET_Stripe_API_KEY!, {
  apiVersion: '2025-09-30.clover',
});

// Productos de Stripe con sus precios y puntos (corregidos según descripciones)
const STRIPE_PRODUCTS = {
  'prod_TJoe9g106s8q5K': { points: 10, price: 9.99, name: 'Starter pack' },    // Pack de 10 puntos
  'prod_TJogjd20sm4CA2': { points: 100, price: 84.99, name: 'Premium pack' },  // Pack de 100 puntos
  'prod_TJogHoJHDrbx85': { points: 50, price: 44.99, name: 'Pro pack' },       // Pack de 50 puntos
  'prod_TJohX873ZAg1vF': { points: 500, price: 399, name: 'Agent pack' },      // Pack de 500 puntos
  'prod_TJoiSjJFDlvJYu': { points: 1000, price: 749, name: 'Enterprise pack' }, // Pack de 1000 puntos
};

// IDs permitidos (proporcionados por el usuario)
const ALLOWED_PRODUCT_IDS = [
  'prod_TJoe9g106s8q5K',
  'prod_TJogjd20sm4CA2',
  'prod_TJogHoJHDrbx85',
  'prod_TJohX873ZAg1vF',
  'prod_TJoiSjJFDlvJYu',
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
    
    // Obtener productos para encontrar el priceId
    const products = await this.getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    // Verificar que el usuario existe
    const [users] = await db.execute(
      'SELECT id, nombre_usuario FROM users WHERE id = ?',
      [userId]
    );
    
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const amount = Math.round(product.price * 100); // Convertir a centavos

    try {
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

      return {
        clientSecret: paymentIntent.client_secret!,
        amount: product.price,
        points: product.points,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Error al crear el intento de pago');
    }
  }

  static async confirmPayment(paymentIntentId: string): Promise<{ success: boolean; points: number }> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('El pago no fue exitoso');
      }

      const { userId, points } = paymentIntent.metadata;
      const pointsToAdd = parseInt(points);

      // Actualizar los puntos del usuario en la base de datos
      await db.execute(
        'UPDATE users SET puntos = puntos + ? WHERE id = ?',
        [pointsToAdd, userId]
      );

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

      return {
        success: true,
        points: pointsToAdd,
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw new Error('Error al confirmar el pago');
    }
  }

  static async getProducts() {
    // Verificar si el cache está válido (5 minutos)
    if (stripeProductsCache.length > 0 && Date.now() < cacheExpiry) {
      return stripeProductsCache;
    }

    try {
      // Traer únicamente los productos permitidos, con sus precios
      const productsWithPrices = await Promise.all(
        ALLOWED_PRODUCT_IDS.map(async (productId) => {
          try {
            const product = await stripe.products.retrieve(productId);
            const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
            const price = prices.data[0];
            if (!price) return null;

            const localProduct = STRIPE_PRODUCTS[product.id as keyof typeof STRIPE_PRODUCTS];

            return {
              id: product.id,
              name: product.name,
              description: product.description || '',
              price: price.unit_amount ? price.unit_amount / 100 : 0,
              points: localProduct?.points || 0,
              currency: price.currency,
              priceId: price.id,
            };
          } catch (e) {
            return null;
          }
        })
      );

      stripeProductsCache = productsWithPrices.filter(Boolean) as any[];
      cacheExpiry = Date.now() + 5 * 60 * 1000; // 5 minutos
      return stripeProductsCache;
    } catch (error) {
      console.error('Error fetching Stripe products:', error);
      // Fallback: usar solo los productos permitidos locales
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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Webhook secret no configurado');
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.confirmPayment(paymentIntent.id);
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw new Error('Error al procesar webhook');
    }
  }
}
