import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { apiService } from '../services/api';
import { TransaccionStats } from '../types';
import StoreConnectionStatus from '../components/StoreConnectionStatus';
import ProductGrid from '../components/ProductGrid';
import { getCache, setCache } from '../utils/cache';
import { FaTiktok, FaInstagram, FaFacebook } from 'react-icons/fa';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [stats, setStats] = useState<TransaccionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'outofstock'>('all');
  const [featureFilter, setFeatureFilter] = useState<'all' | 'featured' | 'onsale'>('all');

  useEffect(() => {
    const fetchStats = async () => {
      // Intentar desde caché primero para evitar llamadas innecesarias
      const cacheKey = user ? `stats_${user.id}_v1` : null;
      if (cacheKey) {
        const cached = getCache<TransaccionStats>(cacheKey);
        if (cached) {
          setStats(cached);
          setLoading(false);
          return;
        }
      }

      try {
        const response = await apiService.getTransaccionStats();
        setStats(response.stats);
        // Guardar en caché por 2 minutos
        if (user && cacheKey) {
          setCache(cacheKey, response.stats, 2 * 60 * 1000);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user?.id, user?.puntos]); // Escuchar cambios en ID y puntos del usuario

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  // Si es administrador, mostrar el dashboard completo
  if (user?.rol === 'admin') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ¡Bienvenido, {user?.nombre_usuario}!
          </h1>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-400">
            Aquí tienes un resumen de tu actividad en el sistema de tokens.
          </p>
        </div>

        {/* Store Connection Status */}
        <StoreConnectionStatus
          userId={user.id}
          userRole={user.rol || 'usuario'}
        />

        {/* Social Connections */}
        <div className="bg-transparent dark:bg-[#1e2124] shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Conectar redes sociales
            </h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-400">Vincula tus cuentas para publicar los videos generados.</p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">


              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Conectar TikTok
                </h3>
                <p className="mt-2 text-sm text-gray-900 dark:text-gray-400">Autoriza tu cuenta de TikTok para publicar automáticamente.</p>
              </div>




              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Conectar Instagram
                </h3>
                <p className="mt-2 text-sm text-gray-900 dark:text-gray-400">Vincula Instagram para compartir productos y videos.</p>
              </div>




              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Conectar Facebook
                </h3>
                <p className="mt-2 text-sm text-gray-900 dark:text-gray-400">Conecta tu página para gestionar publicaciones.</p>
              </div>

            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-transparent dark:bg-[#1e2124] overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">T</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-900 dark:text-gray-400 truncate">
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

            <div className="bg-transparent dark:bg-[#1e2124] overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">+</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-900 dark:text-gray-400 truncate">
                        Puntos Ganados
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {stats.total_puntos_ganados}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-transparent dark:bg-[#1e2124] overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">-</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-900 dark:text-gray-400 truncate">
                        Puntos Gastados
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {stats.total_puntos_gastados}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-transparent dark:bg-[#1e2124] overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">$</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-900 dark:text-gray-400 truncate">
                        Balance Actual
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

        {/* Quick Actions */}
        <div className="bg-transparent dark:bg-[#1e2124] shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Acciones Rápidas
            </h3>
            <div className="mt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <a
                  href="/transacciones"
                  className="relative group bg-transparent dark:bg-[#1e2124] p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-900 text-blue-300 ring-4 ring-[#1e2124]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Ver Transacciones
                    </h3>
                    <p className="mt-2 text-sm text-gray-900 dark:text-gray-400">
                      Revisa tu historial de transacciones y puntos.
                    </p>
                  </div>
                </a>

                <a
                  href="/preferencias"
                  className="relative group bg-transparent dark:bg-[#1e2124] p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-green-900 text-green-300 ring-4 ring-[#1e2124]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Configurar Preferencias
                    </h3>
                    <p className="mt-2 text-sm text-gray-900 dark:text-gray-400">
                      Configura tu tienda WooCommerce y webhook de N8N.
                    </p>
                  </div>
                </a>

                <a
                  href="/transacciones?action=new"
                  className="relative group bg-transparent dark:bg-[#1e2124] p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-yellow-900 text-yellow-300 ring-4 ring-[#1e2124]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Nueva Transacción
                    </h3>
                    <p className="mt-2 text-sm text-gray-900 dark:text-gray-400">
                      Crea una nueva transacción de puntos.
                    </p>
                  </div>
                </a>

                <a
                  href="/generaciones"
                  className="relative group bg-transparent dark:bg-[#1e2124] p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-indigo-900 text-indigo-300 ring-4 ring-[#1e2124]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Ver Generaciones
                    </h3>
                    <p className="mt-2 text-sm text-gray-900 dark:text-gray-400">
                      Revisa todos tus videos generados.
                    </p>
                  </div>
                </a>

                <a
                  href="/admin/users"
                  className="relative group bg-transparent dark:bg-[#1e2124] p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-purple-900 text-purple-300 ring-4 ring-[#1e2124]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Administrar Usuarios
                    </h3>
                    <p className="mt-2 text-sm text-gray-900 dark:text-gray-400">
                      Crear y gestionar usuarios del sistema.
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Para usuarios no-admin, mostrar solo conexión y productos
  return (
    <div>
      {/* Header 
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ¡Bienvenido, {user?.nombre_usuario}!
          </h1>
          
          {user && (
            <StoreConnectionStatus
              userId={user.id}
              userRole={user.rol || 'usuario'}
            />
          )}
        </div>
      
        <div className="w-full lg:w-auto">
          <div className="px-4 flex flex-col md:flex-row justify-between items-center gap-4 ">
            <div className="mr-10">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Conectar redes sociales
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Vincula tus cuentas para publicar los videos generados.</p>
            </div>
            <div className=" gap-4 flex">

              <div className=" border-2 border-gray-300 dark:border-gray-600 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <FaTiktok className="w-6 h-6 text-gray-700 dark:text-white" />
              </div>

              <div className=" border-2 border-gray-300 dark:border-gray-600 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <FaInstagram className="w-6 h-6 text-gray-700 dark:text-white" />
              </div>

              <div className=" border-2 border-gray-300 dark:border-gray-600 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <FaFacebook className="w-6 h-6 text-gray-700 dark:text-white" />
              </div>

            </div>
          </div>
        </div>
      </div>
      */}
      {/* Filtros movidos dentro de ProductGrid */}
      {/* Productos de la tienda */}
      {user && (
        <div className="dark:bg-transparent rounded-lg">
          <div className="pb-5 px-0">
            <ProductGrid
              userId={user.id}
              selectedCategoryId={selectedCategoryId}
              stockFilter={stockFilter}
              featureFilter={featureFilter}
              onCategories={(cats) => setCategories(cats)}
              onChangeCategory={setSelectedCategoryId}
              onChangeStock={setStockFilter}
              onChangeFeature={setFeatureFilter}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
