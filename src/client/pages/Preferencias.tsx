import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { FaInstagram, FaTiktok, FaFacebook } from 'react-icons/fa';
import { IconType } from 'react-icons';
import SocialConnectModal from '../components/SocialConnectModal';
import ConnectInfoModal from '../components/ConnectInfoModal';
import toast from 'react-hot-toast';
import StoreConnectionStatus from '../components/StoreConnectionStatus';

interface SocialPlatform {
  id: string;
  name: string;
  icon: IconType;
  connected: boolean;
}

const Preferencias: React.FC = () => {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: FaTiktok,
      connected: false
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: FaFacebook,
      connected: false
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: FaInstagram,
      connected: false
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showConnectInfoModal, setShowConnectInfoModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  
  // Estados para cambio de contraseña
  const [passwordForm, setPasswordForm] = useState({
    contraseña_actual: '',
    nueva_contraseña: '',
    confirmar_contraseña: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Estados para formulario de contacto
  const [contactForm, setContactForm] = useState({
    asunto: '',
    mensaje: '',
    tipo: 'consulta' as 'consulta' | 'soporte' | 'sugerencia' | 'error' | 'otro'
  });
  const [sendingContact, setSendingContact] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  // Estado para controlar la animación de aparición
  const [isAnimating, setIsAnimating] = useState(false);
  const [alertAnimating, setAlertAnimating] = useState(false);

  useEffect(() => {
    fetchSocialConnections();
  }, [user]);

  // Detectar retorno de OAuth (query params)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const social = params.get('social');
    const status = params.get('status');
    const msg = params.get('msg');
    if (social === 'tiktok') {
      if (status === 'success') {
        setSuccess('TikTok conectado correctamente');
        fetchSocialConnections();
      } else if (status === 'error') {
        setError(`Error al conectar TikTok${msg ? `: ${decodeURIComponent(msg)}` : ''}`);
      }
      // Limpiar la query
      const url = new URL(window.location.href);
      url.searchParams.delete('social');
      url.searchParams.delete('status');
      url.searchParams.delete('msg');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  const fetchSocialConnections = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSocialConnections();
      setPlatforms(prev => prev.map(p => {
        const found = response.connections.find(c => c.plataforma === p.id);
        return { ...p, connected: !!found?.connected };
      }));
    } catch (err: any) {
      console.error('Error al obtener conexiones sociales:', err);
    } finally {
      setLoading(false);
      // Activar animación cuando termine de cargar
      setIsAnimating(false);
      setTimeout(() => setIsAnimating(true), 10);
    }
  };

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    setError('');
    setSuccess('');
    
    // Mostrar modal informativo
    const platform = platforms.find(p => p.id === platformId);
    setSelectedPlatform(platform?.name || '');
    setShowConnectInfoModal(true);
    setConnecting(null);
    return;
    
    // Código original comentado para referencia
    // if (platformId === 'tiktok') {
    //   const url = apiService.getTikTokAuthUrl(user?.id);
    //   window.location.href = url;
    //   return;
    // }
    // setShowConnectModal(true);
  };

  const handleDisconnect = async (platformId: string) => {
    try {
      setConnecting(platformId);
      setError('');
      setSuccess('');
      await apiService.disconnectSocial(platformId as any);
      await fetchSocialConnections();
      const platformName = platforms.find(p => p.id === platformId)?.name || '';
      toast.success(`Desconectado de ${platformName}`);
    } catch (err: any) {
      toast.error(`Error al desconectar: ${err.message || 'Error desconocido'}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      await apiService.changePassword(passwordForm);
      setPasswordSuccess('Contraseña cambiada exitosamente');
      setPasswordForm({
        contraseña_actual: '',
        nueva_contraseña: '',
        confirmar_contraseña: ''
      });
    } catch (err: any) {
      setPasswordError(err.message || 'Error al cambiar contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingContact(true);
    setContactError('');
    setContactSuccess('');

    try {
      await apiService.sendContactForm(contactForm);
      setContactSuccess('Mensaje enviado exitosamente. Nos pondremos en contacto contigo pronto.');
      setContactForm({
        asunto: '',
        mensaje: '',
        tipo: 'consulta'
      });
    } catch (err: any) {
      setContactError(err.message || 'Error al enviar mensaje');
    } finally {
      setSendingContact(false);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Activar animación cuando termine de cargar
  useEffect(() => {
    if (!loading) {
      setIsAnimating(false);
      setTimeout(() => setIsAnimating(true), 10);
    }
  }, [loading]);

  // Activar animación de alertas cuando aparecen
  useEffect(() => {
    if (error || success) {
      setAlertAnimating(false);
      setTimeout(() => setAlertAnimating(true), 10);
    }
  }, [error, success]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <>
    <div className=" px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Preferencias</h1>
      <p className="text-gray-600 dark:text-white text-center">
        Configura tus preferencias y conecta tus redes sociales para publicar fácilmente los videos generados.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center w-full space-y-6">
        <div className="w-full space-y-6">

          {/* Alertas */}
          {(error || success) && (
            <div className={`p-4 rounded-md transform-gpu transition-all duration-300 ease-out ${error
              ? 'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-200'
              : 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-200'
              } ${alertAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
            >
              <div className="flex justify-between items-center">
                <span>{error || success}</span>
                <button
                  onClick={clearMessages}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Lista de Redes Sociales */}
          
            <div className="flex flex-col md:flex-row md:gap-8 gap-4 justify-center items-center justify-center">
              {platforms.map((platform, index) => {
                const IconComponent = platform.icon;
                return (
                  <div
                    key={platform.id}
                    className={`flex items-center gap-5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-all duration-300 ease-out w-[fit-content] transform-gpu ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                    style={{ 
                      transitionDelay: isAnimating ? `${index * 100}ms` : '0ms' 
                    }}
                  >
                    <div className="flex items-center">
                      <IconComponent className="w-7 h-7 md:w-8 md:h-8 text-gray-700 dark:text-white" />
                    </div>

                    <button
                      onClick={() => platform.connected ? handleDisconnect(platform.id) : handleConnect(platform.id)}
                      disabled={connecting === platform.id}
                      className={`px-6 py-2 rounded-md font-medium transition-colors ${platform.connected
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {connecting === platform.id ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {platform.connected ? 'Desconectando...' : 'Conectando...'}
                        </span>
                      ) : (
                        platform.connected ? 'Desconectar' : 'Conectar'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          

          {/* Formularios lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario de Cambio de Contraseña */}
            <div className={`bg-white dark:bg-[#1e2124] rounded-lg border border-gray-200 dark:border-gray-600 p-4 h-fit transform-gpu transition-all duration-300 ease-out ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ 
                transitionDelay: isAnimating ? '300ms' : '0ms' 
              }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Cambiar Contraseña</h2>
              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md text-red-600 dark:text-red-200 text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md text-green-600 dark:text-green-200 text-sm">
                  {passwordSuccess}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="contraseña_actual" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    id="contraseña_actual"
                    required
                    value={passwordForm.contraseña_actual}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, contraseña_actual: (e.target as HTMLInputElement).value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="nueva_contraseña" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    id="nueva_contraseña"
                    required
                    minLength={6}
                    value={passwordForm.nueva_contraseña}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, nueva_contraseña: (e.target as HTMLInputElement).value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="confirmar_contraseña" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    id="confirmar_contraseña"
                    required
                    minLength={6}
                    value={passwordForm.confirmar_contraseña}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, confirmar_contraseña: (e.target as HTMLInputElement).value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                </button>
              </form>
            </div>

            {/* Formulario de Contacto */}
            <div className={`bg-white dark:bg-[#1e2124] rounded-lg border border-gray-200 dark:border-gray-600 p-4 transform-gpu transition-all duration-300 ease-out ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ 
                transitionDelay: isAnimating ? '400ms' : '0ms' 
              }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contacto</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                ¿Tienes alguna pregunta, sugerencia o problema? Envíanos un mensaje y te responderemos lo antes posible.
              </p>
              {contactError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md text-red-600 dark:text-red-200 text-sm">
                  {contactError}
                </div>
              )}
              {contactSuccess && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md text-green-600 dark:text-green-200 text-sm">
                  {contactSuccess}
                </div>
              )}
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Consulta
                  </label>
                  <select
                    id="tipo"
                    value={contactForm.tipo}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContactForm({ ...contactForm, tipo: (e.target as HTMLSelectElement).value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="consulta">Consulta General</option>
                    <option value="soporte">Soporte Técnico</option>
                    <option value="sugerencia">Sugerencia</option>
                    <option value="error">Reportar Error</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="asunto" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Asunto
                  </label>
                  <input
                    type="text"
                    id="asunto"
                    required
                    minLength={3}
                    maxLength={200}
                    value={contactForm.asunto}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactForm({ ...contactForm, asunto: (e.target as HTMLInputElement).value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ej: Problema con la generación de videos"
                  />
                </div>
                <div>
                  <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mensaje
                  </label>
                  <textarea
                    id="mensaje"
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={6}
                    value={contactForm.mensaje}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContactForm({ ...contactForm, mensaje: (e.target as HTMLTextAreaElement).value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="Describe tu consulta, problema o sugerencia..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingContact}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingContact ? 'Enviando...' : 'Enviar Mensaje'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
    <SocialConnectModal
      isOpen={showConnectModal}
      onClose={() => { setShowConnectModal(false); setConnecting(null); }}
      onConnected={async () => { await fetchSocialConnections(); setSuccess('Conexión realizada correctamente'); setConnecting(null); }}
    />
    <ConnectInfoModal
      isOpen={showConnectInfoModal}
      onClose={() => { setShowConnectInfoModal(false); setSelectedPlatform(''); }}
      platformName={selectedPlatform}
    />
    </>
  );
};

export default Preferencias;
