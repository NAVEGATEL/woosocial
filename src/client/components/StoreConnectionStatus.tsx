import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { PreferenciasUsuario } from '../types';
import ConnectStoreModal from './ConnectStoreModal';
import { getCache, setCache, deleteCache } from '../utils/cache';

interface StoreConnectionStatusProps {
  userId: number;
  userRole: string;
}

const StoreConnectionStatus: React.FC<StoreConnectionStatusProps> = ({ userId, userRole }) => {
  const [preferences, setPreferences] = useState<PreferenciasUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Intentar desde caché primero
    const cacheKey = `preferences_${userId}_v1`;
    const cached = getCache<PreferenciasUsuario>(cacheKey);
    if (cached) {
      setPreferences(cached);
      setLoading(false);
      // No hacer refresh en background para evitar llamadas duplicadas
      // El usuario puede refrescar manualmente si lo necesita
      return;
    }
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async (background: boolean = false) => {
    try {
      const response = await apiService.getPreferencias();

      // Si cambia la tienda (url_tienda), invalidar SOLO la caché de productos del usuario
      const prevUrl = preferences?.url_tienda || getCache<PreferenciasUsuario>(`preferences_${userId}_v1`)?.url_tienda;
      const nextUrl = response.preferencias?.url_tienda;
      if (prevUrl && nextUrl && prevUrl !== nextUrl) {
        deleteCache(`wc_all_products_${userId}_v1`);
      }

      setPreferences(response.preferencias);
      // Guardar en caché por 5 minutos
      setCache(`preferences_${userId}_v1`, response.preferencias, 5 * 60 * 1000);
    } catch (err) {
      console.log('No hay preferencias configuradas');
    } finally {
      if (!background) setLoading(false);
    }
  };

  const handleConnectionSuccess = () => {
    // Forzar una recarga de preferencias y limpiar productos si la tienda cambia
    fetchPreferences();
  };

  const isConnected = preferences &&
    preferences.cliente_key &&
    preferences.url_tienda &&
    preferences.cliente_secret;

  if (loading) {
    return (
      <div className="">
       
      </div>
    );
  }

  return (
    <>
      <div className="w-full">

        <div className="flex items-center mt-1">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div>
            <p className="text-sm text-gray-900 dark:text-white">
              {isConnected
                ? `Conectado a ${preferences?.url_tienda}`
                : 'No hay tienda conectada'
              }
            </p>
          </div>
        </div>




        {!isConnected && userRole !== 'admin' && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.725-1.36 3.49 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Configuración Requerida
                </h4>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>Para sincronizar tus transacciones con WooCommerce, necesitas conectar tu tienda.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConnectStoreModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleConnectionSuccess}
      />
    </>
  );
};

export default StoreConnectionStatus;
