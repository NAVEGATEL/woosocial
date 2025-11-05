import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { WooCommerceService } from '../services/woocommerceService';
import fetch from 'node-fetch';

const router = Router();

// Cache simple en memoria para imágenes
const imageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

// GET /api/woocommerce/proxy-image - Proxy para imágenes de WooCommerce (solución CORS)
// Esta ruta NO requiere autenticación porque las imágenes se cargan directamente desde el navegador
router.get('/proxy-image', async (req: any, res: Response) => {
  try {
    const imageUrl = req.query.url as string;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL de imagen requerida' });
    }

    // Validar que la URL sea de un dominio permitido
    // Permitir configurar dominios por entorno: ALLOWED_IMAGE_DOMAINS=dominio1.com,dominio2.com
    const envDomains = (process.env.ALLOWED_IMAGE_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);
    const allowedDomains = envDomains.length > 0 ? envDomains : ['taviralopez.com', 'www.taviralopez.com'];
    const urlObj = new URL(imageUrl);
    const hostname = urlObj.hostname.toLowerCase();
    const protocol = urlObj.protocol.toLowerCase();
    const pathname = urlObj.pathname || '';
    
    // Solo permitir http/https
    if (!['http:', 'https:'].includes(protocol)) {
      return res.status(400).json({ error: 'Protocolo no permitido' });
    }

    // Si se usa comodín "*" en ALLOWED_IMAGE_DOMAINS, permitir cualquier dominio (útil en dev)
    const allowAll = allowedDomains.includes('*');

    // Permitir automáticamente cualquier WordPress si la ruta apunta a /wp-content/uploads
    const isWordPressMedia = pathname.includes('/wp-content/uploads/');

    if (!allowAll && !isWordPressMedia && !allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
      return res.status(403).json({ error: 'Dominio no permitido' });
    }

    // Verificar cache
    const cached = imageCache.get(imageUrl);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // Servir desde cache
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 minutos
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached.buffer);
    }

    // Obtener la imagen con retry logic
    let imageResponse;
    let retries = 3;
    
    while (retries > 0) {
      try {
        imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000 // 10 segundos timeout
        });
        
        if (imageResponse.ok) {
          break;
        }
        
        // Si es error 429 (Too Many Requests), esperar más tiempo
        if (imageResponse.status === 429) {
          const retryAfter = imageResponse.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          console.log(`Rate limited, esperando ${waitTime}ms antes del reintento...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo entre reintentos
        }
      } catch (fetchError) {
        retries--;
        if (retries === 0) {
          throw fetchError;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!imageResponse || !imageResponse.ok) {
      return res.status(imageResponse?.status || 500).json({ 
        error: `Error al obtener la imagen: ${imageResponse?.statusText || 'Timeout'}` 
      });
    }

    // Configurar headers para la respuesta
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Rechazar respuestas que no sean imagen para mayor seguridad
    if (!contentType.startsWith('image/')) {
      return res.status(415).json({ error: 'Contenido no permitido' });
    }
    const imageBuffer = await imageResponse.buffer();
    
    // Guardar en cache
    imageCache.set(imageUrl, {
      buffer: imageBuffer,
      contentType,
      timestamp: now
    });
    
    // Limpiar cache viejo periódicamente
    if (imageCache.size > 100) {
      for (const [key, value] of imageCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          imageCache.delete(key);
        }
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 minutos
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Cache', 'MISS');
    res.send(imageBuffer);

  } catch (error: any) {
    console.error('Error en proxy de imagen:', error);
    res.status(500).json({ 
      error: error.message || 'Error al obtener la imagen'
    });
  }
});

// Aplicar autenticación a las demás rutas
router.use(authenticateToken);

// GET /api/woocommerce/products - Obtener productos de WooCommerce del usuario
router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 10;
    const categoryRaw = req.query.category as string | undefined;
    const categoryId = categoryRaw ? parseInt(categoryRaw) : undefined;

    const products = await WooCommerceService.getProductsByUserId(req.user.id, page, perPage, isNaN(categoryId as any) ? undefined : categoryId);

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener productos de WooCommerce'
    });
  }
});

// GET /api/woocommerce/products/:id - Obtener producto específico
router.get('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const product = await WooCommerceService.getProductById(req.user.id, productId);

    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener producto de WooCommerce'
    });
  }
});

// GET /api/woocommerce/test-connection - Probar conexión con WooCommerce
router.get('/test-connection', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const isConnected = await WooCommerceService.testConnection(req.user.id);

    res.json({ 
      connected: isConnected,
      message: isConnected ? 'Conexión exitosa con WooCommerce' : 'Error de conexión con WooCommerce'
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al probar conexión con WooCommerce'
    });
  }
});

export default router;
