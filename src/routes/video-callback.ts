import { Router, Response } from 'express';
import { db } from '../database/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Almacenar conexiones SSE por usuario
const sseConnections = new Map<number, Response[]>();

// Función para notificar a un usuario específico
const notifyUser = (userId: number, data: any) => {
  console.log(`🔍 Buscando conexiones para usuario ${userId}...`);
  const connections = sseConnections.get(userId);
  console.log(`🔍 Conexiones encontradas:`, connections?.length || 0);
  
  if (connections && connections.length > 0) {
    connections.forEach((res, index) => {
      try {
        console.log(`📤 Enviando notificación a conexión ${index + 1}...`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        console.log(`✅ Notificación enviada exitosamente a conexión ${index + 1}`);
      } catch (error) {
        console.error(`❌ Error enviando SSE a conexión ${index + 1}:`, error);
      }
    });
  } else {
    console.log(`⚠️ No hay conexiones SSE activas para el usuario ${userId}`);
  }
};

// GET /api/video-callback/stream - Server-Sent Events para notificaciones en tiempo real
router.get('/stream', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const userId = req.user.id;

  // Configurar headers para SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Agregar conexión a la lista
  if (!sseConnections.has(userId)) {
    sseConnections.set(userId, []);
  }
  sseConnections.get(userId)!.push(res);
  
  console.log(`🔌 Usuario ${userId} conectado a SSE. Total conexiones: ${sseConnections.get(userId)!.length}`);

  // Enviar mensaje inicial
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Conectado al stream de video' })}\n\n`);

  // Limpiar conexión cuando se cierre
  req.on('close', () => {
    const connections = sseConnections.get(userId);
    if (connections) {
      const index = connections.indexOf(res);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        sseConnections.delete(userId);
      }
    }
  });
});

// GET /api/video-callback/check-points - Verificar puntos del usuario
router.get('/check-points', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const [rows] = await db.execute(
      'SELECT puntos FROM users WHERE id = ?',
      [req.user.id]
    ) as any[];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const points = rows[0].puntos;
    const canGenerate = points >= 10;

    res.json({
      points,
      canGenerate
    });

  } catch (error: any) {
    console.error('Error al verificar puntos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// POST /api/video-callback/generate - Iniciar generación de video
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { product, prompt_config, callback_url } = req.body;

    if (!product || !prompt_config || !callback_url) {
      return res.status(400).json({ 
        error: 'product, prompt_config y callback_url son requeridos' 
      });
    }

    // Verificar que el usuario tenga suficientes puntos
    const [rows] = await db.execute(
      'SELECT puntos FROM users WHERE id = ?',
      [req.user.id]
    ) as any[];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userPoints = rows[0].puntos;
    if (userPoints < 10) {
      return res.status(400).json({ 
        error: 'No tienes suficientes puntos para generar un video',
        current_points: userPoints,
        required_points: 10
      });
    }

    // Generar ID único para el video
    const video_id = uuidv4();

    res.json({
      success: true,
      message: 'Generación de video iniciada',
      video_id,
      callback_url
    });

  } catch (error: any) {
    console.error('Error al iniciar generación de video:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// POST /api/video-callback/confirm - Callback para confirmar generación exitosa de video
router.post('/confirm', async (req: any, res: Response) => {
  try {
    const { user_id, video_id, status, points_to_deduct = 10 } = req.body;

    console.log('🎬 Callback recibido:', { user_id, video_id, status, points_to_deduct });

    if (!user_id || !video_id) {
      return res.status(400).json({ 
        error: 'user_id y video_id son requeridos' 
      });
    }

    // Verificar que el usuario existe
    const [userRows] = await db.execute(
      'SELECT id, puntos FROM users WHERE id = ?',
      [user_id]
    ) as any[];

    if (userRows.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    const user = userRows[0];

    // Si el video se generó exitosamente, restar puntos
    if (status === 'success' || status === 'completed') {
      // Verificar que el usuario tenga suficientes puntos
      if (user.puntos < points_to_deduct) {
        return res.status(400).json({ 
          error: 'Usuario no tiene suficientes puntos',
          current_points: user.puntos,
          required_points: points_to_deduct
        });
      }

      // Restar puntos del usuario
      const newPoints = user.puntos - points_to_deduct;
      await db.execute(
        'UPDATE users SET puntos = ? WHERE id = ?',
        [newPoints, user_id]
      );

      // Registrar la transacción
      await db.execute(
        'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
        [
          user_id,
          'penalizacion',
          `Generación de video ${video_id} - ${points_to_deduct} puntos`,
          -points_to_deduct
        ]
      );

      console.log(`✅ Video ${video_id} generado exitosamente. Usuario ${user_id} perdió ${points_to_deduct} puntos. Nuevo balance: ${newPoints}`);

      // Guardar estado del video
      videoStatus.set(video_id, {
        status: 'completed',
        user_id: parseInt(user_id),
        completed_at: new Date(),
        points_deducted: points_to_deduct,
        new_balance: newPoints,
        video_url: `https://rrss.navegatel.es/vids/${video_id}.mp4`
      });

      // Generar URL del video
      const video_url = `https://rrss.navegatel.es/vids/${video_id}.mp4`;

      // Notificar al usuario via SSE
      console.log(`📡 Notificando usuario ${user_id} via SSE...`);
      notifyUser(parseInt(user_id), {
        type: 'video_completed',
        video_id,
        video_url,
        status: 'success',
        points_deducted: points_to_deduct,
        new_balance: newPoints,
        message: '¡Tu video ha sido generado exitosamente!'
      });
      console.log(`📡 Notificación enviada al usuario ${user_id}`);

      return res.json({
        success: true,
        message: 'Puntos descontados exitosamente',
        video_id,
        video_url,
        points_deducted: points_to_deduct,
        new_balance: newPoints
      });
    }

    // Si el video falló, registrar estado de fallo y notificar
    videoStatus.set(video_id, {
      status: 'failed',
      user_id: parseInt(user_id),
      completed_at: new Date(),
      points_deducted: 0,
      new_balance: user.puntos,
      video_url: ''
    });

    notifyUser(parseInt(user_id), {
      type: 'video_failed',
      video_id,
      status: 'failed',
      points_deducted: 0,
      new_balance: user.puntos,
      message: 'La generación del video falló. No se descontaron puntos.'
    });

    return res.json({
      success: true,
      message: 'Video falló, no se descontaron puntos',
      video_id,
      status: 'failed'
    });

  } catch (error: any) {
    console.error('Error en callback de video:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Almacenar estado de videos procesados
const videoStatus = new Map<string, { status: string; user_id: number; completed_at: Date; points_deducted: number; new_balance: number; video_url: string }>();

// GET /api/video-callback/status/:video_id - Verificar estado de un video
router.get('/status/:video_id', async (req: any, res: Response) => {
  try {
    const { video_id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        error: 'user_id es requerido' 
      });
    }

    const videoData = videoStatus.get(video_id);
    
    if (!videoData) {
      return res.json({
        video_id,
        user_id,
        status: 'processing',
        message: 'Video en procesamiento'
      });
    }

    res.json({
      video_id,
      user_id,
      status: videoData.status,
      completed_at: videoData.completed_at,
      points_deducted: videoData.points_deducted,
      new_balance: videoData.new_balance,
      video_url: videoData.video_url,
      message: videoData.status === 'completed' 
        ? 'Video completado exitosamente' 
        : videoData.status === 'failed' 
          ? 'Video falló durante la generación'
          : 'Video en procesamiento'
    });

  } catch (error: any) {
    console.error('Error al consultar estado del video:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// POST /api/video-callback/publish/success - Callback de publicación exitosa (genérico)
router.post('/publish/success', async (req: any, res: Response) => {
  try {
    const { user_id, video_id, platform } = req.body as { user_id: number; video_id: string; platform: string };

    if (!user_id || !video_id || !platform) {
      return res.status(400).json({ error: 'user_id, video_id y platform son requeridos' });
    }

    const descripcion = `Publicación de video ${video_id} en: ${platform}`;

    await db.execute(
      'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
      [user_id, 'penalizacion', descripcion, 0]
    );

    return res.json({ success: true, message: 'Publicación registrada' });
  } catch (error: any) {
    console.error('[PUBLISH SUCCESS CALLBACK] Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// POST /api/video-callback/publish/success/instagram - Callback de publicación exitosa en Instagram
router.post('/publish/success/instagram', async (req: any, res: Response) => {
  try {
    console.log('[PUBLISH SUCCESS INSTAGRAM CALLBACK] Request recibido:', JSON.stringify(req.body));
    
    const { user_id, video_id } = req.body as { user_id: number; video_id: string };

    console.log('[PUBLISH SUCCESS INSTAGRAM CALLBACK] Datos extraídos:', { user_id, video_id });

    if (!user_id || !video_id) {
      console.error('[PUBLISH SUCCESS INSTAGRAM CALLBACK] Faltan parámetros requeridos:', { user_id, video_id });
      return res.status(400).json({ error: 'user_id y video_id son requeridos' });
    }

    // Remover .mp4 si está presente en el video_id
    const cleanVideoId = video_id.endsWith('.mp4') ? video_id.replace(/\.mp4$/, '') : video_id;
    const descripcion = `Publicación de video ${cleanVideoId} en: Instagram`;
    console.log('[PUBLISH SUCCESS INSTAGRAM CALLBACK] Descripción:', descripcion);

    const [result] = await db.execute(
      'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
      [user_id, 'penalizacion', descripcion, 0]
    ) as any[];

    console.log('[PUBLISH SUCCESS INSTAGRAM CALLBACK] Transacción insertada exitosamente. ID:', result.insertId);

    return res.json({ success: true, message: 'Publicación en Instagram registrada', transaction_id: result.insertId });
  } catch (error: any) {
    console.error('[PUBLISH SUCCESS INSTAGRAM CALLBACK] Error completo:', error);
    console.error('[PUBLISH SUCCESS INSTAGRAM CALLBACK] Stack trace:', error.stack);
    return res.status(500).json({ error: error.message || 'Error interno del servidor', details: error.stack });
  }
});

// POST /api/video-callback/publish/success/tiktok - Callback de publicación exitosa en TikTok
router.post('/publish/success/tiktok', async (req: any, res: Response) => {
  try {
    console.log('[PUBLISH SUCCESS TIKTOK CALLBACK] Request recibido:', JSON.stringify(req.body));
    
    const { user_id, video_id } = req.body as { user_id: number; video_id: string };

    console.log('[PUBLISH SUCCESS TIKTOK CALLBACK] Datos extraídos:', { user_id, video_id });

    if (!user_id || !video_id) {
      console.error('[PUBLISH SUCCESS TIKTOK CALLBACK] Faltan parámetros requeridos:', { user_id, video_id });
      return res.status(400).json({ error: 'user_id y video_id son requeridos' });
    }

    // Remover .mp4 si está presente en el video_id
    const cleanVideoId = video_id.endsWith('.mp4') ? video_id.replace(/\.mp4$/, '') : video_id;
    const descripcion = `Publicación de video ${cleanVideoId} en: TikTok`;
    console.log('[PUBLISH SUCCESS TIKTOK CALLBACK] Descripción:', descripcion);

    const [result] = await db.execute(
      'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
      [user_id, 'penalizacion', descripcion, 0]
    ) as any[];

    console.log('[PUBLISH SUCCESS TIKTOK CALLBACK] Transacción insertada exitosamente. ID:', result.insertId);

    return res.json({ success: true, message: 'Publicación en TikTok registrada', transaction_id: result.insertId });
  } catch (error: any) {
    console.error('[PUBLISH SUCCESS TIKTOK CALLBACK] Error completo:', error);
    console.error('[PUBLISH SUCCESS TIKTOK CALLBACK] Stack trace:', error.stack);
    return res.status(500).json({ error: error.message || 'Error interno del servidor', details: error.stack });
  }
});

// POST /api/video-callback/publish/success/facebook - Callback de publicación exitosa en Facebook
router.post('/publish/success/facebook', async (req: any, res: Response) => {
  try {
    console.log('[PUBLISH SUCCESS FACEBOOK CALLBACK] Request recibido:', JSON.stringify(req.body));
    
    const { user_id, video_id } = req.body as { user_id: number; video_id: string };

    console.log('[PUBLISH SUCCESS FACEBOOK CALLBACK] Datos extraídos:', { user_id, video_id });

    if (!user_id || !video_id) {
      console.error('[PUBLISH SUCCESS FACEBOOK CALLBACK] Faltan parámetros requeridos:', { user_id, video_id });
      return res.status(400).json({ error: 'user_id y video_id son requeridos' });
    }

    // Remover .mp4 si está presente en el video_id
    const cleanVideoId = video_id.endsWith('.mp4') ? video_id.replace(/\.mp4$/, '') : video_id;
    const descripcion = `Publicación de video ${cleanVideoId} en: Facebook`;
    console.log('[PUBLISH SUCCESS FACEBOOK CALLBACK] Descripción:', descripcion);

    const [result] = await db.execute(
      'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
      [user_id, 'penalizacion', descripcion, 0]
    ) as any[];

    console.log('[PUBLISH SUCCESS FACEBOOK CALLBACK] Transacción insertada exitosamente. ID:', result.insertId);

    return res.json({ success: true, message: 'Publicación en Facebook registrada', transaction_id: result.insertId });
  } catch (error: any) {
    console.error('[PUBLISH SUCCESS FACEBOOK CALLBACK] Error completo:', error);
    console.error('[PUBLISH SUCCESS FACEBOOK CALLBACK] Stack trace:', error.stack);
    return res.status(500).json({ error: error.message || 'Error interno del servidor', details: error.stack });
  }
});

// POST /api/video-callback/publish/error - Callback de publicación con error (genérico)
router.post('/publish/error', async (req: any, res: Response) => {
  try {
    const { user_id, video_id, platform, error_message } = req.body as { user_id: number; video_id: string; platform?: string; error_message?: string };

    if (!user_id || !video_id) {
      return res.status(400).json({ error: 'user_id y video_id son requeridos' });
    }

    const descripcion = `Publicación fallida del video ${video_id}${platform ? ` en: ${platform}` : ''}${error_message ? ` - Error: ${error_message}` : ''}`;

    await db.execute(
      'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
      [user_id, 'penalizacion', descripcion, 0]
    );

    return res.json({ success: true, message: 'Error de publicación registrado' });
  } catch (error: any) {
    console.error('[PUBLISH ERROR CALLBACK] Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// POST /api/video-callback/publish/error/instagram - Callback de error en Instagram
router.post('/publish/error/instagram', async (req: any, res: Response) => {
  try {
    const { user_id, video_id, error_message } = req.body as { user_id: number; video_id: string; error_message?: string };

    if (!user_id || !video_id) {
      return res.status(400).json({ error: 'user_id y video_id son requeridos' });
    }

    const descripcion = `Publicación fallida del video ${video_id} en: Instagram${error_message ? ` - Error: ${error_message}` : ''}`;

    await db.execute(
      'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
      [user_id, 'penalizacion', descripcion, 0]
    );

    return res.json({ success: true, message: 'Error de publicación en Instagram registrado' });
  } catch (error: any) {
    console.error('[PUBLISH ERROR INSTAGRAM CALLBACK] Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// POST /api/video-callback/publish/error/tiktok - Callback de error en TikTok
router.post('/publish/error/tiktok', async (req: any, res: Response) => {
  try {
    const { user_id, video_id, error_message } = req.body as { user_id: number; video_id: string; error_message?: string };

    if (!user_id || !video_id) {
      return res.status(400).json({ error: 'user_id y video_id son requeridos' });
    }

    const descripcion = `Publicación fallida del video ${video_id} en: TikTok${error_message ? ` - Error: ${error_message}` : ''}`;

    await db.execute(
      'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
      [user_id, 'penalizacion', descripcion, 0]
    );

    return res.json({ success: true, message: 'Error de publicación en TikTok registrado' });
  } catch (error: any) {
    console.error('[PUBLISH ERROR TIKTOK CALLBACK] Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// POST /api/video-callback/publish/error/facebook - Callback de error en Facebook
router.post('/publish/error/facebook', async (req: any, res: Response) => {
  try {
    const { user_id, video_id, error_message } = req.body as { user_id: number; video_id: string; error_message?: string };

    if (!user_id || !video_id) {
      return res.status(400).json({ error: 'user_id y video_id son requeridos' });
    }

    const descripcion = `Publicación fallida del video ${video_id} en: Facebook${error_message ? ` - Error: ${error_message}` : ''}`;

    await db.execute(
      'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
      [user_id, 'penalizacion', descripcion, 0]
    );

    return res.json({ success: true, message: 'Error de publicación en Facebook registrado' });
  } catch (error: any) {
    console.error('[PUBLISH ERROR FACEBOOK CALLBACK] Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// POST /api/video-callback/publish/error/external - Callback de error externo (para errores del webhook n8n)
router.post('/publish/error/external', async (req: any, res: Response) => {
  try {
    const { user_id, video_id, error_message } = req.body as { user_id: number; video_id: string; error_message?: string };

    if (!user_id || !video_id) {
      return res.status(400).json({ error: 'user_id y video_id son requeridos' });
    }

    const descripcion = `Publicación video ${video_id}${error_message ? ` - Error: ${error_message}` : ''}`;

    await db.execute(
      'INSERT INTO transacciones (id_usuario, tipo, descripcion, cantidad_puntos) VALUES (?, ?, ?, ?)',
      [user_id, 'penalizacion', descripcion, 0]
    );

    return res.json({ success: true, message: 'Error externo de publicación registrado' });
  } catch (error: any) {
    console.error('[PUBLISH ERROR EXTERNAL CALLBACK] Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

export default router;
