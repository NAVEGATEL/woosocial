import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
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
  nombre_usuario: string;
  email: string;
}

const Mensajes: React.FC = () => {
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMensaje, setSelectedMensaje] = useState<Mensaje | null>(null);
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (user?.rol === 'admin') {
      loadMensajes();
    }
  }, [user?.rol]);

  const loadMensajes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMessages();
      setMensajes(response.messages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar mensajes');
      toast.error('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
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

  const mensajesFiltrados = mensajes.filter(mensaje => {
    const matchTipo = !filtroTipo || mensaje.tipo === filtroTipo;
    const matchBusqueda = !busqueda || 
      mensaje.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
      mensaje.mensaje.toLowerCase().includes(busqueda.toLowerCase()) ||
      mensaje.nombre_usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      mensaje.email.toLowerCase().includes(busqueda.toLowerCase());
    return matchTipo && matchBusqueda;
  });

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
        Mensajes de Contacto
      </h1>

      {/* Filtros */}
      <div className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filtro-tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrar por tipo
            </label>
            <select
              id="filtro-tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

      {/* Lista de mensajes */}
      {mensajesFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#1e2124] rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">
            {mensajes.length === 0 ? 'No hay mensajes de contacto' : 'No se encontraron mensajes con los filtros aplicados'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mensajesFiltrados.map((mensaje) => (
            <div
              key={mensaje.id}
              className="bg-white dark:bg-[#1e2124] rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedMensaje(mensaje)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(mensaje.tipo)}`}>
                      {getTipoLabel(mensaje.tipo)}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {mensaje.asunto}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {mensaje.mensaje}
                  </p>
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
      )}

      {/* Modal de detalle */}
      {selectedMensaje && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-[#1e2124] rounded-lg border border-gray-200 dark:border-gray-600 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Detalle del Mensaje
              </h2>
              <button
                onClick={() => setSelectedMensaje(null)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mensajes;

