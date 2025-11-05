import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, LoginForm, RegisterForm, AuthContextType } from '../types';
import { apiService } from '../services/api';
import { getCache, setCache, deleteCache } from '../utils/cache';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          // Configurar el token en el servicio API antes de hacer la petición
          apiService.setToken(storedToken);
          // Intentar rehidratar usuario desde caché para evitar petición innecesaria
          const cachedUser = getCache<User>('auth_user_v1');
          if (cachedUser) {
            setUser(cachedUser);
            setToken(storedToken);
            setLoading(false);
            return;
          }
          
          try {
            // Intentar con retry en caso de que el servidor no esté listo
            let retries = 3;
            let lastError;
            
            while (retries > 0) {
              try {
                const response = await apiService.getCurrentUser();
                setUser(response.user);
                setToken(storedToken);
                // Guardar en caché por 10 minutos
                setCache<User>('auth_user_v1', response.user, 10 * 60 * 1000);
                console.log('✅ Sesión restaurada exitosamente');
                break;
              } catch (error: any) {
                lastError = error;
                console.log(`⚠️ Intento de restauración fallido, reintentando... (${4 - retries}/3)`);
                retries--;
                
                if (retries > 0) {
                  // Esperar 1 segundo antes del siguiente intento
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            }
            
            // Si todos los intentos fallaron, limpiar la sesión
            if (retries === 0) {
              console.error('❌ No se pudo restaurar la sesión después de 3 intentos:', lastError);
              localStorage.removeItem('token');
              apiService.setToken(null);
              setUser(null);
              setToken(null);
            }
          } catch (error) {
            console.error('❌ Error inesperado al restaurar sesión:', error);
            localStorage.removeItem('token');
            apiService.setToken(null);
            setUser(null);
            setToken(null);
            deleteCache('auth_user_v1');
          }
        } else {
          console.log('ℹ️ No hay token almacenado');
        }
      } catch (error) {
        console.error('❌ Error al inicializar autenticación:', error);
        localStorage.removeItem('token');
        apiService.setToken(null);
        setUser(null);
        setToken(null);
        deleteCache('auth_user_v1');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, contraseña: string) => {
    try {
      setLoading(true);
      const response = await apiService.login({ email, contraseña });
      
      // Configurar el token en el servicio API
      apiService.setToken(response.token);
      
      // Guardar en localStorage
      localStorage.setItem('token', response.token);
      
      // Actualizar estado
      setUser(response.user);
      setToken(response.token);
      setCache<User>('auth_user_v1', response.user, 10 * 60 * 1000);
      
      console.log('✅ Login exitoso, sesión guardada');
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterForm) => {
    try {
      setLoading(true);
      const response = await apiService.register(data);
      
      // Configurar el token en el servicio API
      apiService.setToken(response.token);
      
      // Guardar en localStorage
      localStorage.setItem('token', response.token);
      
      // Actualizar estado
      setUser(response.user);
      setToken(response.token);
      setCache<User>('auth_user_v1', response.user, 10 * 60 * 1000);
      
      console.log('✅ Registro exitoso, sesión guardada');
    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Limpiar token del servicio API
    apiService.setToken(null);
    
    // Limpiar localStorage
    localStorage.removeItem('token');
    deleteCache('auth_user_v1');
    
    // Limpiar estado
    setUser(null);
    setToken(null);
    
    console.log('✅ Logout exitoso, sesión limpiada');
  };

  const refreshUser = async () => {
    try {
      if (!token) {
        console.warn('⚠️ No hay token disponible para refrescar usuario');
        return;
      }

      // Invalidar caché del usuario para forzar actualización desde servidor
      deleteCache('auth_user_v1');

      // Obtener usuario actualizado desde el servidor
      const response = await apiService.getCurrentUser();
      
      // Actualizar estado y caché
      setUser(response.user);
      setCache<User>('auth_user_v1', response.user, 10 * 60 * 1000);
      
      console.log('✅ Usuario refrescado exitosamente');
    } catch (error) {
      console.error('❌ Error al refrescar usuario:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    refreshUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
