import React, { useState, useEffect } from 'react';
import { FaInstagram, FaTiktok, FaFacebook, FaMobileAlt } from 'react-icons/fa';
import { Video } from '../types';
import { apiService } from '../services/api';

interface WooCommerceProduct {
  id: number;
  name: string;
  price?: string;
  description?: string;
  short_description?: string;
  [key: string]: any;
}

interface SocialPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
  product?: WooCommerceProduct | null;
  onInstagramSuccess?: (videoId: string) => void;
  onInstagramError?: (videoId: string, errorMessage?: string) => void;
  onTikTokSuccess?: (videoId: string) => void;
  onTikTokError?: (videoId: string, errorMessage?: string) => void;
  onFacebookSuccess?: (videoId: string) => void;
  onFacebookError?: (videoId: string, errorMessage?: string) => void;
  onExternalError?: (videoId: string, errorMessage?: string) => void;
  userId?: number;
}

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  selected: boolean;
  account_id?: string | null;
}

interface SocialTemplate {
  id: string;
  name: string;
  content: string;
  hashtags: string[];
  emojis: string[];
}

const SocialPublishModal: React.FC<SocialPublishModalProps> = ({ 
  isOpen, 
  onClose, 
  video, 
  product,
  onInstagramSuccess,
  onInstagramError,
  onTikTokSuccess,
  onTikTokError,
  onFacebookSuccess,
  onFacebookError,
  onExternalError,
  userId
}) => {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState<boolean | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);

  const [templates, setTemplates] = useState<SocialTemplate[]>([
    {
      id: 'product-showcase',
      name: 'Mostrar Producto',
      content: '¡Mira este increíble producto! 🛍️\n\n{product_name} - {product_description}\n\n✨ Características destacadas:\n• {feature1}\n• {feature2}\n• {feature3}\n\n💰 Precio: {price}\n🔗 Enlace: {product_url}',
      hashtags: ['#producto', '#oferta', '#calidad', '#recomendado'],
      emojis: ['🛍️', '✨', '💰', '🔗', '⭐']
    },
    {
      id: 'tutorial',
      name: 'Tutorial',
      content: '📚 Tutorial paso a paso\n\nAprende cómo usar {product_name} de manera efectiva:\n\n1️⃣ {step1}\n2️⃣ {step2}\n3️⃣ {step3}\n\n💡 Consejo: {tip}\n\n¿Te gustó? ¡Déjame tu comentario! 👇',
      hashtags: ['#tutorial', '#aprende', '#tips', '#educativo'],
      emojis: ['📚', '💡', '👆', '👇', '🎯']
    },
    {
      id: 'lifestyle',
      name: 'Estilo de Vida',
      content: '✨ Mi día con {product_name}\n\n{personal_story}\n\nEste producto ha cambiado mi rutina de {activity} completamente. ¡No puedo vivir sin él! 😍\n\n¿Has probado algo similar? Cuéntame tu experiencia 💬',
      hashtags: ['#lifestyle', '#rutina', '#experiencia', '#recomendacion'],
      emojis: ['✨', '😍', '💬', '❤️', '🌟']
    },
    {
      id: 'promotion',
      name: 'Promoción',
      content: '🎉 ¡OFERTA ESPECIAL! 🎉\n\n{product_name} con descuento del {discount}%\n\n⏰ Solo por tiempo limitado\n💰 Precio original: {original_price}\n💸 Precio con descuento: {discounted_price}\n\n🚀 ¡No te lo pierdas!',
      hashtags: ['#oferta', '#descuento', '#promocion', '#ahorro'],
      emojis: ['🎉', '⏰', '💰', '💸', '🚀']
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState<SocialTemplate | null>(null);
  const [customContent, setCustomContent] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [manualProductName, setManualProductName] = useState('');

  // Función para reemplazar placeholders en los templates
  const replaceTemplatePlaceholders = (content: string): string => {
    // Usar producto si está disponible, si no usar el nombre manual
    const productName = product?.name || manualProductName || 'Producto';
    const productDescription = product?.description || product?.short_description || 'Descripción del producto';
    const productPrice = product?.price || 'Precio no disponible';
    
    if (!product && !manualProductName) return content;
    
    return content
      .replace(/\{product_name\}/g, productName)
      .replace(/\{product_description\}/g, productDescription)
      .replace(/\{price\}/g, productPrice)
      .replace(/\{original_price\}/g, product?.regular_price || product?.price || 'Precio original')
      .replace(/\{discounted_price\}/g, product?.sale_price || product?.price || 'Precio con descuento')
      .replace(/\{discount\}/g, product?.regular_price && product?.sale_price 
        ? Math.round(((parseFloat(product.regular_price) - parseFloat(product.sale_price)) / parseFloat(product.regular_price)) * 100).toString()
        : 'XX')
      .replace(/\{feature1\}/g, 'Característica destacada 1')
      .replace(/\{feature2\}/g, 'Característica destacada 2')
      .replace(/\{feature3\}/g, 'Característica destacada 3')
      .replace(/\{step1\}/g, 'Paso 1')
      .replace(/\{step2\}/g, 'Paso 2')
      .replace(/\{step3\}/g, 'Paso 3')
      .replace(/\{tip\}/g, 'Consejo útil')
      .replace(/\{personal_story\}/g, 'Mi experiencia personal')
      .replace(/\{activity\}/g, 'actividad')
      .replace(/\{product_url\}/g, product?.permalink || '#');
  };

  // Obtener conexiones sociales conectadas al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchConnectedPlatforms();
      fetchUserPreferences();
    }
  }, [isOpen]);

  const fetchUserPreferences = async () => {
    try {
      const response = await apiService.getPreferencias();
      if (response.preferencias && response.preferencias.n8n_redes) {
        setWebhookConfigured(true);
        setWebhookUrl(response.preferencias.n8n_redes);
      } else {
        setWebhookConfigured(false);
        setWebhookUrl(null);
      }
    } catch (error: any) {
      console.error('Error al obtener preferencias:', error);
      setWebhookConfigured(false);
      setWebhookUrl(null);
    }
  };

  const fetchConnectedPlatforms = async () => {
    try {
      setLoadingConnections(true);
      const response = await apiService.getSocialConnections();
      
      // Mapeo de plataformas disponibles
      const allPlatforms = [
        { id: 'instagram', name: 'Instagram', icon: <FaInstagram size={20} />, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
        { id: 'tiktok', name: 'TikTok', icon: <FaTiktok size={20} />, color: 'bg-gradient-to-r from-pink-500 to-red-500' },
        { id: 'facebook', name: 'Facebook', icon: <FaFacebook size={20} />, color: 'bg-blue-600' }
      ];

      // Filtrar solo las que están conectadas
      const connectedPlatforms = allPlatforms
        .filter(platform => {
          const connection = response.connections.find(c => c.plataforma === platform.id);
          return connection?.connected === true;
        })
        .map(platform => {
          const connection = response.connections.find(c => c.plataforma === platform.id);
          return {
            ...platform,
            selected: false,
            account_id: connection?.account_id || null
          };
        });

      setPlatforms(connectedPlatforms);
    } catch (error: any) {
      console.error('Error al obtener conexiones sociales:', error);
      // Si hay error, no mostrar ninguna plataforma
      setPlatforms([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      const processedContent = replaceTemplatePlaceholders(selectedTemplate.content);
      setCustomContent(processedContent);
      setSelectedHashtags(selectedTemplate.hashtags);
    }
  }, [selectedTemplate, product, manualProductName]);

  const togglePlatform = (platformId: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, selected: !p.selected } : p
    ));
  };

  const toggleHashtag = (hashtag: string) => {
    setSelectedHashtags(prev => 
      prev.includes(hashtag) 
        ? prev.filter(h => h !== hashtag)
        : [...prev, hashtag]
    );
  };

  const getSelectedPlatforms = () => {
    return platforms.filter(p => p.selected);
  };

  const renderSinglePreview = (platform: SocialPlatform) => {
    const content = replaceTemplatePlaceholders(customContent);
    const hashtags = selectedHashtags;

    switch (platform.id) {
      case 'instagram':
        return (
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 max-w-sm mx-auto">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {platform.icon}
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-white">tu_cuenta</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Hace 1 min</div>
              </div>
            </div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
              <video 
                src={video?.video_url} 
                className="w-full h-full object-cover rounded-lg"
                controls={false}
              />
            </div>
            <div className="text-sm text-gray-900 dark:text-white">
              <div className="whitespace-pre-line mb-2">{content}</div>
              <div className="text-blue-600 dark:text-blue-400">
                {hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex space-x-4 text-gray-500 dark:text-gray-400">
                <span>❤️ 0</span>
                <span>💬 0</span>
                <span>📤 0</span>
              </div>
            </div>
          </div>
        );

      case 'tiktok':
        return (
          <div className="bg-black text-white rounded-lg p-4 max-w-sm mx-auto">
            <div className="aspect-[9/16] bg-gray-800 rounded-lg mb-3 flex items-center justify-center relative">
              <video 
                src={video?.video_url} 
                className="w-full h-full object-cover rounded-lg"
                controls={false}
              />
              <div className="absolute bottom-4 right-4">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                  {platform.icon}
                </div>
              </div>
            </div>
            <div className="text-sm">
              <div className="font-semibold mb-1">@tu_cuenta</div>
              <div className="whitespace-pre-line mb-2">{content}</div>
              <div className="text-blue-400">
                {hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}
              </div>
            </div>
          </div>
        );

      case 'facebook':
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 max-w-sm mx-auto">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {platform.icon}
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-white">Tu Nombre</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Hace 1 min</div>
              </div>
            </div>
            <div className="text-sm mb-3 text-gray-900 dark:text-white">
              <div className="whitespace-pre-line">{content}</div>
              <div className="text-blue-600 dark:text-blue-400 mt-2">
                {hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}
              </div>
            </div>
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
              <video 
                src={video?.video_url} 
                className="w-full h-full object-cover rounded-lg"
                controls={false}
              />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex space-x-4 text-gray-500 dark:text-gray-400">
                <span>👍 0</span>
                <span>💬 0</span>
                <span>📤 0</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderAllPreviews = () => {
    const selectedPlatforms = getSelectedPlatforms();
    
    if (selectedPlatforms.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="flex justify-center mb-2">
            <FaMobileAlt className="text-gray-400 dark:text-gray-500" size={48} />
          </div>
          <div className="text-gray-500 dark:text-gray-400">Selecciona al menos una red social para ver la vista previa</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {selectedPlatforms.map(platform => (
          <div key={platform.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <span className="flex items-center justify-center">{platform.icon}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{platform.name}</span>
            </div>
            {renderSinglePreview(platform)}
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Publicar en Redes Sociales</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Mensajes de error/éxito */}
          {publishError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-200">
              {publishError}
            </div>
          )}
          {publishSuccess && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-200">
              ¡Publicación enviada exitosamente al webhook!
            </div>
          )}
          {/* Información del webhook */}
          {webhookConfigured === false && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-800 dark:text-yellow-200">
              <p className="font-semibold">Automatización no configurada</p>
            </div>
          )}
          {webhookConfigured === true && webhookUrl && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">✓ Webhook configurado</p>
              <p className="text-sm break-all">
                URL: {webhookUrl}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              {/* Video Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Video Seleccionado</h3>
                <div className="aspect-video bg-gray-200 dark:bg-gray-600 rounded-lg mb-2">
                  <video
                    src={video.video_url}
                    controls
                    className="w-full h-full rounded-lg"
                  />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div>ID: {video.video_id}</div>
                  <div>Fecha: {new Date(video.fecha).toLocaleDateString('es-ES')}</div>
                  {product && (
                    <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                      <div className="font-medium text-gray-900 dark:text-white">Producto:</div>
                      <div className="text-gray-600 dark:text-gray-300">{product.name}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Platform Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Seleccionar Redes Sociales</h3>
                {loadingConnections ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando conexiones...</p>
                  </div>
                ) : platforms.length === 0 ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      No tienes redes sociales conectadas. Ve a <strong>Preferencias</strong> para conectar tus cuentas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {platforms.map(platform => (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          platform.selected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-600'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg flex items-center justify-center">{platform.icon}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{platform.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Template Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Templates de Publicación</h3>
                <div className="space-y-2">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900 dark:border-purple-600'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{template.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {template.content.substring(0, 100)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Name Input (si no hay producto) */}
              {!product && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Nombre del Producto</h3>
                  <input
                    type="text"
                    value={manualProductName}
                    onChange={(e) => setManualProductName(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Ingresa el nombre del producto..."
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Este nombre se usará para reemplazar {`{product_name}`} en los templates</p>
                </div>
              )}

              {/* Custom Content */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Contenido Personalizado</h3>
                <textarea
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Escribe tu contenido personalizado aquí..."
                />
              </div>

              {/* Hashtags */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Hashtags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate?.hashtags.map(hashtag => (
                    <button
                      key={hashtag}
                      onClick={() => toggleHashtag(hashtag)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        selectedHashtags.includes(hashtag)
                          ? 'bg-purple-500 dark:bg-purple-600 text-white hover:bg-purple-600 dark:hover:bg-purple-700'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {hashtag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div>
              <div className="sticky top-0">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Vista Previa de Todas las Redes</h3>
                
                {/* Preview */}
                <div className="max-h-[70vh] overflow-y-auto">
                  {renderAllPreviews()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {platforms.filter(p => p.selected).length} red{platforms.filter(p => p.selected).length !== 1 ? 'es' : ''} seleccionada{platforms.filter(p => p.selected).length !== 1 ? 's' : ''}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const selectedPlatforms = platforms.filter(p => p.selected);
                  if (selectedPlatforms.length === 0) return;

                  try {
                    setPublishing(true);
                    setPublishError(null);
                    setPublishSuccess(false);

                    // Combinar contenido y hashtags para el mensaje
                    // Aplicar reemplazo de placeholders al mensaje final también
                    const processedContent = replaceTemplatePlaceholders(customContent);
                    const fullMessage = [
                      processedContent,
                      selectedHashtags.length > 0 ? selectedHashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ') : ''
                    ].filter(Boolean).join('\n\n');

                    // Preparar datos con plataforma y account_id
                    const socialPlatformsData = selectedPlatforms.map(p => ({
                      plataforma: p.id,
                      account_id: p.account_id || null
                    }));

                    await apiService.publishToSocialMedia({
                      video_id: video.video_id,
                      social_platforms: socialPlatformsData,
                      message: fullMessage
                    });

                    setPublishSuccess(true);
                    setTimeout(() => {
                      onClose();
                      setPublishSuccess(false);
                    }, 1500);
                  } catch (error: any) {
                    console.error('Error al publicar:', error);
                    const errorMessage = error.message || 'Error al publicar en redes sociales';
                    setPublishError(errorMessage);
                    
                    // Llamar callback de error externo si está disponible y hay userId
                    if (onExternalError && userId && video) {
                      try {
                        await onExternalError(video.video_id, errorMessage);
                      } catch (callbackError) {
                        console.error('Error al llamar callback de error externo:', callbackError);
                      }
                    }
                  } finally {
                    setPublishing(false);
                  }
                }}
                disabled={platforms.filter(p => p.selected).length === 0 || publishing}
                className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? 'Publicando...' : publishSuccess ? '✓ Publicado' : webhookConfigured === false ? 'Configurar Webhook' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialPublishModal;
