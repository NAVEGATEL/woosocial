import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import SocialPublishModal from '../components/SocialPublishModal';
import { FaCopy, FaVideo, FaPlay, FaExpand } from "react-icons/fa";

const Generaciones: React.FC = () => {
  const { user } = useAuth();
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [visibleVideos, setVisibleVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);
  const [videosPerPage] = useState(12); // Videos por página

  // Filtros
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  
  // Estado para controlar la animación de aparición
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAllVideos();
    }
  }, [user]);

  const fetchAllVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getUserVideos();
      // Orden inicial por fecha desc
      const sorted = [...response.videos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setAllVideos(sorted);
      applyFiltersAndPaginate(sorted, 1);
    } catch (err: any) {
      console.error('Error al obtener videos:', err);
      setError(err.message || 'Error al cargar los videos');
      setAllVideos([]);
      setVisibleVideos([]);
      setTotalPages(1);
      setTotalVideos(0);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndPaginate = (source: Video[], page: number) => {
    let filtered = [...source];

    // Búsqueda por id/url
    if (search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(v =>
        v.video_id.toLowerCase().includes(q) ||
        (v.video_url || '').toLowerCase().includes(q)
      );
    }

    // Rango de fechas
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      filtered = filtered.filter(v => new Date(v.fecha).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      filtered = filtered.filter(v => new Date(v.fecha).getTime() <= to + 24 * 60 * 60 * 1000 - 1);
    }

    // Orden
    filtered.sort((a, b) => {
      const da = new Date(a.fecha).getTime();
      const db = new Date(b.fecha).getTime();
      return sortOrder === 'newest' ? db - da : da - db;
    });

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / videosPerPage));
    const safePage = Math.min(Math.max(1, page), pages);
    const start = (safePage - 1) * videosPerPage;
    const end = start + videosPerPage;
    setVisibleVideos(filtered.slice(start, end));
    setTotalVideos(total);
    setTotalPages(pages);
    setCurrentPage(safePage);
  };

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

  // Eliminado botón de copiar URL

  const handleSocialPublish = (video: Video) => {
    setSelectedVideo(video);
    setIsSocialModalOpen(true);
  };

  const handleVideoPlay = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      if ((video as HTMLVideoElement).paused) {
        (video as HTMLVideoElement).play();
        setPlayingVideos(prev => new Set(prev).add(videoId));
      } else {
        (video as HTMLVideoElement).pause();
        setPlayingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
      }
    }
  };

  const handleVideoPause = (videoId: string) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };

  const handleFullscreen = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      const videoElement = video as HTMLVideoElement;
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
      } else if ((videoElement as any).webkitRequestFullscreen) {
        (videoElement as any).webkitRequestFullscreen();
      } else if ((videoElement as any).mozRequestFullScreen) {
        (videoElement as any).mozRequestFullScreen();
      } else if ((videoElement as any).msRequestFullscreen) {
        (videoElement as any).msRequestFullscreen();
      }
    }
  };

  const handlePageChange = (page: number) => {
    setIsAnimating(false);
    applyFiltersAndPaginate(allVideos, page);
    (globalThis as any)?.scrollTo?.({ top: 0, behavior: 'smooth' });
    setTimeout(() => setIsAnimating(true), 10);
  };

  // Recalcular al cambiar filtros
  useEffect(() => {
    applyFiltersAndPaginate(allVideos, 1);
  }, [search, dateFrom, dateTo, sortOrder, allVideos]);

  // Activar animación cuando cambian los videos mostrados
  useEffect(() => {
    setIsAnimating(false);
    // Pequeño delay para que React renderice primero y luego animar
    const timer = setTimeout(() => {
      setIsAnimating(true);
    }, 10);
    return () => clearTimeout(timer);
  }, [visibleVideos]);

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;

    // Calcular el rango de páginas a mostrar
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Ajustar si estamos cerca del final
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Botón anterior
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
    );

    // Páginas numeradas
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm font-medium border-t border-b ${i === currentPage
            ? 'bg-blue-600 text-white border-blue-600'
            : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
        >
          {i}
        </button>
      );
    }

    // Botón siguiente
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-r-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    );

    return pages;
  };

  return (
    <div className="space-y-6 px-4 sm:px-0">
      {/* Header con información de videos */}
      <div className="flex flex-col xl:flex-row justify-between gap-4 ">
        <div className="flex flex-col mt-4">
          <div className="flex items-center space-x-3 w-[250px]">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Videos Generados</h2>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-400">
            Mostrando {visibleVideos.length} de {totalVideos} videos
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex  gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Desde</label>
              <input
                type="date"
                className="px-2 h-8 w-[140px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                onClick={(e) => {
                  e.currentTarget.showPicker?.();
                }}
                onFocus={(e) => {
                  e.currentTarget.showPicker?.();
                }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
              <input
                type="date"
                className="px-2 h-8 w-[140px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                onClick={(e) => {
                  e.currentTarget.showPicker?.();
                }}
                onFocus={(e) => {
                  e.currentTarget.showPicker?.();
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Orden</label>
            <select
              className="px-1 h-8 w-[135px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
            >
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-white text-lg">Cargando videos...</span>
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
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error al cargar videos</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchAllVideos}
                  className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de videos o vacío */}
      {!loading && !error && totalVideos === 0 ? (
        <div className="text-center py-12 bg-transparent dark:bg-gray-800  border border-gray-200 dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-900 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay videos</h3>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-400">
            Ajusta los filtros para ver resultados.
          </p>
        </div>
      ) : (
        <div
          key={`grid-${currentPage}`}
          className="product-grid"
        >
          {visibleVideos.map((video, index) => (
            <div 
              key={video.id} 
              className={`bg-transparent border border-gray-100 dark:border dark:border-gray-600 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg h-full flex flex-col transform-gpu transition-all duration-300 ease-out hover:scale-105 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ 
                transitionDelay: isAnimating ? `${index * 50}ms` : '0ms' 
              }}
            >
              <div className="aspect-video bg-gray-200 flex items-center justify-center relative group">
                <video
                  ref={(el) => {
                    videoRefs.current[String(video.id)] = el;
                  }}
                  src={video.video_url}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => handleVideoPlay(String(video.id))}
                  onPlay={() => setPlayingVideos(prev => new Set(prev).add(String(video.id)))}
                  onPause={() => handleVideoPause(String(video.id))}
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
                {!playingVideos.has(String(video.id)) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black bg-opacity-20 hover:bg-opacity-30 transition-opacity z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVideoPlay(String(video.id));
                    }}
                  >
                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors opacity-80">
                      <FaPlay className="text-white text-2xl ml-1" />
                    </div>
                  </div>
                )}
                {playingVideos.has(String(video.id)) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFullscreen(String(video.id));
                    }}
                    className="absolute bottom-2 right-2 z-10 w-[30px] h-[30px] bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors cursor-pointer opacity-80"
                    aria-label="Pantalla completa"
                  >
                    <FaExpand className="text-white text-lg" />
                  </button>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {video.video_id}
                  </span>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {formatDate(video.fecha)}
                </div>

                <div className="mt-auto">
                  <button
                    onClick={() => handleSocialPublish(video)}
                    className="w-full inline-flex items-center justify-center p-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    Publicar en Redes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-purple-600 px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Página <span className="font-medium text-gray-900 dark:text-white">{currentPage}</span> de{' '}
                <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                >
                  <span className="sr-only">Anterior</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Números de página */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                        ${pageNum === currentPage
                          ? 'z-10 bg-purple-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600'
                          : 'text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 focus:z-20 focus:outline-offset-0 bg-gray-100 dark:bg-gray-700'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                >
                  <span className="sr-only">Siguiente</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Social Publish Modal */}
      <div className="py-5 px-2 sm:px-0">

        <SocialPublishModal
          isOpen={isSocialModalOpen}
          onClose={() => {
            setIsSocialModalOpen(false);
            setSelectedVideo(null);
          }}
          video={selectedVideo}
          userId={user?.id}
          onInstagramSuccess={async (videoId: string) => {
            if (user?.id) {
              try {
                await apiService.publishSuccessCallback('instagram', {
                  user_id: user.id,
                  video_id: videoId
                });
              } catch (error) {
                console.error('Error al registrar callback de éxito de Instagram:', error);
              }
            }
          }}
          onInstagramError={async (videoId: string, errorMessage?: string) => {
            if (user?.id) {
              try {
                await apiService.publishErrorCallback('instagram', {
                  user_id: user.id,
                  video_id: videoId,
                  error_message: errorMessage
                });
              } catch (error) {
                console.error('Error al registrar callback de error de Instagram:', error);
              }
            }
          }}
          onTikTokSuccess={async (videoId: string) => {
            if (user?.id) {
              try {
                await apiService.publishSuccessCallback('tiktok', {
                  user_id: user.id,
                  video_id: videoId
                });
              } catch (error) {
                console.error('Error al registrar callback de éxito de TikTok:', error);
              }
            }
          }}
          onTikTokError={async (videoId: string, errorMessage?: string) => {
            if (user?.id) {
              try {
                await apiService.publishErrorCallback('tiktok', {
                  user_id: user.id,
                  video_id: videoId,
                  error_message: errorMessage
                });
              } catch (error) {
                console.error('Error al registrar callback de error de TikTok:', error);
              }
            }
          }}
          onFacebookSuccess={async (videoId: string) => {
            if (user?.id) {
              try {
                await apiService.publishSuccessCallback('facebook', {
                  user_id: user.id,
                  video_id: videoId
                });
              } catch (error) {
                console.error('Error al registrar callback de éxito de Facebook:', error);
              }
            }
          }}
          onFacebookError={async (videoId: string, errorMessage?: string) => {
            if (user?.id) {
              try {
                await apiService.publishErrorCallback('facebook', {
                  user_id: user.id,
                  video_id: videoId,
                  error_message: errorMessage
                });
              } catch (error) {
                console.error('Error al registrar callback de error de Facebook:', error);
              }
            }
          }}
          onExternalError={async (videoId: string, errorMessage?: string) => {
            if (user?.id) {
              try {
                await apiService.publishExternalErrorCallback({
                  user_id: user.id,
                  video_id: videoId,
                  error_message: errorMessage
                });
              } catch (error) {
                console.error('Error al registrar callback de error externo:', error);
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default Generaciones;
