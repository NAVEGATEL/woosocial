import React, { useState, useEffect } from 'react';
import { promptTemplates, getAllCategories, PromptTemplate } from '../data/promptTemplates';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import toast from 'react-hot-toast';
import AILoader from './AILoader';

// Dropdown con los mismos estilos que los filtros de ProductGrid
const CategoryDropdown = ({
  label,
  valueLabel,
  options,
  onSelect,
  className = 'w-full'
}: {
  label: string;
  valueLabel: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (!open) return;
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer as any, { passive: true } as any);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer as any);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{valueLabel}</span>
        </span>
        <svg
          className={`h-4 w-4 text-gray-900 dark:text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      <div
        role="listbox"
        className={`absolute z-20 mt-2 w-full origin-top-right rounded-md bg-white dark:bg-gray-700 shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none transition-all duration-150 ease-out ${open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}
      >
        <ul className="max-h-60 overflow-auto py-1">
          {options.map((opt) => (
            <li key={String(opt.value)}>
              <button
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-600 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                role="option"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  stock_quantity: number | null;
  stock_status: string;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  }>;
}

interface PromptGeneratorProps {
  selectedProduct: WooCommerceProduct | null;
  onPromptGenerated: (prompt: string) => void;
}

const PromptGenerator: React.FC<PromptGeneratorProps> = ({
  selectedProduct,
  onPromptGenerated
}) => {
  // Eliminado campo de prompt personalizado independiente; usaremos un editor único siempre visible
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<'720' | '1080'>('1080');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingToWebhook, setIsSendingToWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState<string>('');
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [canGenerate, setCanGenerate] = useState<boolean>(false);
  const [isCheckingPoints, setIsCheckingPoints] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoId, setVideoId] = useState<string>('');
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [processingError, setProcessingError] = useState<string>('');

  const { user } = useAuth();
  const { theme } = useTheme();

  const categories = ['all', ...getAllCategories()];
  const filteredTemplates = selectedCategory === 'all'
    ? promptTemplates
    : promptTemplates.filter(template => template.category === selectedCategory);

  useEffect(() => {
    if (selectedTemplate) {
      generatePrompt();
    }
  }, [selectedTemplate, selectedQuality]);

  // Cargar preferencias del usuario para obtener la URL del webhook
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;

      setIsLoadingPreferences(true);
      try {
        const response = await apiService.getPreferencias();
        if (response.preferencias?.n8n_webhook) {
          setN8nWebhookUrl(response.preferencias.n8n_webhook);
        }
      } catch (error) {
        console.error('Error al cargar preferencias:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  // Verificar puntos del usuario
  useEffect(() => {
    const checkUserPoints = async () => {
      if (!user?.id) return;

      setIsCheckingPoints(true);
      try {
        const response = await apiService.checkUserPoints();
        setUserPoints(response.points);
        setCanGenerate(response.canGenerate);
      } catch (error) {
        console.error('Error al verificar puntos:', error);
      } finally {
        setIsCheckingPoints(false);
      }
    };

    checkUserPoints();
  }, [user?.id, user?.puntos]); // Escuchar cambios en ID y puntos del usuario

  // Actualizar tiempo de procesamiento cada segundo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessingVideo) {
      interval = setInterval(() => {
        // Forzar re-render para actualizar el tiempo
        setProcessingStartTime(prev => prev);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessingVideo]);

  // Conectar a Server-Sent Events para recibir notificaciones del callback
  useEffect(() => {
    if (!user?.id || !isProcessingVideo || !videoId) return;

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    // Polling con backoff (declaración hoistable)
    function startPolling() {
      console.log('🔄 Iniciando polling como respaldo...');
      let delayMs = 5000; // 5s inicial
      const maxDelayMs = 60000; // 60s máx

      const tick = async () => {
        try {
          const response = await fetch(`/api/video-callback/status/${videoId}?user_id=${user?.id}`);
          const data: any = await response.json();
          console.log('📊 Estado del video:', data);

          if (data.status === 'completed') {
            handleVideoCompleted({
              video_id: data.video_id,
              video_url: data.video_url,
              new_balance: data.new_balance,
              points_deducted: data.points_deducted
            });
            return;
          } else if (data.status === 'failed') {
            handleVideoFailed({
              video_id: data.video_id,
              message: data.message || 'La generación del video falló. No se descontaron puntos.',
              new_balance: data.new_balance
            });
            return;
          }
        } catch (err) {
          console.error('Error en polling:', err);
        }

        // Exponencial con tope
        delayMs = Math.min(delayMs + 5000, maxDelayMs);
        pollInterval = setTimeout(tick, delayMs) as any;
      };

      pollInterval = setTimeout(tick, delayMs) as any;
    }

    // Intentar conectar a SSE
    try {
      eventSource = new EventSource('/api/video-callback/stream', {
        withCredentials: true
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 SSE recibido:', data);

          if (data.type === 'video_completed' && data.video_id === videoId) {
            handleVideoCompleted(data);
          } else if (data.type === 'video_failed' && data.video_id === videoId) {
            handleVideoFailed(data);
          }
        } catch (error) {
          console.error('Error procesando SSE:', error);
        }
      };

      eventSource.onerror = (_error) => {
        console.error('Error en SSE:', _error);
        // Si SSE falla, iniciar polling como respaldo
        startPolling();
      };
    } catch (error) {
      console.error('Error conectando a SSE:', error);
      // Si no se puede conectar a SSE, usar polling
      startPolling();
    }

    // Función para manejar video completado
    const handleVideoCompleted = (data: any) => {
      console.log('🎬 Video completado:', data);
      setIsProcessingVideo(false);
      setWebhookStatus('success');
      setProcessingError('');

      // Guardar URL del video
      if (data.video_url) {
        setVideoUrl(data.video_url);
      }

      // Mostrar mensaje de éxito
      setSuccessData(data);
      setShowSuccessMessage(true);

      // Actualizar puntos del usuario
      setUserPoints(data.new_balance);
      setCanGenerate(data.new_balance >= 10);

      // Ocultar mensaje de éxito después de 8 segundos (solo el mensaje, no el video)
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessData(null);
      }, 8000);
    };

    // Función para manejar video fallido
    const handleVideoFailed = (data: any) => {
      console.log('❌ Video falló:', data);
      setIsProcessingVideo(false);
      setWebhookStatus('error');
      if (typeof data.new_balance === 'number') {
        setUserPoints(data.new_balance);
        setCanGenerate(data.new_balance >= 10);
      }
      setProcessingError(data.message || 'La generación del video falló. No se descontaron puntos.');
      setShowSuccessMessage(false);
    };

    // Función para polling como respaldo
    // startPolling ya declarado arriba

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [user?.id, isProcessingVideo, videoId]);

  const generatePrompt = () => {
    if (!selectedProduct) return;

    setIsGenerating(true);

    // Simular un pequeño delay para la generación
    setTimeout(() => {
      let prompt = selectedTemplate.template;
      
      // Reemplazar placeholders con información del producto
      prompt = prompt.replace(/\[Prenda\/objeto detectado\]/g, selectedProduct.name);
      prompt = prompt.replace(/\[Producto\]/g, selectedProduct.name);
      prompt = prompt.replace(/\[Producto tecnológico\]/g, selectedProduct.name);
      prompt = prompt.replace(/\[Producto\]/g, selectedProduct.name);

      // Reemplazar detalles específicos con información del producto
      const productDetails = [
        selectedProduct.categories.map(cat => cat.name).join(', '),
        selectedProduct.tags.map(tag => tag.name).join(', '),
        selectedProduct.short_description || selectedProduct.description,
        `Precio: $${selectedProduct.price}`,
        `SKU: ${selectedProduct.sku}`
      ].filter(Boolean);

      // Reemplazar placeholders de detalles
      for (let i = 1; i <= 4; i++) {
        const detailPlaceholder = new RegExp(`\\[detalle ${i}\\]`, 'g');
        const detailPlaceholderAlt = new RegExp(`\\[detalle ${i} opcional\\]`, 'g');
        const detailPlaceholderMacro = new RegExp(`\\[elemento natural ${i}\\]`, 'g');
        const detailPlaceholderTech = new RegExp(`\\[característica ${i}\\]`, 'g');
        const detailPlaceholderEssential = new RegExp(`\\[elemento esencial ${i}\\]`, 'g');
        const detailPlaceholderPremium = new RegExp(`\\[detalle premium ${i}\\]`, 'g');

        const detail = productDetails[i - 1] || `Detalle ${i} del producto`;

        prompt = prompt.replace(detailPlaceholder, detail);
        prompt = prompt.replace(detailPlaceholderAlt, detail);
        prompt = prompt.replace(detailPlaceholderMacro, detail);
        prompt = prompt.replace(detailPlaceholderTech, detail);
        prompt = prompt.replace(detailPlaceholderEssential, detail);
        prompt = prompt.replace(detailPlaceholderPremium, detail);
      }

      // Ajustar resolución según la calidad seleccionada
      if (selectedQuality === '720') {
        prompt = prompt.replace(/1080×1920/g, '720×1280');
        prompt = prompt.replace(/1920×1080/g, '1280×720');
        prompt = prompt.replace(/1080×1350/g, '720×900');
        prompt = prompt.replace(/1080×1080/g, '720×720');
      }

      // Si no hay template y no hay prompt aún, crear uno básico con reglas y datos del producto
      if (!selectedTemplate && !prompt.trim()) {
        prompt = (
          'No alteres ni reemplaces el producto de la imagen. Mantén forma, color, textura, proporciones y materiales EXACTOS. No inventes variantes. No añadas ni remuevas logos o marcas.\n' +
          'No muestres texto en pantalla (sin títulos, captions, lower-thirds, subtítulos, marcas de agua).\n' +
          'No añadas elementos ajenos ni props. Mantén fondo blanco puro, sombras suaves homogéneas.\n' +
          'Prohibido incluir personas o partes del cuerpo. Solo objeto inanimado.\n' +
          'Respeta la relación de aspecto y la resolución especificadas.\n\n' +
          `Target: sobre esta imagen, ${selectedProduct.name} presentado sobre fondo blanco limpio. Sin modelo.\n` +
          'Style: Cinematic, Minimalist, Clean Composition.\n' +
          'Lighting: Homogeneous studio lighting, very soft shadows.\n' +
          'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
          'Audio: Minimal ambient.\n'
        );
      }

      setGeneratedPrompt(prompt);
      onPromptGenerated(prompt);
      setIsGenerating(false);
    }, 500);
  };

  const copyToClipboard = async () => {
    try {
      const nav: any = (globalThis as any).navigator;
      if (nav && nav.clipboard) await nav.clipboard.writeText(generatedPrompt);
      // Aquí podrías agregar una notificación de éxito
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  const getProcessingTime = () => {
    if (!processingStartTime) return 0;
    return Math.floor((new Date().getTime() - processingStartTime.getTime()) / 1000);
  };

  const sendToWebhook = async () => {
    if (!selectedProduct || !generatedPrompt) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (!canGenerate) {
      toast.error(`No tienes suficientes puntos para generar un video. Necesitas 10 puntos, tienes ${userPoints}.`);
      return;
    }

    setIsSendingToWebhook(true);
    setWebhookStatus('idle');

    try {
      // Preparar datos para enviar al backend
      const webhookData = {
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          description: selectedProduct.description,
          short_description: selectedProduct.short_description,
          price: selectedProduct.price,
          sku: selectedProduct.sku,
          categories: selectedProduct.categories,
          tags: selectedProduct.tags,
          images: selectedProduct.images,
          stock_status: selectedProduct.stock_status,
          featured: selectedProduct.featured
        },
        prompt_config: {
          template: selectedTemplate ? {
            id: selectedTemplate.id,
            name: selectedTemplate.name,
            category: selectedTemplate.category,
            system: selectedTemplate.system || ''
          } : {
            id: 'custom',
            name: 'Custom',
            category: 'custom',
            system: ''
          },
          quality: selectedQuality,
          generated_prompt: generatedPrompt
        },
        timestamp: new Date().toISOString()
      };

      // Enviar al endpoint del backend que manejará la conexión con N8N
      const response = await apiService.sendToN8nWebhook(webhookData) as any;

      if (response.success) {
        // El backend genera el video_id y lo devuelve en la respuesta
        const videoId = response.video_id;
        if (videoId) {
          setVideoId(videoId);
        }
        setProcessingStartTime(new Date());

        // Iniciar estado de procesamiento
        setIsProcessingVideo(true);
        setWebhookStatus('idle');
        toast.success('Video en proceso de generación');

        // El callback real vendrá desde N8N cuando el video esté listo
        // vía los endpoints /api/video-callback/confirm o /api/video-callback/error
      } else {
        setWebhookStatus('error');
        toast.error(response.message || 'Error al enviar datos a N8N');
      }
    } catch (error: any) {
      console.error('Error al enviar al webhook:', error);
      setWebhookStatus('error');
      toast.error(error.message || 'Error al enviar datos a N8N');
    } finally {
      setIsSendingToWebhook(false);
    }
  };

  if (!selectedProduct) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Selecciona un producto</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Primero selecciona un producto para generar el prompt
          </p>
        </div>
      </div>
    );
  }

  // Mostrar pantalla de error si hubo fallo en la generación
  if (processingError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-2.5L13.73 4c-.77-.83-1.96-.83-2.73 0L3.34 16.5c-.77.83.19 2.5 1.73 2.5z" />
              </svg>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">❌ Hubo un problema generando tu video</h3>
          <p className="text-red-600 dark:text-red-400 mb-4 max-w-xl mx-auto">{processingError}</p>

          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
            <div className="text-sm text-red-800 dark:text-red-200 space-y-1">
              <p><strong>ID del Video:</strong> {videoId}</p>
              <p><strong>Producto:</strong> {selectedProduct.name}</p>
              <p><strong>Calidad:</strong> {selectedQuality}p</p>
              <p><strong>Template:</strong> {selectedTemplate?.name}</p>
            </div>
          </div>

          <div className="space-x-3">
            <button
              onClick={() => {
                setProcessingError('');
                setIsProcessingVideo(false);
                setWebhookStatus('idle');
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar loader de procesamiento si está procesando video
  if (isProcessingVideo) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          {/* Loader con SVG "AI" animado */}
          <div className="mb-6 flex justify-center">
            <AILoader />
          </div>

          {/* Mensaje principal */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            🎬 Generando tu video...
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Estamos procesando tu video con IA. Esto puede tomar varios minutos.
          </p>

          {/* Información del video */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p><strong>ID del Video:</strong> {videoId}</p>
              <p><strong>Producto:</strong> {selectedProduct.name}</p>
              <p><strong>Calidad:</strong> {selectedQuality}p</p>
              <p><strong>Template:</strong> {selectedTemplate?.name}</p>
            </div>
          </div>
          {/* Eliminados: tiempo transcurrido y secciones de tips/proceso */}
        </div>
      </div>
    );
  }

  // Mostrar video cuando esté completado
  if (videoUrl) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          {/* Mostrar mensaje de éxito solo si showSuccessMessage es true */}
          {showSuccessMessage && successData && (
            <>
              {/* Icono de éxito animado */}
              <div className="mx-auto mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {/* Efecto de ondas */}
                  <div className="absolute inset-0 w-20 h-20 bg-green-200 dark:bg-green-800 rounded-full animate-ping opacity-20"></div>
                  <div className="absolute inset-0 w-20 h-20 bg-green-300 dark:bg-green-700 rounded-full animate-ping opacity-10"></div>
                </div>
              </div>

              {/* Mensaje principal */}
              <h3 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-2">
                ✅ ¡Video Generado Exitosamente!
              </h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Tu video ha sido procesado y está listo
              </p>

              {/* Información del video */}
              <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-6 mb-6 max-w-md mx-auto">
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">ID del Video:</span>
                    <span className="font-mono text-xs">{successData.video_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Producto:</span>
                    <span className="text-right">{selectedProduct.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Puntos utilizados:</span>
                    <span className="text-red-600 font-semibold">-{successData.points_deducted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Nuevo balance:</span>
                    <span className="text-blue-600 font-semibold">{successData.new_balance} puntos</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Título del video si no hay mensaje de éxito */}
          {!showSuccessMessage && (
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              🎬 Tu Video Generado
            </h3>
          )}

          {/* Reproductor de video */}
          {videoUrl && (
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
                🎬 Tu Video Generado
              </h4>
              <div className="relative">
                <video
                  controls
                  className="w-full h-auto rounded-lg shadow-lg"
                  poster={selectedProduct.images[0]?.src}
                >
                  <source src={videoUrl} type="video/mp4" />
                  Tu navegador no soporta la reproducción de video.
                </video>
              </div>
              <div className="mt-4 text-center">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Video
                </a>
              </div>
            </div>
          )}

          {/* Mensaje de correo */}
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6 max-w-lg mx-auto">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  📧 Revisa tu correo electrónico
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Te hemos enviado el video generado a tu dirección de correo.
                  Revisa tu bandeja de entrada y la carpeta de spam.
                </p>
              </div>
            </div>
          </div>

          {/* Botón para generar otro video */}
          <div className="space-y-4">
            <button
              onClick={() => {
                setShowSuccessMessage(false);
                setSuccessData(null);
                setVideoUrl('');
                setSelectedTemplate(null);
                setSelectedQuality('1080');
                setSelectedCategory('all');
                setGeneratedPrompt('');
                setWebhookStatus('idle');
                setVideoId('');
                setProcessingStartTime(null);
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Generar Otro Video
            </button>
            
            <p className="text-xs text-gray-500">
              El mensaje se cerrará automáticamente en unos segundos
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-600">
     



      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
        
        <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-4">
        Generador de Prompts
      </h3>
          {/* Información del producto seleccionado */}
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 dark:border-purple-600 dark:bg-purple-700/50 rounded-lg ">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-[60px] h-[60px] bg-gray-200  rounded-lg overflow-hidden">
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <img
                      src={`/api/woocommerce/proxy-image?url=${encodeURIComponent(selectedProduct.images[0].src)}`}
                      alt={selectedProduct.images[0].alt || selectedProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        const img = e.currentTarget as any;
                        if (img && img.style) img.style.display = 'none';
                        const sib: any = img?.nextElementSibling;
                        if (sib && sib.classList) sib.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 hidden">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200">{selectedProduct.name}</h4>
                <p className="text-xs text-purple-700 dark:text-purple-200 mt-1">
                  {selectedProduct.categories.map(cat => cat.name).join(', ')}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-200 mt-1">${selectedProduct.price}</p>
              </div>
            </div>
          </div>


          {/* Selector de calidad */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Calidad de Video
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="720"
                  checked={selectedQuality === '720'}
                  onChange={(e) => setSelectedQuality(e.target.value as '720' | '1080')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">720p (HD)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="1080"
                  checked={selectedQuality === '1080'}
                  onChange={(e) => setSelectedQuality(e.target.value as '720' | '1080')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">1080p (Full HD)</span>
              </label>
            </div>
          </div>
          {/* Selector de categoría de templates (estilo igual a filtros de ProductGrid) */}
          <div className="mb-6">
            <CategoryDropdown
              label="Categoría de Template"
              valueLabel={
                selectedCategory === 'all'
                  ? 'Todas las categorías'
                  : selectedCategory
              }
              options={categories.map((c) => ({
                value: c,
                label: c === 'all' ? 'Todas las categorías' : c
              }))}
              onSelect={(val) => setSelectedCategory(val)}
            />
          </div>



        </div>
        {/* Editor principal de prompt: siempre visible y editable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Prompt
          </label>
          <textarea
            value={generatedPrompt}
            onChange={(e) => setGeneratedPrompt(e.target.value)}
            placeholder="Selecciona un template o escribe tu prompt aquí..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 dark:text-white"
            rows={10}
          />
          {/* Acciones para el prompt */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Puedes editar el texto antes de generar.</span>
              <button
                onClick={copyToClipboard}
                className="dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar
              </button>
            </div>
            {isGenerating && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Generando...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selector de template */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Template de Prompt
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                selectedTemplate?.id === template.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/50 ring-2 ring-purple-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                    {template.category}
                  </span>
                </div>
                {/* Icono de selección 
                {selectedTemplate?.id === template.id && (
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-6 h-6 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
*/}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón Generar y Estado del Webhook */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {webhookStatus === 'success' && (
              <div className="flex items-center text-green-600 mb-4">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">¡Enviado exitosamente a N8N!</span>
              </div>
            )}

            {webhookStatus === 'error' && (
              <div className="flex items-center text-red-600 mb-4">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-medium">Error al enviar. Intenta de nuevo.</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col ">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-400">
            Puntos disponibles: {isCheckingPoints ? '...' : userPoints}
          </span>
          <button
            onClick={sendToWebhook}
            disabled={isSendingToWebhook || !selectedTemplate || !canGenerate || isCheckingPoints || !generatedPrompt || !generatedPrompt.trim()}
            className="w-[fit-content] inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isCheckingPoints ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Verificando puntos...
              </>
            ) : isSendingToWebhook ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : !canGenerate ? (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Sin puntos suficientes
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Generar Video (10 pts)
              </>
            )}
          </button>
        </div>


        {!n8nWebhookUrl && !isLoadingPreferences && (
          <p className="mt-2 text-sm text-red-600">
            ⚠️ No se ha configurado la URL del webhook de N8N.
            <a href="/preferencias" className="underline font-medium ml-1">
              Ve a Preferencias para configurarlo
            </a>
          </p>
        )}
      </div>
    </div>
  );
};

export default PromptGenerator;
