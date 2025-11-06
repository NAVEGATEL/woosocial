import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { LoginForm } from '../types';

const Login: React.FC = () => {
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    contraseña: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  // Debug: Log cuando cambia el error
  useEffect(() => {
    if (error) {
      console.log('Error mostrado en Login:', error);
    }
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.contraseña);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Error en login:', err);
      
      // Determinar el mensaje de error apropiado
      const errorMessage = err?.message || err?.toString() || '';
      let displayMessage = 'Error al iniciar sesión';
      
      // Verificar si es un error de credenciales incorrectas
      const lowerMessage = errorMessage.toLowerCase();
      if (
        lowerMessage.includes('credenciales') ||
        lowerMessage.includes('incorrectas') ||
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('401') ||
        lowerMessage.includes('unauthorized') ||
        lowerMessage.includes('email o contraseña')
      ) {
        displayMessage = 'Credenciales incorrectas';
      } else if (errorMessage) {
        displayMessage = errorMessage;
      }
      
      setError(displayMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4">
        <div>
          <div className="flex justify-center mb-4">
            <img 
              src={theme === 'dark' ? "src/client/assets/img/WooVideoDarkMode.svg" : "src/client/assets/img/WooVideo.svg"} 
              alt="WooVideo" 
              className="w-[200px]" 
            />
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Iniciar Sesión
          </h2>
        </div>
        
        <form 
          className="mt-4 space-y-6" 
          onSubmit={handleSubmit} 
          noValidate
          onKeyDown={(e) => {
            if (e.key === 'Enter' && loading) {
              e.preventDefault();
            }
          }}
        >
          {error && (
            <div 
              className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-200 px-4 py-3 rounded-md text-sm"
              role="alert"
              aria-live="assertive"
            >
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-[#1e2124] rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="tu@email.com"
              />
            </div>
            
            <div>
              <label htmlFor="contraseña" className="block text-sm font-medium text-gray-700 dark:text-white">
                Contraseña
              </label>
              <input
                id="contraseña"
                name="contraseña"
                type="password"
                required
                value={formData.contraseña}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-[#1e2124] rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Tu contraseña"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                if (loading) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
