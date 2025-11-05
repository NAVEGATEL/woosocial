import React, { useState } from 'react';
import { SocialPlatformId } from '../types';

interface SocialConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => Promise<void> | void;
}

const SocialConnectModal: React.FC<SocialConnectModalProps> = ({ isOpen, onClose, onConnected }) => {
  const [plataforma, setPlataforma] = useState<SocialPlatformId>('instagram');
  const [accessToken, setAccessToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white dark:bg-[#1e2124] border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Conectar Red Social</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Plataforma</label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-[#111317] dark:text-white"
              value={plataforma}
              onChange={(e) => setPlataforma(e.target.value as SocialPlatformId)}
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Access Token</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-[#111317] dark:text-white"
              placeholder="Pega aquí tu access token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Usaremos el token para validar con la API oficial y guardar la conexión.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#111317]"
          >
            Cancelar
          </button>
          <button
            disabled={validating || !accessToken}
            onClick={async () => {
              try {
                setError('');
                setValidating(true);
                const { apiService } = await import('../services/api');
                const validate = await apiService.validateSocialToken(
                  plataforma === 'instagram' ? 'instagram' : 'facebook',
                  accessToken
                );
                if (!validate.valid) {
                  setError(validate.error || 'No se pudo validar el token');
                  return;
                }
                await apiService.connectSocial({
                  plataforma,
                  access_token: accessToken,
                  username: validate.username || undefined,
                  account_id: validate.account_id || undefined,
                });
                await onConnected();
                onClose();
              } catch (e: any) {
                setError(e?.message || 'Error al conectar');
              } finally {
                setValidating(false);
              }
            }}
            className="rounded-md bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {validating ? 'Validando...' : 'Conectar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialConnectModal;


