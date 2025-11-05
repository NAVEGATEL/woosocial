import React, { useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { apiService } from '../services/api';

interface ConnectInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  platformName: string;
}

const ConnectInfoModal: React.FC<ConnectInfoModalProps> = ({ isOpen, onClose, platformName }) => {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSendRequest = async () => {
    try {
      setSending(true);
      setError('');
      setSuccess('');
      
      const asunto = `Solicitud de conexión de ${platformName || 'red social'}`;
      const mensaje = `Solicito ayuda para conectar y automatizar mi cuenta de ${platformName || 'red social'}. Por favor, contáctenme para configurar la automatización de mis publicaciones.`;
      
      await apiService.sendContactForm({
        asunto,
        mensaje,
        tipo: 'soporte'
      });
      
      setSuccess('Solicitud enviada exitosamente. Nos pondremos en contacto contigo pronto.');
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Error al enviar la solicitud. Por favor, inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="w-full max-w-lg rounded-lg bg-white dark:bg-[#1e2124] border border-gray-200 dark:border-gray-700 p-6 mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaInfoCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Información importante</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Para conectar y automatizar tus redes sociales, por favor contáctanos. 
            Estaremos encantados de ayudarte a configurar la automatización de tus publicaciones.
          </p>
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md text-green-600 dark:text-green-200 text-sm">
              {success}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md text-red-600 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Contacto</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <svg className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email: <a href="mailto:info@navegatel.es" className="text-purple-600 dark:text-purple-400 hover:underline">info@navegatel.es</a></span>
              </div>
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <svg className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Tel: <a href="tel:673660910" className="text-purple-600 dark:text-purple-400 hover:underline">673 66 09 10</a> - <a href="tel:865784466" className="text-purple-600 dark:text-purple-400 hover:underline">865 78 44 66</a></span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleSendRequest}
            disabled={sending}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectInfoModal;

