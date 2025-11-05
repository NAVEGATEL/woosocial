import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { PreferenciasUsuario } from '../types';

interface ConnectStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ConnectStoreModal: React.FC<ConnectStoreModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    cliente_key: '',
    url_tienda: '',
    cliente_secret: '',
    n8n_webhook: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingPreferences, setExistingPreferences] = useState<PreferenciasUsuario | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const fetchPreferences = async () => {
    try {
      const response = await apiService.getPreferencias();
      if (response.preferencias) {
        setExistingPreferences(response.preferencias);
        setFormData({
          cliente_key: response.preferencias.cliente_key || '',
          url_tienda: response.preferencias.url_tienda || '',
          cliente_secret: response.preferencias.cliente_secret || '',
          n8n_webhook: response.preferencias.n8n_webhook || ''
        });
      }
    } catch (err: any) {
      console.log('No hay preferencias existentes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (existingPreferences) {
        await apiService.updatePreferencias(formData);
      } else {
        await apiService.createPreferencias(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar las preferencias');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {existingPreferences ? 'Actualizar Conexión' : 'Conectar Mi Tienda Online'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url_tienda" className="block text-sm font-medium text-gray-700">
                Dominio de la Tienda
              </label>
              <input
                type="url"
                id="url_tienda"
                name="url_tienda"
                value={formData.url_tienda}
                onChange={handleInputChange}
                placeholder="https://taviralopez.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="cliente_key" className="block text-sm font-medium text-gray-700">
                Clave del Cliente
              </label>
              <input
                type="text"
                id="cliente_key"
                name="cliente_key"
                value={formData.cliente_key}
                onChange={handleInputChange}
                placeholder="ck_32eebf079f7e378ac59840e436f81c8980d541b5"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="cliente_secret" className="block text-sm font-medium text-gray-700">
                Clave Secreta del Cliente
              </label>
              <input
                type="password"
                id="cliente_secret"
                name="cliente_secret"
                value={formData.cliente_secret}
                onChange={handleInputChange}
                placeholder="cs_9ac82c0031d7f37ad14fe265aaeb01ecb07a1656"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="n8n_webhook" className="block text-sm font-medium text-gray-700">
                Webhook de N8N (Opcional)
              </label>
              <input
                type="url"
                id="n8n_webhook"
                name="n8n_webhook"
                value={formData.n8n_webhook}
                onChange={handleInputChange}
                placeholder="https://tu-n8n-instance.com/webhook/..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : (existingPreferences ? 'Actualizar' : 'Conectar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConnectStoreModal;
