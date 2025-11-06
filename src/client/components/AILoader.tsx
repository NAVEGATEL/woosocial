import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface AILoaderProps {
  className?: string;
}

const AILoader: React.FC<AILoaderProps> = ({ className = '' }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const animationRef = useRef<any>(null);

  // Path del SVG original de AI.svg
  const aiPath = "M52.5 154.4 L87.3 39.6 H112.7 L147.5 154.4 H124.4 L117.5 129.4 H82.4 L75.4 154.4 Z M86.5 111.5 H113.5 L100 66.5 Z M172 39.6 H194 V154.4 H172 Z";

  useEffect(() => {
    if (!pathRef.current) return;

    const path = pathRef.current;
    const pathLength = path.getTotalLength();

    // Establecer el stroke-dasharray al tamaño total del path
    path.style.strokeDasharray = `${pathLength}`;
    path.style.strokeDashoffset = `${pathLength}`;

    // Animar el stroke-dashoffset para crear el efecto de dibujo continuo sin pausas
    animationRef.current = animate(path, {
      strokeDashoffset: [pathLength, -pathLength], // Va de positivo a negativo para loop continuo
      ease: 'linear',
      duration: 2500,
      loop: true,
      loopDelay: 0 // Sin delay entre loops
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.pause();
      }
    };
  }, []);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 320 180"
        className="w-64 h-auto"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', margin: '0 auto' }}
      >
        {/* Path de fondo con opacity baja (contorno completo) */}
        <path
          d={aiPath}
          fill="none"
          stroke="#8000FF"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.2"
        />

        {/* Path animado que se "dibuja" progresivamente */}
        <path
          ref={pathRef}
          d={aiPath}
          fill="none"
          stroke="#8000FF"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default AILoader;

