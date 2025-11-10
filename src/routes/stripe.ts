import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { StripeService } from '../services/stripeService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Obtener productos disponibles
router.get('/products', authenticateToken, async (req: Request, res: Response) => {
  console.log('🔵 [STRIPE-API] GET /products - Inicio');
  try {
    const products = await StripeService.getProducts();
    console.log('✅ [STRIPE-API] GET /products - Productos obtenidos:', products.length);
    res.json({ success: true, products });
  } catch (error: any) {
    console.error('❌ [STRIPE-API] GET /products - Error:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    });
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener productos' 
    });
  }
});

// Crear payment intent
router.post('/create-payment-intent', 
  authenticateToken,
  [
    body('productId').notEmpty().withMessage('ID del producto es requerido'),
  ],
  async (req: Request, res: Response) => {
    console.log('🔵 [STRIPE-API] POST /create-payment-intent - Inicio');
    console.log('🔵 [STRIPE-API] Request body:', req.body);
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ [STRIPE-API] Errores de validación:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      const { productId } = req.body;
      const userId = (req as any).user.id;

      console.log('🔵 [STRIPE-API] Datos validados:', { productId, userId });

      const result = await StripeService.createPaymentIntent({
        productId,
        userId,
      });

      console.log('✅ [STRIPE-API] Payment intent creado exitosamente:', {
        hasClientSecret: !!result.clientSecret,
        amount: result.amount,
        points: result.points
      });

      res.json({
        success: true,
        clientSecret: result.clientSecret,
        amount: result.amount,
        points: result.points,
      });
    } catch (error: any) {
      console.error('❌ [STRIPE-API] Error creating payment intent:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Error al crear el intento de pago'
      });
    }
  }
);

// Confirmar pago (para uso interno)
router.post('/confirm-payment',
  authenticateToken,
  [
    body('paymentIntentId').notEmpty().withMessage('ID del payment intent es requerido'),
  ],
  async (req: Request, res: Response) => {
    console.log('🔵 [STRIPE-API] POST /confirm-payment - Inicio');
    console.log('🔵 [STRIPE-API] Request body:', req.body);
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ [STRIPE-API] Errores de validación:', errors.array());
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      const { paymentIntentId } = req.body;
      const userId = (req as any).user.id;

      console.log('🔵 [STRIPE-API] Confirmando pago:', { paymentIntentId, userId });

      const result = await StripeService.confirmPayment(paymentIntentId);

      console.log('✅ [STRIPE-API] Pago confirmado exitosamente:', result);

      res.json({
        success: true,
        message: `Pago confirmado. Se agregaron ${result.points} puntos a tu cuenta.`,
        points: result.points,
      });
    } catch (error: any) {
      console.error('❌ [STRIPE-API] Error confirming payment:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Error al confirmar el pago'
      });
    }
  }
);

// Webhook de Stripe (sin autenticación)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  console.log('🔵 [STRIPE-API] POST /webhook - Inicio');
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    console.error('❌ [STRIPE-API] Webhook sin firma de Stripe');
    return res.status(400).json({ success: false, error: 'Falta la firma de Stripe' });
  }

  console.log('🔵 [STRIPE-API] Signature presente, procesando webhook...');
  try {
    await StripeService.handleWebhook(req.body, signature);
    console.log('✅ [STRIPE-API] Webhook procesado exitosamente');
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ [STRIPE-API] Webhook error:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    });
    res.status(400).json({
      success: false,
      error: error.message || 'Error al procesar webhook'
    });
  }
});

export default router;
