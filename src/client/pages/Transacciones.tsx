import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Transaccion, TransaccionForm, TransaccionStats } from '../types';
import AILoader from '../components/AILoader';
import toast from 'react-hot-toast';

const Transacciones: React.FC = () => {
  const { user } = useAuth();
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [stats, setStats] = useState<TransaccionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTransaccion, setNewTransaccion] = useState<TransaccionForm>({
    id_usuario: 0,
    tipo: 'bonificacion',
    descripcion: '',
    cantidad_puntos: 0
  });
  const [creating, setCreating] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // Filtros
  const [filters, setFilters] = useState({
    tipo: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  useEffect(() => {
    if (user?.rol === 'admin') {
      loadTransacciones();
      loadStats();
      loadUsuarios();
    }
  }, [user?.rol]);

  const loadUsuarios = async () => {
    try {
      const response = await apiService.getAllUsers();
      setUsuarios(response.users);
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const loadTransacciones = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTransacciones(filters);
      setTransacciones(response.transacciones);
    } catch (err: any) {
      setError(err.message || 'Error al cargar transacciones');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getTransaccionStats();
      setStats(response.stats);
    } catch (err: any) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  const handleCreateTransaccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaccion.descripcion.trim() || newTransaccion.cantidad_puntos === 0 || newTransaccion.id_usuario === 0) {
      toast.error('Por favor completa todos los campos y selecciona un usuario');
      return;
    }

    try {
      setCreating(true);
      await apiService.createTransaccion(newTransaccion);
      setShowCreateModal(false);
      setNewTransaccion({
        id_usuario: 0,
        tipo: 'bonificacion',
        descripcion: '',
        cantidad_puntos: 0
      });
      loadTransacciones();
      loadStats();
      toast.success('Transacción creada exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear transacción');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTransaccion = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
      return;
    }

    try {
      await apiService.deleteTransaccion(id);
      loadTransacciones();
      loadStats();
      toast.success('Transacción eliminada exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar transacción');
    }
  };

  const applyFilters = () => {
    loadTransacciones();
  };

  const clearFilters = () => {
    setFilters({
      tipo: '',
      fecha_desde: '',
      fecha_hasta: ''
    });
    setTransacciones([]);
  };

  if (user?.rol !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso Denegado</h3>
          <p className="mt-1 text-sm text-gray-500">
            No tienes permisos para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className=" min-h-screen p-6 -mx-6 -mt-6 mb-6 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-8">
          <AILoader />
          <span className="mt-4 text-gray-600 dark:text-white">Cargando transacciones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=" min-h-screen p-6 -mx-6 -mt-6 mb-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <button
              onClick={loadTransacciones}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6  min-h-screen p-6 -mx-6 -mt-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Gestión de Transacciones</h1>
          <p className="mt-1 text-sm text-gray-300">
            Administra las transacciones de puntos del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 flex items-center"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nueva Transacción
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white dark:bg-[#1e2124] overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white dark:text-gray-900 text-sm font-medium">T</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                      Total Transacciones
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.total_transacciones}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1e2124] overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">+</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                      Puntos Otorgados
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.total_puntos_ganados}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1e2124] overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">-</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                      Puntos Descontados
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.total_puntos_gastados}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1e2124] overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">B</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                      Balance Neto
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.balance_actual}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
              Tipo de Transacción
            </label>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Todos los tipos</option>
              <option value="compra">Compra</option>
              <option value="venta">Venta</option>
              <option value="bonificacion">Bonificación</option>
              <option value="penalizacion">Penalización</option>
              <option value="reembolso">Reembolso</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1 ">
              Fecha Desde
            </label>
            <input
              type="date"
              value={filters.fecha_desde}
              onChange={(e) => setFilters({ ...filters, fecha_desde: e.target.value })}
              className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 w-[150px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={filters.fecha_hasta}
              onChange={(e) => setFilters({ ...filters, fecha_hasta: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            />
          </div>
        </div>
        <div className="mt-4 flex space-x-3">
          <button
            onClick={applyFilters}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Aplicar Filtros
          </button>
          <button
            onClick={clearFilters}
            className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla de Transacciones */}
      <div className="bg-white dark:bg-[#1e2124] shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">
            Transacciones ({transacciones.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-[#1e2124]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                  USUARIO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                  TIPO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                  DESCRIPCIÓN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                  PUNTOS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                  FECHA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#1e2124] divide-y divide-gray-200 dark:divide-gray-700">
              {transacciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-900 dark:text-gray-200">
                    No hay transacciones disponibles
                  </td>
                </tr>
              ) : (
                transacciones.map((transaccion) => (
                  <tr key={transaccion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{transaccion.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaccion.usuario?.nombre_usuario || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaccion.tipo === 'bonificacion' ? 'bg-green-100 text-green-800' :
                          transaccion.tipo === 'penalizacion' ? 'bg-red-100 text-red-800' :
                            transaccion.tipo === 'compra' ? 'bg-blue-100 text-blue-800' :
                              transaccion.tipo === 'venta' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {transaccion.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaccion.descripcion}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${transaccion.cantidad_puntos > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {transaccion.cantidad_puntos > 0 ? '+' : ''}{transaccion.cantidad_puntos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaccion.fecha).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteTransaccion(transaccion.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear transacción */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Nueva Transacción
              </h3>
              <form onSubmit={handleCreateTransaccion}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario
                  </label>
                  <select
                    value={newTransaccion.id_usuario}
                    onChange={(e) => setNewTransaccion({ ...newTransaccion, id_usuario: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value={0}>Selecciona un usuario</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre_usuario} ({usuario.email}) - {usuario.puntos} puntos
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Transacción
                  </label>
                  <select
                    value={newTransaccion.tipo}
                    onChange={(e) => setNewTransaccion({ ...newTransaccion, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="bonificacion">Bonificación</option>
                    <option value="penalizacion">Penalización</option>
                    <option value="compra">Compra</option>
                    <option value="venta">Venta</option>
                    <option value="reembolso">Reembolso</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newTransaccion.descripcion}
                    onChange={(e) => setNewTransaccion({ ...newTransaccion, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Describe la transacción..."
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de Puntos
                  </label>
                  <input
                    type="number"
                    value={newTransaccion.cantidad_puntos}
                    onChange={(e) => setNewTransaccion({ ...newTransaccion, cantidad_puntos: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ingresa la cantidad de puntos"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Usa números positivos para otorgar puntos, negativos para descontar
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {creating ? 'Creando...' : 'Crear Transacción'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transacciones;
