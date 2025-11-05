import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Intentar obtener del localStorage, si no existe, usar 'light' por defecto
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        // Aplicar inmediatamente para evitar flash
        const root = document.documentElement;
        if (savedTheme === 'dark') {
          root.classList.add('dark');
          document.body.classList.add('dark');
        } else {
          root.classList.remove('dark');
          document.body.classList.remove('dark');
        }
        return savedTheme;
      } else {
        // Si no hay tema guardado, iniciar en modo claro y remover clase dark
        const root = document.documentElement;
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
    return 'light';
  });

  useEffect(() => {
    // Aplicar tema al elemento html (requerido por Tailwind)
    const root = document.documentElement;
    const body = document.body;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      // Asegurar que se remueva completamente la clase dark
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
    // Guardar en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

