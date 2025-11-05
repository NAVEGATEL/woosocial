import React, { useState, useEffect } from 'react';
import { Publicacion } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { FaInstagram, FaTiktok, FaFacebook, FaMobileAlt } from 'react-icons/fa';

const Publicaciones: React.FC = () => {
  const { user } = useAuth();
  const [allPublicaciones, setAllPublicaciones] = useState<Publicacion[]>([]);
  const [filteredPublicaciones, setFilteredPublicaciones] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'instagram' | 'tiktok' | 'facebook'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
      fetchPublicaciones();
    }
  }, [user]);

  const fetchPublicaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getPublicaciones();
      // Ordenar por fecha descendente
      const sorted = [...response.publicaciones].sort((a, b) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      setAllPublicaciones(sorted);
      applyFilters(sorted);
    } catch (err: any) {
      console.error('Error al obtener publicaciones:', err);
      setError(err.message || 'Error al cargar las publicaciones');
      setAllPublicaciones([]);
      setFilteredPublicaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (source: Publicacion[]) => {
    let filtered = [...source];

    // Filtro por plataforma
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(p => p.plataforma === selectedPlatform);
    }

    // Búsqueda por video_id
    if (search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(p =>
        p.video_id.toLowerCase().includes(q)
      );
    }

    setFilteredPublicaciones(filtered);
  };

  useEffect(() => {
    applyFilters(allPublicaciones);
  }, [selectedPlatform, search, allPublicaciones]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <FaInstagram className="text-pink-500" size={20} />;
      case 'tiktok':
        return <FaTiktok className="text-black dark:text-white" size={20} />;
      case 'facebook':
        return <FaFacebook className="text-blue-600" size={20} />;
      default:
        return null;
    }
  };

  const getPlatformBadge = (platform: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (platform) {
      case 'instagram':
        return `${baseClasses} bg-gradient-to-r from-purple-500 to-pink-500 text-white`;
      case 'tiktok':
        return `${baseClasses} bg-black dark:bg-gray-800 text-white`;
      case 'facebook':
        return `${baseClasses} bg-blue-600 text-white`;
      default:
        return `${baseClasses} bg-gray-500 text-white`;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'Instagram';
      case 'tiktok':
        return 'TikTok';
      case 'facebook':
        return 'Facebook';
      default:
        return platform;
    }
  };

  const publicacionesByPlatform = filteredPublicaciones.reduce((acc, pub) => {
    if (!acc[pub.plataforma]) {
      acc[pub.plataforma] = [];
    }
    acc[pub.plataforma].push(pub);
    return acc;
  }, {} as Record<string, Publicacion[]>);

  const totalPublicaciones = filteredPublicaciones.length;
  const instagramCount = allPublicaciones.filter(p => p.plataforma === 'instagram').length;
  const tiktokCount = allPublicaciones.filter(p => p.plataforma === 'tiktok').length;
  const facebookCount = allPublicaciones.filter(p => p.plataforma === 'facebook').length;

  return (
    <div className="space-y-6 px-4 sm:px-0">
      {/* Header con información de publicaciones */}
      <div className="flex flex-col xl:flex-row justify-between ">
        <div className="flex flex-col mt-4">
          <div className="flex items-center space-x-3 w-[200px]">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Publicaciones</h2>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-400">
            Mostrando {totalPublicaciones} publicación{totalPublicaciones !== 1 ? 'es' : ''}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="min-w-[200px] mt-6">
            <input
              type="text"
              className="block w-full px-2 h-8 sm:w-[235px] border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-900 dark:placeholder-gray-400"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          {/* Filtro por plataforma */}
          <div className="flex gap-4 flex-wrap mt-0 lg:mt-6">
            <button
              onClick={() => setSelectedPlatform('all')}
              className={`px-2 h-8 w-[80px] rounded-md text-sm font-medium transition-colors ${selectedPlatform === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                }`}
            >
              Todas ({allPublicaciones.length})
            </button>
            <button
              onClick={() => setSelectedPlatform('instagram')}
              className={`px-2 h-8 w-[130px] rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${selectedPlatform === 'instagram'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                }`}
            >
              <FaInstagram size={16} />
              Instagram ({instagramCount})
            </button>
            <button
              onClick={() => setSelectedPlatform('tiktok')}
              className={`px-2 h-8 w-[110px] rounded-md text-sm font-medium transition-colors flex items-center gap-2 border-2 ${selectedPlatform === 'tiktok'
                  ? 'dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 border-transparent'
                }`}
            >
              <FaTiktok size={16} />
              TikTok ({tiktokCount})
            </button>
            <button
              onClick={() => setSelectedPlatform('facebook')}
              className={`px-2 h-8 w-[125px] rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${selectedPlatform === 'facebook'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                }`}
            >
              <FaFacebook size={16} />
              Facebook ({facebookCount})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-white text-lg">Cargando publicaciones...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-6 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error al cargar publicaciones</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchPublicaciones}
                  className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {!loading && !error && totalPublicaciones === 0 && (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <FaMobileAlt className="text-gray-400 dark:text-gray-500" size={96} />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              {selectedPlatform === 'all' 
                ? 'No tienes publicaciones' 
                : `No tienes publicaciones en ${getPlatformName(selectedPlatform)}`}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Cuando publiques videos en redes sociales, aparecerán aquí.
            </p>
            <button
              onClick={() => (window.location.href = '/generaciones')}
              className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700"
            >
              Ir a Generaciones
            </button>
          </div>
        )}

        {!loading && !error && totalPublicaciones > 0 && (
          <div className="space-y-8">
            {selectedPlatform === 'all' ? (
              // Mostrar por plataforma cuando se selecciona "Todas"
              Object.entries(publicacionesByPlatform).map(([platform, publicaciones]) => (
                <div key={platform} className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                    {getPlatformIcon(platform)}
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {getPlatformName(platform)}
                    </h2>
                    <span className={`${getPlatformBadge(platform)}`}>
                      {publicaciones.length}
                    </span>
                  </div>
                  <div className="product-grid">
                    {publicaciones.map((publicacion) => (
                      <div key={publicacion.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-600">
                        <div className="aspect-video bg-gray-200 flex items-center justify-center relative">
                          <video
                            src={publicacion.video_url}
                            controls
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as any;
                              if (target && target.style) {
                                target.style.display = 'none';
                              }
                              const parent = target ? (target as any).parentElement : null;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="flex flex-col items-center justify-center text-gray-500 p-4">
                                    <div class="text-4xl mb-2">🎬</div>
                                    <div class="text-sm text-center">Video no disponible</div>
                                  </div>
                                `;
                              }
                            }}
                          >
                            Tu navegador no soporta la reproducción de video.
                          </video>
                        </div>

                      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {publicacion.video_id}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          {formatDate(publicacion.fecha)}
                        </div>

                        <div className="flex items-center gap-2 mt-auto">
                          {getPlatformIcon(publicacion.plataforma)}
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Publicado en {getPlatformName(publicacion.plataforma)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Mostrar solo la plataforma seleccionada
            <div className="product-grid">
              {filteredPublicaciones.map((publicacion) => (
                <div key={publicacion.id} className="bg-transparent border border-gray-100 dark:border dark:border-gray-600 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg h-full flex flex-col transform-gpu transition-transform duration-150 ease-out hover:scale-105">
                  <div className="aspect-video bg-gray-200 flex items-center justify-center relative">
                    <video
                      src={publicacion.video_url}
                      controls
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as any;
                        if (target && target.style) {
                          target.style.display = 'none';
                        }
                        const parent = target ? (target as any).parentElement : null;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex flex-col items-center justify-center text-gray-500 p-4">
                              <div class="text-4xl mb-2">🎬</div>
                              <div class="text-sm text-center">Video no disponible</div>
                            </div>
                          `;
                        }
                      }}
                    >
                      Tu navegador no soporta la reproducción de video.
                    </video>
                  </div>

                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {publicacion.video_id}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {formatDate(publicacion.fecha)}
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                      {getPlatformIcon(publicacion.plataforma)}
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Publicado en {getPlatformName(publicacion.plataforma)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Publicaciones;

