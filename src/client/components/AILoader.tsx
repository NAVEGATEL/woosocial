import React, { useEffect, useRef } from 'react';
import { animate, svg } from 'animejs';

interface AILoaderProps {
  className?: string;
}

const AILoader: React.FC<AILoaderProps> = ({ className = '' }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current || !dotRef.current) return;

    // Path que sigue el contorno de las letras "AI"
    const path = svgRef.current.querySelector('#motion-path') as SVGPathElement;
    if (!path) return;

    // Obtener el punto inicial del path
    const pathLength = path.getTotalLength();
    const startPoint = path.getPointAtLength(0);

    // Posición inicial del punto (inicio del path de la letra A)
    dotRef.current.setAttribute('cx', String(startPoint.x));
    dotRef.current.setAttribute('cy', String(startPoint.y));
    if (glowRef.current) {
      glowRef.current.setAttribute('cx', String(startPoint.x));
      glowRef.current.setAttribute('cy', String(startPoint.y));
    }

    // Crear la animación usando createMotionPath
    const { translateX, translateY, rotate } = svg.createMotionPath(path);

    // Animar el punto a lo largo del path
    animationRef.current = animate([dotRef.current, glowRef.current], {
      translateX,
      translateY,
      rotate,
      ease: 'linear',
      duration: 4000,
      loop: true
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.pause();
      }
    };
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 200 120"
        className="w-64 h-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Letras "AI" como stroke (línea fina) - solo contorno */}
        {/* Letra A - contorno visible */}
        <path
          d="M 40 100 L 40 50 L 55 30 L 70 50 L 70 100 M 40 70 L 70 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-600 dark:text-blue-400"
        />
        
        {/* Letra I - contorno visible */}
        <path
          d="M 110 30 L 110 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-blue-600 dark:text-blue-400"
        />

        {/* Path combinado que sigue el contorno completo de "AI" de forma continua */}
        {/* Recorre: A (lado izq -> vértice -> lado der -> travesaño) -> conexión -> I (abajo -> arriba) */}
        <path
          id="motion-path"
          d="M 40 100 L 40 50 L 55 30 L 70 50 L 70 100 L 70 70 L 40 70 L 80 70 L 110 70 L 110 100 L 110 30"
          fill="none"
          stroke="transparent"
          strokeWidth="2"
        />

        {/* Punto animado que sigue el contorno de las letras */}
        <circle
          ref={dotRef}
          r="6"
          fill="#3b82f6"
          className="dark:fill-blue-400"
        >
          {/* Efecto de brillo pulsante */}
          <animate
            attributeName="opacity"
            values="1;0.7;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Sombra/glow del punto */}
        <circle
          ref={glowRef}
          r="10"
          fill="#3b82f6"
          opacity="0.4"
          className="dark:fill-blue-400"
        >
          <animate
            attributeName="opacity"
            values="0.4;0.2;0.4"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
};

export default AILoader;

