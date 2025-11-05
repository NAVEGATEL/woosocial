import React, { useState, useRef } from 'react';
import { FaInstagram, FaLinkedin } from 'react-icons/fa';
import { useTheme } from '../hooks/useTheme';

const Footer: React.FC = () => {
  const { theme } = useTheme();
  const year = new Date().getFullYear();
  const [isSpinning, setIsSpinning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setIsSpinning(true), 6000);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsSpinning(false);
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin img {
          animation: spin 1s linear infinite;
        }
      `}</style>
 <footer
      className={`${theme === 'dark' ? 'bg-footer border-t-[5px] border-purple-700 mt-[80px]' : 'bg-footer border-t-[5px] mt-[80px] border-purple-400 shadow-lg backdrop-blur-md'}`}
    >
      <div className="max-w-[90%] mx-auto px-4 py-10 sm:px-6 lg:px-8 ">
        <div className="flex flex-wrap justify-between gap-8 md:gap-6">
          <div>
            <img
              src={theme === 'dark' ? "src/client/assets/img/WooVideoDarkMode.svg" : "src/client/assets/img/WooVideo.svg"}
              alt="WooVideo"
              className="w-[200px]"
            />
            <p className="mt-3 text-sm text-gray-900 dark:text-gray-400">Crea anuncios de tus videos y publícalos en tus redes sociales gracias a la IA.</p>
          </div>

          <div className="flex flex-wrap justify-between gap-8 text-sm text-gray-900 dark:text-gray-400 w-[fit-content] ">
            <div className="w-[fit-content]">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Contacto</h4>
              <ul className="space-y-2">
                <li><span className="font-medium text-gray-900 dark:text-white">Email:</span> info@navegatel.es</li>
                <li><span className="font-medium text-gray-900 dark:text-white">Tel:</span> 673 66 09 10 - 865 78 44 66</li>
                <li><span className="font-medium text-gray-900 dark:text-white">Dirección:</span> C/ Cardenal Cisneros, 5 - 03201 Elche (Alicante)</li>
              </ul>
            </div>
            
          </div>
          <div className="w-[fit-content]">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Redes</h4>
              <div className="flex items-center gap-4">
                <span aria-label="Instagram" title="Instagram" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                  <FaInstagram className="w-4 h-4" />
                </span>
                <span aria-label="LinkedIn" title="LinkedIn" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                  <FaLinkedin className="w-4 h-4" />
                </span>
              </div>
            </div>
        </div>

        <div className={`mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${theme === 'dark' ? 'border-t border-gray-700' : 'border-t border-gray-300'}`}>
          <div className="text-xs text-gray-900 dark:text-gray-400">
            <p>© {year} WooVideo | Desarrollado por Navegatel</p>
            <p>SUMANDO ON LINE SL | CIF: B54893066</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://navegatel.es"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Navegatel"
              className={isSpinning ? 'spin' : ''}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <img
                src="src/client/assets/img/navegatel.png"
                alt="Navegatel"
                className="h-6"
              />
            </a>
          </div>
        </div>


      </div>
    </footer>
    </>
  );
};

export default Footer;


