import { CheckCircle2, Sparkles, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from './utils';

export interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  variant?: 'checkmark' | 'confetti' | 'sparkle';
  onComplete?: () => void;
  duration?: number; // in milliseconds
  className?: string;
}

/**
 * Success Animation Component
 * Shows animated success feedback with various styles
 */
export function SuccessAnimation({
  show,
  message,
  variant = 'checkmark',
  onComplete,
  duration = 2000,
  className,
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center pointer-events-none',
        className
      )}
    >
      {variant === 'checkmark' && (
        <CheckmarkSuccess message={message} />
      )}

      {variant === 'confetti' && (
        <ConfettiSuccess message={message} />
      )}

      {variant === 'sparkle' && (
        <SparkleSuccess message={message} />
      )}
    </div>
  );
}

/**
 * Checkmark Success Animation
 */
function CheckmarkSuccess({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 animate-in zoom-in-50 fade-in duration-300">
      <div className="relative">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
        
        {/* Success icon */}
        <div className="relative rounded-full bg-green-500 p-4 animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="h-12 w-12 text-white animate-in zoom-in-0 duration-700 delay-200" />
        </div>
      </div>

      {message && (
        <p className="text-lg font-semibold text-green-700 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-300">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Confetti Success Animation
 */
function ConfettiSuccess({ message }: { message?: string }) {
  const confettiPieces = Array.from({ length: 30 }, (_, i) => i);

  return (
    <>
      {/* Confetti pieces */}
      {confettiPieces.map((i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10%',
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${2 + Math.random()}s`,
          }}
        >
          <div
            className="h-3 w-3 rounded-sm"
            style={{
              backgroundColor: [
                '#ef4444', '#f59e0b', '#10b981', 
                '#3b82f6', '#8b5cf6', '#ec4899'
              ][Math.floor(Math.random() * 6)],
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        </div>
      ))}

      {/* Center message */}
      <div className="flex flex-col items-center gap-3 animate-in zoom-in-50 fade-in duration-300">
        <div className="rounded-full bg-gradient-to-br from-green-400 to-green-600 p-4 shadow-lg">
          <Star className="h-12 w-12 text-white animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        {message && (
          <p className="text-xl font-bold text-foreground animate-in slide-in-from-bottom-2 fade-in duration-500 delay-300 bg-card/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
            {message}
          </p>
        )}
      </div>
    </>
  );
}

/**
 * Sparkle Success Animation
 */
function SparkleSuccess({ message }: { message?: string }) {
  const sparkles = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Sparkle ring */}
      <div className="relative w-32 h-32">
        {sparkles.map((i) => {
          const angle = (i * 360) / sparkles.length;
          const x = Math.cos((angle * Math.PI) / 180) * 60;
          const y = Math.sin((angle * Math.PI) / 180) * 60;

          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 animate-sparkle"
              style={{
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <Sparkles className="h-6 w-6 text-yellow-400" />
            </div>
          );
        })}

        {/* Center success icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-4 shadow-lg animate-in zoom-in-50 duration-500">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {message && (
        <p className="text-lg font-semibold text-foreground animate-in slide-in-from-bottom-2 fade-in duration-500 delay-500">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Hook for triggering success animations
 */
export function useSuccessAnimation() {
  const [state, setState] = useState<{
    show: boolean;
    message: string;
    variant: 'checkmark' | 'confetti' | 'sparkle';
  }>({
    show: false,
    message: '',
    variant: 'checkmark',
  });

  const showSuccess = (
    message?: string,
    variant: 'checkmark' | 'confetti' | 'sparkle' = 'checkmark'
  ) => {
    setState({ show: true, message: message || '', variant });
  };

  const hideSuccess = () => {
    setState((prev) => ({ ...prev, show: false }));
  };

  return {
    ...state,
    showSuccess,
    hideSuccess,
  };
}

// Add these keyframes to your global CSS or tailwind.config.js
/*
@keyframes confetti {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

@keyframes sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}
*/
