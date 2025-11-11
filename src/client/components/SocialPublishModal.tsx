import React, { useState, useEffect } from 'react';
import { FaInstagram, FaTiktok, FaFacebook, FaMobileAlt, FaMagic } from 'react-icons/fa';
import { Video } from '../types';
import { apiService } from '../services/api';
import AILoader from './AILoader';
import { generateSocialContent } from '../services/gemini';

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

  const [customContent, setCustomContent] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  
  // Estados para generación con IA
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTargetAudience, setAiTargetAudience] = useState('');
  const [aiPostGoal, setAiPostGoal] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);


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

  const handleGenerateAIContent = async () => {
    const selectedPlatforms = getSelectedPlatforms();
    if (selectedPlatforms.length === 0) {
      setAiError('Por favor selecciona al menos una red social antes de generar contenido');
      return;
    }

    if (!aiTargetAudience || !aiPostGoal) {
      setAiError('Por favor completa todos los campos requeridos');
      return;
    }

    if (!video || !video.video_url) {
      setAiError('No se pudo obtener la URL del video');
      return;
    }

    try {
      setGeneratingAI(true);
      setAiError(null);

      // Generar contenido para la primera plataforma seleccionada
      // (puedes expandir esto para generar para todas)
      const firstPlatform = selectedPlatforms[0].id as 'tiktok' | 'instagram' | 'facebook';
      
      const result = await generateSocialContent({
        platform: firstPlatform,
        videoUrl: video.video_url,
        targetAudience: aiTargetAudience,
        postGoal: aiPostGoal,
        productName: product?.name,
        productDescription: product?.description || product?.short_description
      });

      // Actualizar el contenido generado
      setCustomContent(result.text);
      setSelectedHashtags(result.hashtags);
      
      // Cerrar el modal de IA
      setShowAIModal(false);
      
      // Resetear campos
      setAiTargetAudience('');
      setAiPostGoal('');
    } catch (error: any) {
      console.error('Error al generar contenido con IA:', error);
      setAiError(error.message || 'Error al generar contenido con IA');
    } finally {
      setGeneratingAI(false);
    }
  };

  const renderSinglePreview = (platform: SocialPlatform) => {
    const content = customContent;
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
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg text-green-800 dark:text-green-200">
              <p className="font-semibold">✓ TODO LISTO PARA PUBLICAR</p>
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
                    <AILoader className="w-24 h-24 mx-auto" />
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

              {/* Generación con IA */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Generar Contenido Automático</h3>
                <button
                  onClick={() => setShowAIModal(true)}
                  disabled={getSelectedPlatforms().length === 0}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-800 text-base font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
                >
                  <FaMagic size={18} />
                  <span>Generar Contenido con IA</span>
                </button>
              </div>

              {/* Contenido y Hashtags Generados */}
              {(customContent || selectedHashtags.length > 0) && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-700 dark:text-green-200">
                    <span className="text-xl">✅</span>
                    <h3 className="font-semibold">Contenido Generado por IA</h3>
                  </div>
                  
                  {customContent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Texto del Post:
                      </label>
                      <textarea
                        value={customContent}
                        onChange={(e) => setCustomContent(e.target.value)}
                        className="w-full h-32 p-3 border border-green-300 dark:border-green-600 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}
                  
                  {selectedHashtags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hashtags Sugeridos:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedHashtags.map((hashtag, index) => (
                          <button
                            key={index}
                            onClick={() => toggleHashtag(hashtag)}
                            className="px-3 py-1 rounded-full text-sm bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 transition-all"
                          >
                            {hashtag}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Haz clic en un hashtag para quitarlo
                      </p>
                    </div>
                  )}
                </div>
              )}
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
                  if (selectedPlatforms.length === 0) {
                    setPublishError('Selecciona al menos una red social');
                    return;
                  }
                  
                  if (!customContent) {
                    setPublishError('Genera contenido con IA antes de publicar');
                    return;
                  }

                  try {
                    setPublishing(true);
                    setPublishError(null);
                    setPublishSuccess(false);

                    // Combinar contenido y hashtags para el mensaje
                    const fullMessage = [
                      customContent,
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
                disabled={platforms.filter(p => p.selected).length === 0 || publishing || !customContent}
                className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? 'Publicando...' : publishSuccess ? '✓ Publicado' : !customContent ? 'Genera contenido primero' : webhookConfigured === false ? 'Configurar Webhook' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Generación con IA */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <FaMagic className="text-purple-500" size={24} />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Generar Contenido con IA</h2>
              </div>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setAiError(null);
                }}
                disabled={generatingAI}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Indicador de generación activo */}
              {generatingAI ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <AILoader className="w-24 h-24 mb-6" />
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    Creando el post perfecto para ti
                  </p>
                </div>
              ) : (
                <>
                  {aiError && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-200">
                      {aiError}
                    </div>
                  )}

                  <div className="space-y-4">
                {video && (
                 
                  
                    <div className="aspect-video bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden">
                      <video
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        controls={false}
                      />
                    </div>
                    
                  
                )}

                <div>
                  <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                    Público objetivo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={aiTargetAudience}
                    onChange={(e) => setAiTargetAudience(e.target.value)}
                    disabled={generatingAI}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Ej: Madres jóvenes de 25-35 años, interesadas en productos para el hogar"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Define quién es tu audiencia ideal: edad, intereses, comportamiento
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                    Objetivo de la publicación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={aiPostGoal}
                    onChange={(e) => setAiPostGoal(e.target.value)}
                    disabled={generatingAI}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Ej: Generar ventas, aumentar seguidores, crear engagement, educar"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ¿Qué quieres lograr con esta publicación?
                  </p>
                </div>

                {product && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>📦 Producto detectado:</strong> {product.name}
                      {product?.description && (
                        <span className="block mt-1 text-xs">{product.description.substring(0, 150)}...</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAIModal(false);
                    setAiError(null);
                  }}
                  disabled={generatingAI}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerateAIContent}
                  disabled={generatingAI || !aiTargetAudience || !aiPostGoal}
                  className="px-6 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {generatingAI ? (
                    <>
                      <AILoader className="w-5 h-5" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <FaMagic size={16} />
                      <span>Generar Contenido</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialPublishModal;
