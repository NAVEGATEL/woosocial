import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { deleteCache } from '../utils/cache';
import { useTheme } from '../hooks/useTheme';
import { Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Footer from './footer';
import PointsPurchaseModal from './PointsPurchaseModal';
import { FaCartPlus } from 'react-icons/fa';
import { MdLogout, MdMenu, MdClose } from "react-icons/md";
import { MdDarkMode, MdLightMode } from "react-icons/md";


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  useEffect(() => {
    const updateUnderline = () => {
      const activePath = location.pathname;
      const navEl = navRef.current;
      const linkEl = linkRefs.current[activePath];
      if (!navEl || !linkEl) {
        setUnderlineStyle((prev) => ({ ...prev, visible: false }));
        return;
      }

      // Casts to any to avoid issues when DOM lib types aren't present in TS config
      const navRect = (navEl as any).getBoundingClientRect();
      const linkRect = (linkEl as any).getBoundingClientRect();

      const left = linkRect.left - navRect.left + 8; // compensar padding-x (px-3 -> ~12px, afinamos con 8)
      const width = Math.max(0, linkRect.width - 16);

      setUnderlineStyle({ left, width, visible: true });
    };

    updateUnderline();

    // Recalcular posición de la barra cuando cambia el tamaño de la ventana
    const handleResize = () => {
      // Pequeño delay para asegurar que el DOM se haya actualizado
      setTimeout(updateUnderline, 100);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [location.pathname, user]);

  // Cerrar menú hamburguesa cuando cambia la ruta
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Cerrar menú hamburguesa al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!isMenuOpen) return;

      const target = event.target as Node;
      const menuElement = menuRef.current;
      const buttonElement = menuButtonRef.current;

      // Si el clic fue fuera del menú y del botón, cerrar el menú
      if (
        menuElement &&
        buttonElement &&
        !menuElement.contains(target) &&
        !buttonElement.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      // Agregar listeners cuando el menú está abierto
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isMenuOpen]);
  // Efecto para manejar el scrollbar y evitar el desplazamiento del header
  useEffect(() => {
    // Usar scrollbar-gutter para reservar siempre el espacio del scrollbar
    // Esto evita que el contenido se mueva cuando aparece/desaparece el scrollbar
    if (CSS.supports('scrollbar-gutter', 'stable')) {
      document.documentElement.style.scrollbarGutter = 'stable';

      return () => {
        document.documentElement.style.scrollbarGutter = '';
      };
    } else {
      // Fallback para navegadores antiguos: usar overflow-y scroll en html
      // para mantener siempre el espacio del scrollbar reservado
      const htmlElement = document.documentElement;
      const originalOverflow = htmlElement.style.overflowY;
      htmlElement.style.overflowY = 'scroll';

      return () => {
        htmlElement.style.overflowY = originalOverflow;
      };
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col color-fondo">
      {/* Header */}
      <header
        className={`bg-white dark:bg-[#1e2124] sticky top-0 z-50 relative ${theme === 'dark' ? 'border-b border-gray-700' : 'shadow-md'}`}
      >
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center w-[360px]">
              <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
                <img
                  src={theme === 'dark' ? "src/client/assets/img/WooVideoDarkMode.svg" : "src/client/assets/img/WooVideo.svg"}
                  alt="WooVideo"
                  className="w-[120px] sm:w-[150px]"
                />
              </Link>
            </div>

            {/* Navegación desktop - visible en escritorio */}
            {user && (
              <nav ref={navRef} className="hidden lg:flex relative transition-all duration-300 flex-1 justify-center">
                <Link
                  to="/dashboard"
                  ref={(el) => (linkRefs.current['/dashboard'] = el)}
                  className={`px-3 py-2 text-sm font-medium ${isActive('/dashboard')
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  Dashboard
                </Link>
                {user.rol !== 'admin' && (
                  <>
                    <Link
                      to="/generaciones"
                      ref={(el) => (linkRefs.current['/generaciones'] = el)}
                      className={`px-3 py-2 text-sm font-medium ${isActive('/generaciones')
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      Generaciones
                    </Link>
                    <Link
                      to="/publicaciones"
                      ref={(el) => (linkRefs.current['/publicaciones'] = el)}
                      className={`px-3 py-2 text-sm font-medium ${isActive('/publicaciones')
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      Publicaciones
                    </Link>
                    <Link
                      to="/comunicados"
                      ref={(el) => (linkRefs.current['/comunicados'] = el)}
                      className={`px-3 py-2 text-sm font-medium ${isActive('/comunicados')
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      Comunicados
                    </Link>
                  </>
                )}
                {user.rol === 'admin' && (
                  <>
                    <Link
                      to="/transacciones"
                      ref={(el) => (linkRefs.current['/transacciones'] = el)}
                      className={`px-3 py-2 text-sm font-medium ${isActive('/transacciones')
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      Transacciones
                    </Link>
                    <Link
                      to="/mensajes"
                      ref={(el) => (linkRefs.current['/mensajes'] = el)}
                      className={`px-3 py-2 text-sm font-medium ${isActive('/mensajes')
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      Mensajes
                    </Link>
                  </>
                )}
                <Link
                  to="/preferencias"
                  ref={(el) => (linkRefs.current['/preferencias'] = el)}
                  className={`px-3 py-2 text-sm font-medium ${isActive('/preferencias')
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  Preferencias
                </Link>

                {/* Barra inferior animada */}
                <div
                  className="absolute bottom-0 h-0.5 bg-purple-500"
                  style={{
                    left: underlineStyle.left,
                    width: underlineStyle.width,
                    opacity: underlineStyle.visible ? 1 : 0,
                    transition: 'left 250ms ease, width 250ms ease, opacity 150ms ease',
                  }}
                />
              </nav>
            )}

            {/* Controles superiores: puntos, modo oscuro, comprar, menú hamburguesa */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && (
                <>
                  {/* Puntos */}
                  <div className="flex items-center text-sm ml-6">
                    <span className="font-medium text-gray-900 dark:text-white">{user.puntos}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">pts.</span>
                  </div>

                  {/* Botón de toggle de tema */}
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-md dark:text-gray-100 bg-gray-200 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-400 transition-colors"
                    aria-label="Cambiar tema"
                    title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  >
                    {theme === 'dark' ? (
                      <MdLightMode className="w-5 h-5" />
                    ) : (
                      <MdDarkMode className="w-5 h-5" />
                    )}
                  </button>

                  {/* Botón comprar */}
                  {user.rol !== 'admin' && (
                    <button
                      onClick={() => setIsPurchaseModalOpen(true)}
                      className="bg-green-600 text-white p-2 rounded-md text-sm font-medium hover:bg-green-700 flex items-center"
                    >
                      <FaCartPlus className="w-5 h-5 sm:mr-1" />
                      <span className="hidden sm:inline">Comprar</span>
                    </button>
                  )}

                  {/* Botón cerrar sesión - visible solo en desktop */}
                  <button
                    onClick={logout}
                    className="hidden lg:flex bg-red-600 text-white p-2 rounded-md text-sm font-medium hover:bg-red-700 items-center min-w-[130px]"
                  >
                    <MdLogout className="w-5 h-5 mr-1 inline" />
                    Cerrar Sesión
                  </button>
                </>
              )}

              {/* Botón menú hamburguesa - solo visible en móvil/tablet */}
              {user ? (
                <button
                  ref={menuButtonRef}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600"
                  aria-label="Menú"
                >
                  {isMenuOpen ? (
                    <MdClose className="w-5 h-5" />
                  ) : (
                    <MdMenu className="w-5 h-5" />
                  )}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="text-white px-2 py-2 rounded-md text-sm font-medium h-[40px] border border-gray-300 dark:border-gray-600 w-[fit-content] bg-green-600 hover:bg-green-700"
                >
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Menú hamburguesa desplegable - solo visible en móvil/tablet */}
        {user && (
          <div
            ref={menuRef}
            className={`lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-[#1e2124] border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen
                ? 'max-h-screen opacity-100 translate-y-0'
                : 'max-h-0 opacity-0 -translate-y-4'
              }`}
          >
            <nav className="flex flex-col">
              <Link
                to="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className={`px-4 py-3 text-base font-medium  ${isActive('/dashboard')
                    ? 'text-purple-600 dark:text-purple-400 bg-gray-200 dark:bg-gray-600'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
              >
                Dashboard
              </Link>
              {user.rol !== 'admin' && (
                <>
                  <Link
                    to="/generaciones"
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 text-base font-medium ${isActive('/generaciones')
                        ? 'text-purple-600 dark:text-purple-400 bg-gray-200 dark:bg-gray-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                  >
                    Generaciones
                  </Link>
                  <Link
                    to="/publicaciones"
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 text-base font-medium ${isActive('/publicaciones')
                        ? 'text-purple-600 dark:text-purple-400 bg-gray-200 dark:bg-gray-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                  >
                    Publicaciones
                  </Link>
                  <Link
                    to="/comunicados"
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 text-base font-medium ${isActive('/comunicados')
                        ? 'text-purple-600 dark:text-purple-400 bg-gray-200 dark:bg-gray-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                  >
                    Comunicados
                  </Link>
                </>
              )}
              {user.rol === 'admin' && (
                <>
                  <Link
                    to="/transacciones"
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 text-base font-medium ${isActive('/transacciones')
                        ? 'text-purple-600 dark:text-purple-400 bg-gray-200 dark:bg-gray-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                  >
                    Transacciones
                  </Link>
                  <Link
                    to="/mensajes"
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 text-base font-medium ${isActive('/mensajes')
                        ? 'text-purple-600 dark:text-purple-400 bg-gray-200 dark:bg-gray-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                  >
                    Mensajes
                  </Link>
                </>
              )}
              <Link
                to="/preferencias"
                onClick={() => setIsMenuOpen(false)}
                className={`px-4 py-3 text-base font-medium ${isActive('/preferencias')
                    ? 'text-purple-600 dark:text-purple-400 bg-gray-200 dark:bg-gray-600'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
              >
                Preferencias
              </Link>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 flex items-center justify-start border-b border-gray-200 dark:border-gray-700"
                >
                  <MdLogout className="w-5 h-5 mr-2" />
                  Cerrar Sesión
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 sm:w-[90%] lg:w-[80%] max-w-[1300px] mx-auto pt-6 sm:px-4 ">
        <div className="px-2 sm:px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>

      <Footer />

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: theme === 'dark' ? 'bg-[#1e2124] text-white' : 'bg-white text-black',
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Points Purchase Modal */}
      <PointsPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSuccess={async (points) => {
          try {
            // Invalidar caché de estadísticas para forzar actualización
            if (user?.id) {
              deleteCache(`stats_${user.id}_v1`);
            }

            // Refrescar usuario desde el servidor
            await refreshUser();
          } catch (error) {
            console.error('Error al actualizar usuario después de compra:', error);
          }
        }}
      />

    </div>
  );
};

export default Layout;
