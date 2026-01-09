import { useEffect, useState } from 'react';
import loadingIcon from '@/assets/loading-icon.png';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  opacity: number;
}

const CLAAS_COLOR = '#B4C618';
const HORSCH_COLOR = '#A01B1B';

interface LoadingScreenProps {
  showIcon?: boolean;
  showText?: boolean;
}

const LoadingScreen = ({ showIcon = true, showText = true }: LoadingScreenProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Create initial particles - more subtle
    const initialParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.15,
      color: Math.random() > 0.5 ? CLAAS_COLOR : HORSCH_COLOR,
      opacity: Math.random() * 0.3 + 0.1,
    }));
    setParticles(initialParticles);

    // Animate particles
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => {
        let newX = p.x + p.speedX;
        let newY = p.y + p.speedY;
        let newSpeedX = p.speedX;
        let newSpeedY = p.speedY;

        // Bounce off edges
        if (newX < 0 || newX > 100) {
          newSpeedX = -newSpeedX;
          newX = Math.max(0, Math.min(100, newX));
        }
        if (newY < 0 || newY > 100) {
          newSpeedY = -newSpeedY;
          newY = Math.max(0, Math.min(100, newY));
        }

        return {
          ...p,
          x: newX,
          y: newY,
          speedX: newSpeedX,
          speedY: newSpeedY,
        };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Blur background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
      
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full transition-all duration-300 ease-linear"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              opacity: particle.opacity,
              filter: `blur(${particle.size / 2}px)`,
              boxShadow: `0 0 ${particle.size * 3}px ${particle.color}40`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      {/* Spinning icon */}
      {showIcon && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            {/* Glow effect */}
            <div 
              className="absolute inset-0 animate-pulse rounded-full blur-xl"
              style={{
                background: `radial-gradient(circle, ${CLAAS_COLOR}30 0%, ${HORSCH_COLOR}30 50%, transparent 70%)`,
                transform: 'scale(1.5)',
              }}
            />
            {/* Icon */}
            <img 
              src={loadingIcon} 
              alt="Cargando" 
              className="w-20 h-20 animate-spin relative z-10"
              style={{ animationDuration: '2s' }}
            />
          </div>
          {showText && (
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Cargando...
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LoadingScreen;
