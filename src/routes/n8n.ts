import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/n8n/webhook - Webhook para enviar datos a N8N
router.post('/webhook', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { product, prompt_config, timestamp } = req.body;

    // Validar que se envíen los datos requeridos
    if (!product || !prompt_config) {
      return res.status(400).json({ 
        error: 'Datos del producto y configuración del prompt son requeridos' 
      });
    }

    // Aquí es donde se enviaría la información al webhook de N8N
    // Por ahora, simulamos el envío exitoso
    console.log('Datos enviados a N8N:', {
      userId: req.user.id,
      product: product.name,
      template: prompt_config.template.name,
      quality: prompt_config.quality,
      timestamp
    });

    // TODO: Implementar el envío real al webhook de N8N
    // const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    // const response = await fetch(n8nWebhookUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     userId: req.user.id,
    //     product,
    //     prompt_config,
    //     timestamp
    //   })
    // });

    // Simular respuesta exitosa
    res.json({
      success: true,
      message: 'Datos enviados exitosamente a N8N',
      data: {
        productId: product.id,
        templateId: prompt_config.template.id,
        quality: prompt_config.quality,
        timestamp
      }
    });

  } catch (error: any) {
    console.error('Error en webhook de N8N:', error);
    res.status(500).json({ 
      error: error.message || 'Error al enviar datos a N8N'
    });
  }
});

export default router;

