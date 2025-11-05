import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { SocialMediaService } from '../services/socialMediaService';
import { PreferenciasService } from '../services/preferenciasService';
import { SocialPlatformId } from '../models/SocialMedia';
import qs from 'querystring';

const router = Router();

// Autenticación requerida
router.use(authenticateToken);

// GET /api/social - listar estado de conexiones del usuario
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });
    const creds = await SocialMediaService.listConnectionsByUser(req.user.id);
    const platforms: SocialPlatformId[] = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'linkedin', 'pinterest'];

    const connections = platforms.map((plat) => {
      const found = creds.find(c => c.plataforma === plat);
      // Considerar conectada si está activa y tiene access_token O account_id
      // (algunas plataformas pueden tener solo account_id sin token guardado)
      const isConnected = !!found && !!found.is_active && (!!found.access_token || !!found.account_id);
      return {
        plataforma: plat,
        connected: isConnected,
        username: found?.username ?? null,
        account_id: found?.account_id ?? null,
      };
    });

    res.json({ connections });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener conexiones sociales' });
  }
});

// POST /api/social/connect - guardar/actualizar credenciales manuales u obtenidas por OAuth
router.post(
  '/connect',
  [
    body('plataforma').isIn(['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'linkedin', 'pinterest']).withMessage('Plataforma inválida'),
    body('access_token').optional().isString(),
    body('refresh_token').optional().isString(),
    body('token_expires_at').optional({ nullable: true }).isString(),
    body('app_id').optional().isString(),
    body('app_secret').optional().isString(),
    body('username').optional().isString(),
    body('account_id').optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });
      }

      if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const saved = await SocialMediaService.upsertCredential(req.user.id, req.body);
      res.status(201).json({ message: 'Credenciales guardadas', credential: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al guardar credenciales' });
    }
  }
);

// DELETE /api/social/:plataforma - desactivar/eliminar credencial
router.delete(
  '/:plataforma',
  [param('plataforma').isIn(['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'linkedin', 'pinterest'])],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Parámetros inválidos', details: errors.array() });
      }

      if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });
      const plataforma = req.params.plataforma as SocialPlatformId;

      await SocialMediaService.deactivateCredential(req.user.id, plataforma);
      res.json({ message: 'Conexión desactivada' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al desactivar conexión' });
    }
  }
);

// POST /api/social/publish - Publicar video en redes sociales via webhook n8n
router.post(
  '/publish',
  [
    body('video_id').isString().notEmpty().withMessage('video_id requerido'),
    body('social_platforms').isArray().notEmpty().withMessage('Debe seleccionar al menos una red social'),
    body('social_platforms.*.plataforma').isString().notEmpty().withMessage('Plataforma requerida'),
    body('social_platforms.*.account_id').optional().isString(),
    body('message').isString().optional(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { video_id, social_platforms, message } = req.body;
      const videoName = `${video_id}.mp4`;

      // Obtener preferencias del usuario para usar el webhook n8n_redes
      const preferencias = await PreferenciasService.getPreferenciasByUserId(req.user.id);
      
      if (!preferencias || !preferencias.n8n_redes) {
        return res.status(400).json({ 
          error: 'No se ha configurado el webhook de N8N para redes sociales. Por favor, configura el webhook en tus preferencias.' 
        });
      }

      const webhookUrl = preferencias.n8n_redes;

      // Preparar datos para el webhook - cada plataforma como campo separado
      const webhookData: any = {
        video_name: videoName,
        user_id: req.user.id,
        message: message || ''
      };

      // Agregar cada plataforma como campo separado
      social_platforms.forEach((sp: any) => {
        const platformKey = `${sp.plataforma}_platform`;
        webhookData[platformKey] = {
          name: sp.plataforma,
          account_id: sp.account_id || null
        };
      });

      // Enviar POST al webhook de n8n
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(`Error al enviar al webhook: ${webhookResponse.status} - ${errorText}`);
      }

      const webhookResult = await webhookResponse.json().catch(() => ({}));

      res.json({
        success: true,
        message: 'Publicación enviada exitosamente',
        data: {
          video_name: videoName,
          social_platforms: social_platforms,
          webhook_response: webhookResult
        }
      });
    } catch (error: any) {
      console.error('Error al publicar en redes sociales:', error);
      res.status(500).json({ 
        error: error.message || 'Error al enviar publicación al webhook' 
      });
    }
  }
);

// Validar token contra APIs externas
router.post(
  '/validate',
  [
    body('plataforma').isIn(['instagram', 'facebook']).withMessage('Plataforma no soportada para validación'),
    body('access_token').isString().withMessage('access_token requerido')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });
      }

      const { plataforma, access_token } = req.body as { plataforma: 'instagram' | 'facebook'; access_token: string };

      if (plataforma === 'facebook') {
        const url = `https://graph.facebook.com/v18.0/me?access_token=${encodeURIComponent(access_token)}`;
        const r = await fetch(url);
        const data = await r.json() as any;
        if (!r.ok) {
          return res.status(400).json({ valid: false, error: data.error?.message || 'Token inválido' });
        }
        return res.json({ valid: true, username: data.name || null, account_id: data.id || null, platform: 'facebook' });
      }

      if (plataforma === 'instagram') {
        const url = `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(access_token)}`;
        const r = await fetch(url);
        const data = await r.json() as any;
        if (!r.ok) {
          return res.status(400).json({ valid: false, error: data.error?.message || 'Token inválido' });
        }
        return res.json({ valid: true, username: data.username || null, account_id: data.id || null, platform: 'instagram' });
      }

      return res.status(400).json({ error: 'Plataforma no soportada' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al validar token' });
    }
  }
);

// ===== TikTok OAuth (Login Kit) =====
router.get('/tiktok/auth', (req: AuthRequest, res: Response) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI; // Debe coincidir con el configurado en TikTok Dev Portal
  const scopes = (process.env.TIKTOK_SCOPES || 'user.info.basic').split(',').join('%20');
  const state = encodeURIComponent(Math.random().toString(36).slice(2));

  if (!clientKey || !redirectUri) {
    return res.status(500).json({ error: 'Faltan variables de entorno TIKTOK_CLIENT_KEY/TIKTOK_REDIRECT_URI' });
  }

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(clientKey)}&response_type=code&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  res.redirect(authUrl);
});

router.get('/tiktok/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query as any;
    if (error) {
      const back = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/preferencias?social=tiktok&status=error&msg=${encodeURIComponent(error_description || error)}` : '/preferencias?social=tiktok&status=error';
      return res.redirect(back);
    }
    if (!code) {
      const back = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/preferencias?social=tiktok&status=error&msg=missing_code` : '/preferencias?social=tiktok&status=error';
      return res.redirect(back);
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY as string;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET as string;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI as string;
    if (!clientKey || !clientSecret || !redirectUri) {
      return res.status(500).json({ error: 'Faltan variables de entorno TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET/TIKTOK_REDIRECT_URI' });
    }

    // Intercambiar code por access_token
    const tokenResp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs.stringify({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenResp.json() as any;
    if (!tokenResp.ok || !tokenData.access_token) {
      const msg = tokenData?.message || tokenData?.error || 'No se pudo obtener access_token de TikTok';
      const back = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/preferencias?social=tiktok&status=error&msg=${encodeURIComponent(msg)}` : '/preferencias?social=tiktok&status=error';
      return res.redirect(back);
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in || null;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // Obtener perfil básico
    const meResp = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meResp.json() as any;
    if (!meResp.ok) {
      const msg = meData?.message || meData?.error || 'No se pudo obtener perfil de TikTok';
      const back = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/preferencias?social=tiktok&status=error&msg=${encodeURIComponent(msg)}` : '/preferencias?social=tiktok&status=error';
      return res.redirect(back);
    }
    const userInfo = meData?.data?.user || meData?.data;
    const accountId = userInfo?.open_id || null;
    const username = userInfo?.display_name || null;

    // Requiere usuario autenticado; si no se usa cookie/session, se puede pasar un state firmado con userId
    // Aquí asumimos JWT por header: si no hay, no podemos asociar. Para compatibilidad mínima, permitimos continuar si existe req.user
    // Si no, redirigimos con error.
    // Nota: Si usas JWT en el front, abre primero una URL interna que establezca sesión o anexa token en state (mejor firmarlo).
    // Para ahora, intentamos leer req.user si existe (middleware no se ejecuta en este endpoint). Opcional: proteger con authenticateToken.

    // Intento de extraer userId de cookie opcional o query (simple): userId
    const userIdFromQuery = req.query.userId ? parseInt(String(req.query.userId), 10) : undefined;
    const userId = (req as any).user?.id || userIdFromQuery;
    if (!userId) {
      const back = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/preferencias?social=tiktok&status=error&msg=missing_user` : '/preferencias?social=tiktok&status=error';
      return res.redirect(back);
    }

    await SocialMediaService.upsertCredential(userId, {
      plataforma: 'tiktok',
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
      token_expires_at: expiresAt,
      username: username || undefined,
      account_id: accountId || undefined,
      app_id: process.env.TIKTOK_CLIENT_KEY,
      app_secret: undefined,
    });

    const success = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/preferencias?social=tiktok&status=success` : '/preferencias?social=tiktok&status=success';
    return res.redirect(success);
  } catch (e: any) {
    const back = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/preferencias?social=tiktok&status=error&msg=${encodeURIComponent(e?.message || 'callback_error')}` : '/preferencias?social=tiktok&status=error';
    return res.redirect(back);
  }
});

export default router;
