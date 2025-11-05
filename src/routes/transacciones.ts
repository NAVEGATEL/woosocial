import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { TransaccionService } from '../services/transaccionService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CreateTransaccionData, TransaccionFilters } from '../models/Transaccion';
import { db } from '../database/connection';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Validaciones
const createTransaccionValidation = [
  body('id_usuario').isInt({ min: 1 }).withMessage('ID de usuario debe ser un número entero positivo'),
  body('tipo').isIn(['compra', 'venta', 'bonificacion', 'penalizacion', 'reembolso']).withMessage('Tipo de transacción inválido'),
  body('descripcion').isLength({ min: 1 }).withMessage('La descripción es requerida'),
  body('cantidad_puntos').isInt().withMessage('La cantidad de puntos debe ser un número entero')
];

const getTransaccionesValidation = [
  query('tipo').optional().custom((value) => {
    if (!value || value === '') return true;
    return ['compra', 'venta', 'bonificacion', 'penalizacion', 'reembolso'].includes(value);
  }).withMessage('Tipo de transacción inválido'),
  query('fecha_desde').optional().custom((value) => {
    if (!value || value === '') return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Fecha desde debe ser una fecha válida'),
  query('fecha_hasta').optional().custom((value) => {
    if (!value || value === '') return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Fecha hasta debe ser una fecha válida'),
  query('limite').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser un número entre 1 y 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset debe ser un número positivo')
];

// POST /api/transacciones
router.post('/', createTransaccionValidation, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📝 Datos recibidos para transacción:', req.body);
    console.log('👤 Usuario autenticado:', req.user);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Errores de validación:', errors.array());
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const transaccionData: CreateTransaccionData = req.body;
    
    // Verificar que el usuario solo puede crear transacciones para sí mismo, excepto si es admin
    if (req.user && req.user.rol !== 'admin' && req.user.id !== transaccionData.id_usuario) {
      return res.status(403).json({ error: 'No puedes crear transacciones para otros usuarios' });
    }

    const transaccion = await TransaccionService.createTransaccion(transaccionData);

    res.status(201).json({
      message: 'Transacción creada exitosamente',
      transaccion
    });
  } catch (error: any) {
    res.status(400).json({ 
      error: error.message || 'Error al crear transacción'
    });
  }
});

// GET /api/transacciones
router.get('/', getTransaccionesValidation, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 Consultando transacciones con filtros:', req.query);
    console.log('👤 Usuario autenticado:', req.user);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Errores de validación en filtros:', errors.array());
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const filters: TransaccionFilters = {
      // Los administradores pueden ver todas las transacciones, los usuarios normales solo las suyas
      id_usuario: req.user.rol === 'admin' ? undefined : req.user.id,
      tipo: req.query.tipo as any,
      fecha_desde: req.query.fecha_desde as string,
      fecha_hasta: req.query.fecha_hasta as string,
      limite: req.query.limite ? parseInt(req.query.limite as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    // Los administradores ven todas las transacciones, los usuarios normales solo las suyas
    const transacciones = req.user.rol === 'admin' 
      ? await TransaccionService.getAllTransacciones(filters)
      : await TransaccionService.getTransaccionesByUser(req.user.id, filters);

    res.json({ transacciones });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener transacciones'
    });
  }
});

// GET /api/transacciones/all (para administradores)
router.get('/all', getTransaccionesValidation, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Datos de validación incorrectos',
        details: errors.array()
      });
    }

    const filters: TransaccionFilters = {
      id_usuario: req.query.id_usuario ? parseInt(req.query.id_usuario as string) : undefined,
      tipo: req.query.tipo as any,
      fecha_desde: req.query.fecha_desde as string,
      fecha_hasta: req.query.fecha_hasta as string,
      limite: req.query.limite ? parseInt(req.query.limite as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const transacciones = await TransaccionService.getAllTransacciones(filters);

    res.json({ transacciones });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener todas las transacciones'
    });
  }
});

// GET /api/transacciones/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    console.log(`[STATS] Iniciando obtención de estadísticas para usuario: ${req.user?.id}`);
    
    if (!req.user) {
      console.log('[STATS] Error: Usuario no autenticado');
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    console.log(`[STATS] Obteniendo estadísticas para usuario ID: ${req.user.id}`);
    const stats = await TransaccionService.getTransaccionesStats(req.user.id);
    console.log(`[STATS] Estadísticas obtenidas:`, stats);

    res.json({ stats });
  } catch (error: any) {
    console.log(`[STATS] Error al obtener estadísticas:`, error);
    res.status(500).json({ 
      error: error.message || 'Error al obtener estadísticas de transacciones'
    });
  }
});

// GET /api/transacciones/videos - Obtener videos generados por el usuario
router.get('/videos', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener parámetros de paginación
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 12;
    const offset = (page - 1) * perPage;

    console.log(`[VIDEOS] Obteniendo videos para usuario: ${req.user.id}, página: ${page}, por página: ${perPage}`);
    
    // Primero obtener el total de videos para calcular paginación
    const countSql = `
      SELECT COUNT(*) as total
      FROM transacciones t
      WHERE t.id_usuario = ? 
      AND t.tipo = 'penalizacion' 
      AND t.descripcion LIKE '%Generación de video%'
    `;
    
    const [countRows] = await db.execute(countSql, [req.user.id]) as any[];
    const totalVideos = countRows[0].total;
    const totalPages = Math.ceil(totalVideos / perPage);

    // Obtener las transacciones de video con paginación
    const sql = `
      SELECT t.*, u.nombre_usuario, u.email
      FROM transacciones t
      LEFT JOIN users u ON t.id_usuario = u.id
      WHERE t.id_usuario = ?
      AND t.tipo = 'penalizacion'
      AND t.descripcion LIKE '%Generación de video%'
      ORDER BY t.fecha DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;
    
    const [rows] = await db.execute(sql, [req.user.id]) as any[];
    
    const transacciones = rows.map((row: any) => ({
      id: row.id,
      id_usuario: row.id_usuario,
      tipo: row.tipo,
      descripcion: row.descripcion,
      cantidad_puntos: row.cantidad_puntos,
      fecha: row.fecha,
      usuario: {
        id: row.id_usuario,
        nombre_usuario: row.nombre_usuario,
        email: row.email
      }
    }));
    
    // Extraer información de los videos
    const videos = transacciones
      .map((transaccion: any) => {
        // Extraer video_id de la descripción: "Generación de video video_1761557421047_ll9likrpu - 10 puntos"
        // Patrón más flexible que acepta variaciones en el formato y captura todo el video_id
        // Usa \S+ para capturar cualquier secuencia de caracteres no-espacios después del patrón base
        const match = transaccion.descripcion.match(/Generación de video\s+(video_\d+_\S+?)(?:\s|$|-)/i);
        if (match) {
          const video_id = match[1].trim();
          const video_url = `https://rrss.navegatel.es/vids/${video_id}.mp4`;
          
          // Log para debuggear la extracción
          console.log(`[VIDEOS] Extraído video_id: "${video_id}" de descripción: "${transaccion.descripcion}"`);
          
          return {
            id: transaccion.id,
            video_id,
            video_url,
            fecha: transaccion.fecha,
            puntos_deducidos: Math.abs(transaccion.cantidad_puntos)
          };
        } else {
          // Log para debuggear videos que no coinciden con el patrón
          console.log(`[VIDEOS] No se pudo extraer video_id de: "${transaccion.descripcion}"`);
        }
        return null;
      })
      .filter((video: any) => video !== null);

    console.log(`[VIDEOS] Encontrados ${videos.length} videos para usuario ${req.user.id} (página ${page}/${totalPages})`);

    res.json({ 
      videos,
      total: totalVideos,
      totalPages,
      currentPage: page
    });
  } catch (error: any) {
    console.error('[VIDEOS] Error al obtener videos:', error);
    res.status(500).json({ 
      error: error.message || 'Error al obtener videos del usuario'
    });
  }
});

// GET /api/transacciones/publicaciones - Obtener videos publicados en redes sociales por el usuario
router.get('/publicaciones', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    console.log(`[PUBLICACIONES] Obteniendo publicaciones para usuario: ${req.user.id}`);
    
    // Obtener transacciones de publicaciones exitosas
    const sql = `
      SELECT t.*, u.nombre_usuario, u.email
      FROM transacciones t
      LEFT JOIN users u ON t.id_usuario = u.id
      WHERE t.id_usuario = ?
      AND t.tipo = 'penalizacion'
      AND t.descripcion LIKE '%Publicación de video%'
      AND t.descripcion LIKE '%en:%'
      ORDER BY t.fecha DESC
    `;
    
    const [rows] = await db.execute(sql, [req.user.id]) as any[];
    
    // Extraer información de las publicaciones
    const publicaciones = rows
      .map((row: any) => {
        // Extraer video_id y plataforma de la descripción: 
        // "Publicación de video video_123 en: Instagram" o
        // "Publicación de video video_123.mp4 en: TikTok"
        const match = row.descripcion.match(/Publicación de video ([a-zA-Z0-9_.-]+) en: ([a-zA-Z]+)/);
        if (match) {
          let video_id = match[1];
          const plataforma = match[2].toLowerCase();
          
          // Remover .mp4 si está presente en el video_id
          if (video_id.endsWith('.mp4')) {
            video_id = video_id.replace(/\.mp4$/, '');
          }
          
          return {
            id: row.id,
            video_id,
            video_url: `https://rrss.navegatel.es/vids/${video_id}.mp4`,
            plataforma,
            fecha: row.fecha,
            descripcion: row.descripcion
          };
        }
        return null;
      })
      .filter((pub: any) => pub !== null);

    console.log(`[PUBLICACIONES] Encontradas ${publicaciones.length} publicaciones para usuario ${req.user.id}`);

    res.json({ publicaciones });
  } catch (error: any) {
    console.error('[PUBLICACIONES] Error al obtener publicaciones:', error);
    res.status(500).json({ 
      error: error.message || 'Error al obtener publicaciones del usuario'
    });
  }
});

// GET /api/transacciones/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const transaccionId = parseInt(req.params.id);
    if (isNaN(transaccionId)) {
      return res.status(400).json({ error: 'ID de transacción inválido' });
    }

    const transaccion = await TransaccionService.getTransaccionById(transaccionId);
    if (!transaccion) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    // Verificar que el usuario solo puede ver sus propias transacciones
    if (req.user && req.user.id !== transaccion.id_usuario) {
      return res.status(403).json({ error: 'No tienes permisos para ver esta transacción' });
    }

    res.json({ transaccion });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al obtener transacción'
    });
  }
});

// DELETE /api/transacciones/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const transaccionId = parseInt(req.params.id);
    if (isNaN(transaccionId)) {
      return res.status(400).json({ error: 'ID de transacción inválido' });
    }

    // Primero verificar que la transacción existe y pertenece al usuario
    const transaccion = await TransaccionService.getTransaccionById(transaccionId);
    if (!transaccion) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    if (req.user && req.user.id !== transaccion.id_usuario) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta transacción' });
    }

    const deleted = await TransaccionService.deleteTransaccion(transaccionId);
    if (!deleted) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    res.json({ message: 'Transacción eliminada exitosamente' });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Error al eliminar transacción'
    });
  }
});

export default router;
