import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import AILoader from '../components/AILoader';
import toast from 'react-hot-toast';

interface Mensaje {
  id: number;
  id_usuario: number | null;
  tipo: 'consulta' | 'soporte' | 'sugerencia' | 'error' | 'otro';
  asunto: string;
  mensaje: string;
  ip_address: string | null;
  user_agent: string | null;
  fecha: string;
  is_done: boolean;
  solucion: string | null;
  nombre_usuario: string;
  email: string;
}

const Mensajes: React.FC = () => {
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMensaje, setSelectedMensaje] = useState<Mensaje | null>(null);
  const [mensajesCargados, setMensajesCargados] = useState(false);
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  
  // Paginación (fija a 8 elementos por página)
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 8;
  
  // Estados para edición
  const [editando, setEditando] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [solucion, setSolucion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (user?.rol === 'admin') {
      loadMensajes();
    }
  }, [user?.rol]);

  const loadMensajes = async () => {
    try {
      setLoading(true);
      setError(null);
      setMensajesCargados(false);
      const response = await apiService.getMessages();
      setMensajes(response.messages);
      // Pequeño delay para activar la animación después de que los datos estén listos
      setTimeout(() => {
        setMensajesCargados(true);
      }, 50);
    } catch (err: any) {
      setError(err.message || 'Error al cargar mensajes');
      toast.error('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMessage = async () => {
    if (!selectedMensaje) return;

    try {
      setGuardando(true);
      await apiService.updateMessage(selectedMensaje.id, {
        is_done: isDone,
        solucion: solucion || undefined
      });

      // Actualizar el mensaje en la lista
      setMensajes(mensajes.map((m: Mensaje) => 
        m.id === selectedMensaje.id 
          ? { ...m, is_done: isDone, solucion: solucion || null }
          : m
      ));

      // Actualizar el mensaje seleccionado
      setSelectedMensaje({
        ...selectedMensaje,
        is_done: isDone,
        solucion: solucion || null
      });

      setEditando(false);
      toast.success('Mensaje actualizado exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar mensaje');
    } finally {
      setGuardando(false);
    }
  };

  const handleOpenMessage = (mensaje: Mensaje) => {
    setSelectedMensaje(mensaje);
    setIsDone(mensaje.is_done);
    setSolucion(mensaje.solucion || '');
    setEditando(false);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'consulta':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'soporte':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'sugerencia':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'otro':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'consulta':
        return 'Consulta General';
      case 'soporte':
        return 'Soporte Técnico';
      case 'sugerencia':
        return 'Sugerencia';
      case 'error':
        return 'Reportar Error';
      case 'otro':
        return 'Otro';
      default:
        return tipo;
    }
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const mensajesFiltrados = mensajes.filter((mensaje: Mensaje) => {
    const matchTipo = !filtroTipo || mensaje.tipo === filtroTipo;
    const matchBusqueda = !busqueda || 
      mensaje.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
      mensaje.mensaje.toLowerCase().includes(busqueda.toLowerCase()) ||
      mensaje.nombre_usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      mensaje.email.toLowerCase().includes(busqueda.toLowerCase());
    return matchTipo && matchBusqueda;
  });

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
    setMensajesCargados(false);
    setTimeout(() => {
      setMensajesCargados(true);
    }, 50);
  }, [filtroTipo, busqueda]);

  // Animar cuando cambia la página
  useEffect(() => {
    setMensajesCargados(false);
    setTimeout(() => {
      setMensajesCargados(true);
    }, 50);
  }, [paginaActual]);

  // Calcular paginación
  const totalPaginas = Math.ceil(mensajesFiltrados.length / elementosPorPagina);
  const indiceInicio = (paginaActual - 1) * elementosPorPagina;
  const indiceFin = indiceInicio + elementosPorPagina;
  const mensajesPaginados = mensajesFiltrados.slice(indiceInicio, indiceFin);

  const cambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generarNumerosPagina = () => {
    const numeros: (number | string)[] = [];
    const maxBotones = 5;
    
    if (totalPaginas <= maxBotones) {
      // Mostrar todas las páginas si son pocas
      for (let i = 1; i <= totalPaginas; i++) {
        numeros.push(i);
      }
    } else {
      // Mostrar páginas con elipsis
      if (paginaActual <= 3) {
        for (let i = 1; i <= 4; i++) {
          numeros.push(i);
        }
        numeros.push('...');
        numeros.push(totalPaginas);
      } else if (paginaActual >= totalPaginas - 2) {
        numeros.push(1);
        numeros.push('...');
        for (let i = totalPaginas - 3; i <= totalPaginas; i++) {
          numeros.push(i);
        }
      } else {
        numeros.push(1);
        numeros.push('...');
        for (let i = paginaActual - 1; i <= paginaActual + 1; i++) {
          numeros.push(i);
        }
        numeros.push('...');
        numeros.push(totalPaginas);
      }
    }
    
    return numeros;
  };

  if (user?.rol !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 text-lg">
          No tienes permisos para acceder a esta página.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <AILoader />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0 max-w-[90vw] mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
        Mensajes de Contacto
      </h1>

      {/* Filtros */}
      <div className="mb-6 p-0">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label htmlFor="filtro-tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrar por tipo
            </label>
            <select
              id="filtro-tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-2 h-8 w-[180px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="">Todos los tipos</option>
              <option value="consulta">Consulta General</option>
              <option value="soporte">Soporte Técnico</option>
              <option value="sugerencia">Sugerencia</option>
              <option value="error">Reportar Error</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label htmlFor="busqueda" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar
            </label>
            <input
              type="text"
              id="busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por asunto, mensaje, usuario o email..."
              className="px-2 h-8 w-[300px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md text-red-600 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Información de resultados */}
      {mensajesFiltrados.length > 0 && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Mostrando {indiceInicio + 1} - {Math.min(indiceFin, mensajesFiltrados.length)} de {mensajesFiltrados.length} mensaje{mensajesFiltrados.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Lista de mensajes */}
      {mensajesFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#1e2124] rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">
            {mensajes.length === 0 ? 'No hay mensajes de contacto' : 'No se encontraron mensajes con los filtros aplicados'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {mensajesPaginados.map((mensaje, index) => (
              <div
                key={mensaje.id}
                className="bg-white dark:bg-[#1e2124] rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow cursor-pointer message-item dark:hover:border-gray-100"
                onClick={() => handleOpenMessage(mensaje)}
                style={{
                  animationDelay: mensajesCargados ? `${index * 0.1}s` : '0s'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Badges en una línea separada */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(mensaje.tipo)}`}>
                        {getTipoLabel(mensaje.tipo)}
                      </span>
                      {mensaje.is_done && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          Resuelto
                        </span>
                      )}
                      {mensaje.solucion && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          Con respuesta
                        </span>
                      )}
                    </div>

                    {/* Título en su propia línea */}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 break-words">
                      {mensaje.asunto}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        <strong>Usuario:</strong> {mensaje.nombre_usuario} ({mensaje.email})
                      </span>
                      <span>
                        <strong>Fecha:</strong> {formatFecha(mensaje.fecha)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-purple-600 px-4 py-3 sm:px-6 mt-8">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Página <span className="font-medium text-gray-900 dark:text-white">{paginaActual}</span> de{' '}
                    <span className="font-medium text-gray-900 dark:text-white">{totalPaginas}</span>
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => cambiarPagina(paginaActual - 1)}
                      disabled={paginaActual === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                    >
                      <span className="sr-only">Anterior</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Números de página */}
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPaginas - 4, paginaActual - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => cambiarPagina(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                            ${pageNum === paginaActual
                              ? 'z-10 bg-purple-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600'
                              : 'text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 focus:z-20 focus:outline-offset-0 bg-gray-100 dark:bg-gray-700'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => cambiarPagina(paginaActual + 1)}
                      disabled={paginaActual === totalPaginas}
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
        </>
      )}

      {/* Modal de detalle */}
      {selectedMensaje && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-[#1e2124] rounded-lg border border-gray-200 dark:border-gray-600 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Detalle del Mensaje
              </h2>
              <div className="flex items-center gap-2">
                {!editando && (
                  <button
                    onClick={() => setEditando(true)}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Editar
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedMensaje(null);
                    setEditando(false);
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo
                </label>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getTipoColor(selectedMensaje.tipo)}`}>
                  {getTipoLabel(selectedMensaje.tipo)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Asunto
                </label>
                <p className="text-gray-900 dark:text-white">{selectedMensaje.asunto}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mensaje
                </label>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedMensaje.mensaje}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Usuario
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedMensaje.nombre_usuario}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedMensaje.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha
                  </label>
                  <p className="text-gray-900 dark:text-white">{formatFecha(selectedMensaje.fecha)}</p>
                </div>

                {selectedMensaje.ip_address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      IP Address
                    </label>
                    <p className="text-gray-900 dark:text-white">{selectedMensaje.ip_address}</p>
                  </div>
                )}
              </div>

              {selectedMensaje.user_agent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User Agent
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 break-all">{selectedMensaje.user_agent}</p>
                </div>
              )}

              {/* Estado y Solución */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={(e) => setIsDone(e.target.checked)}
                      disabled={!editando}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Marcado como resuelto
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Solución / Comentario
                  </label>
                  {editando ? (
                    <textarea
                      value={solucion}
                      onChange={(e) => setSolucion(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Escribe la solución o comentario aquí..."
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap min-h-[60px]">
                      {selectedMensaje.solucion || 'Sin solución registrada'}
                    </p>
                  )}
                </div>

                {editando && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleSaveMessage}
                      disabled={guardando}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => {
                        setEditando(false);
                        setIsDone(selectedMensaje.is_done);
                        setSolucion(selectedMensaje.solucion || '');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mensajes;

