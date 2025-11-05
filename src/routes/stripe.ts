import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { StripeService } from '../services/stripeService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Obtener productos disponibles
router.get('/products', authenticateToken, async (req: Request, res: Response) => {
  try {
    const products = await StripeService.getProducts();
    res.json({ success: true, products });
  } catch (error: any) {
    console.error('Error getting products:', error);
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
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      const { productId } = req.body;
      const userId = (req as any).user.id;

      const result = await StripeService.createPaymentIntent({
        productId,
        userId,
      });

      res.json({
        success: true,
        clientSecret: result.clientSecret,
        amount: result.amount,
        points: result.points,
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
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
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      const { paymentIntentId } = req.body;
      const userId = (req as any).user.id;

      const result = await StripeService.confirmPayment(paymentIntentId);

      res.json({
        success: true,
        message: `Pago confirmado. Se agregaron ${result.points} puntos a tu cuenta.`,
        points: result.points,
      });
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al confirmar el pago'
      });
    }
  }
);

// Webhook de Stripe (sin autenticación)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({ success: false, error: 'Falta la firma de Stripe' });
  }

  try {
    await StripeService.handleWebhook(req.body, signature);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al procesar webhook'
    });
  }
});

export default router;
