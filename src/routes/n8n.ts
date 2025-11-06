import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { PreferenciasService } from '../services/preferenciasService';
import * as fs from 'fs';

const router = Router();

// Función para generar video_id en el formato: video_timestamp_randomstring
const generateVideoId = (): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 11); // 9 caracteres aleatorios
  return `video_${timestamp}_${randomString}`;
};

// Función para detectar si estamos corriendo en Docker
const isRunningInDocker = (): boolean => {
  try {
    // Verificar si existe el archivo .dockerenv (presente en contenedores Docker)
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
};

// Función para normalizar la URL del webhook de N8N
// Si estamos en Docker y la URL usa localhost, la transforma a host.docker.internal
const normalizeWebhookUrl = (url: string): string => {
  if (!url) return url;
  
  // Si estamos en Docker y la URL contiene localhost o 127.0.0.1
  if (isRunningInDocker() && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    const normalizedUrl = url.replace(/localhost/g, 'host.docker.internal').replace(/127\.0\.0\.1/g, 'host.docker.internal');
    console.log(`🔄 URL normalizada para Docker: ${url} -> ${normalizedUrl}`);
    return normalizedUrl;
  }
  
  return url;
};

// POST /api/n8n/webhook - Webhook para enviar datos a N8N
router.post('/webhook', authenticateToken, async (req: AuthRequest, res: Response) => {
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

    // Generar ID único para el video en formato: video_timestamp_randomstring
    const video_id = generateVideoId();

    // Obtener preferencias del usuario para usar el webhook de N8N
    const preferencias = await PreferenciasService.getPreferenciasByUserId(req.user.id);
    
    if (!preferencias || !preferencias.n8n_webhook) {
      return res.status(400).json({ 
        error: 'No se ha configurado el webhook de N8N. Por favor, configura el webhook en tus preferencias.' 
      });
    }

    const n8nWebhookUrl = normalizeWebhookUrl(preferencias.n8n_webhook);

    // URLs de callback para que N8N pueda notificar el resultado
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      return res.status(500).json({ 
        error: 'BASE_URL no está configurada en las variables de entorno' 
      });
    }
    const callbackUrlConfirm = `${baseUrl}/api/video-callback/confirm`;
    const callbackUrlError = `${baseUrl}/api/video-callback/error`;

    // Extraer calidad/resolución del prompt_config
    const quality = prompt_config.quality || '1080';
    
    // Determinar resolución y aspect ratio según la calidad
    let resolution: string;
    let aspectRatio: string;
    let width: number;
    let height: number;
    
    if (quality === '720') {
      resolution = '720'; // Solo el número, sin "p"
      aspectRatio = '16:9'; // Horizontal
      width = 1280;
      height = 720;
    } else {
      resolution = '1080'; // Solo el número, sin "p"
      aspectRatio = '16:9'; // Horizontal
      width = 1920;
      height = 1080;
    }

    // Preparar datos para enviar a N8N
    const payload = {
      userId: req.user.id,
      user_id: req.user.id, // También como user_id para compatibilidad
      video_id,
      product,
      prompt_config,
      timestamp,
      // Campos explícitos de resolución para N8N
      resolution: resolution,
      quality: quality,
      aspectRatio: aspectRatio,
      width: width,
      height: height,
      // También incluir el prompt generado directamente si existe
      prompt: prompt_config.generated_prompt || '',
      callback_urls: {
        confirm: callbackUrlConfirm,
        error: callbackUrlError
      }
    };

    console.log('📤 Enviando datos a N8N:', {
      userId: req.user.id,
      video_id,
      product: product.name,
      template: prompt_config.template?.name,
      quality: quality,
      resolution: resolution,
      aspectRatio: aspectRatio,
      width: width,
      height: height,
      webhookUrl: n8nWebhookUrl
    });

    try {
      // Enviar POST al webhook de N8N con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en respuesta de N8N:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        return res.status(response.status).json({ 
          error: 'Error al enviar datos a N8N',
          details: errorText || response.statusText,
          video_id
        });
      }

      const responseData = await response.json().catch(() => ({}));

      console.log('✅ Datos enviados exitosamente a N8N:', {
        video_id,
        status: response.status
      });

      res.json({
        success: true,
        message: 'Datos enviados exitosamente a N8N',
        video_id,
        data: {
          productId: product.id,
          templateId: prompt_config.template?.id,
          quality: prompt_config.quality,
          timestamp
        },
        callback_urls: {
          confirm: callbackUrlConfirm,
          error: callbackUrlError
        }
      });

    } catch (fetchError: any) {
      console.error('❌ Error de red al enviar a N8N:', fetchError);
      
      // Determinar el tipo de error y proporcionar mensaje más útil
      let errorMessage = 'Error de red al enviar datos a N8N';
      let errorDetails = fetchError.message;

      if (fetchError.code === 'ECONNREFUSED' || fetchError.cause?.code === 'ECONNREFUSED') {
        errorMessage = 'No se pudo conectar al servidor de N8N';
        errorDetails = `El servidor no puede alcanzar ${n8nWebhookUrl}. `;
        
        // Si está en Docker y usa localhost, sugerir solución
        if (n8nWebhookUrl.includes('localhost') || n8nWebhookUrl.includes('127.0.0.1')) {
          errorDetails += 'Si estás usando Docker, cambia "localhost" por "host.docker.internal" o la IP del host (ej: 192.168.1.138) en la URL del webhook de N8N en tus preferencias.';
        } else {
          errorDetails += 'Verifica que N8N esté corriendo y que la URL sea accesible desde el servidor.';
        }
      } else if (fetchError.name === 'AbortError') {
        errorMessage = 'Timeout al conectar con N8N';
        errorDetails = 'El servidor de N8N no respondió en 30 segundos. Verifica que esté funcionando correctamente.';
      }

      console.error('Detalles del error:', {
        code: fetchError.code || fetchError.cause?.code,
        message: fetchError.message,
        webhookUrl: n8nWebhookUrl
      });
      
      // En caso de error, también podemos invocar el callback de error directamente
      // para mantener consistencia en el sistema
      try {
        await fetch(callbackUrlError, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: req.user.id,
            video_id,
            error_message: `${errorMessage}: ${errorDetails}`,
            status: 'failed'
          })
        });
      } catch (callbackError) {
        console.error('Error al invocar callback de error:', callbackError);
      }

      return res.status(500).json({ 
        error: errorMessage,
        details: errorDetails,
        video_id,
        webhook_url: n8nWebhookUrl,
        hint: n8nWebhookUrl.includes('localhost') || n8nWebhookUrl.includes('127.0.0.1') 
          ? 'Si estás usando Docker, usa "host.docker.internal" o la IP del host en lugar de "localhost"'
          : undefined
      });
    }

  } catch (error: any) {
    console.error('Error en webhook de N8N:', error);
    res.status(500).json({ 
      error: error.message || 'Error al enviar datos a N8N'
    });
  }
});

export default router;

