import { Heart, MessageCircle, BookOpen, HelpCircle, Gamepad2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useDevice } from '../../hooks/use-device';

import { cn } from './utils';

interface BottomNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  ariaLabel: string;
}

const getNavItems = (t: (key: string) => string): NavItem[] => [
  {
    id: 'dashboard',
    label: t('nav.dashboard'),
    icon: <Heart className="h-5 w-5" />,
    ariaLabel: t('nav.dashboard')
  },
  {
    id: 'practices',
    label: t('nav.practices'),
    icon: <BookOpen className="h-5 w-5" />,
    ariaLabel: t('nav.practices')
  },
  {
    id: 'games',
    label: t('nav.games') || 'Games',
    icon: <Gamepad2 className="h-5 w-5" />,
    ariaLabel: t('nav.games') || 'Wellness Games'
  },
  {
    id: 'chatbot',
    label: t('nav.chat'),
    icon: <MessageCircle className="h-5 w-5" />,
    ariaLabel: t('nav.chat')
  },
  {
    id: 'help',
    label: t('nav.help'),
    icon: <HelpCircle className="h-5 w-5" />,
    ariaLabel: t('nav.help')
  }
];

/**
 * Bottom navigation bar for mobile devices
 * 
 * Features:
 * - Fixed bottom position with safe area support
 * - 44x44px touch targets (iOS guidelines)
 * - 8-12px spacing between items
 * - Labels on all icons for clarity
 * - Accessible with ARIA labels
 * - Only shown on mobile devices
 */
export function BottomNavigation({ 
  currentPage, 
  onNavigate,
  className 
}: BottomNavigationProps) {
  const { isMobile } = useDevice();
  const { t } = useTranslation();

  // Only show on mobile devices
  if (!isMobile) {
    return null;
  }

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background/95 backdrop-blur-sm',
        'border-t border-border',
        'safe-bottom', // iOS safe area support
        className
      )}
      aria-label="Primary navigation"
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-1 max-w-md mx-auto">
        {getNavItems(t).map((item) => {
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-col items-center justify-center',
                'w-full', // Full width in grid cell
                'min-w-[44px] min-h-[44px]', // 44x44px touch target
                'px-1 py-2',
                'rounded-lg',
                'transition-colors duration-200',
                'touch-manipulation', // Optimize for touch
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="mb-1">
                {item.icon}
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-none',
                'whitespace-nowrap'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Spacer component to prevent content from being hidden behind bottom navigation
 * Add this at the bottom of your main content area
 */
export function BottomNavigationSpacer() {
  const { isMobile } = useDevice();

  if (!isMobile) {
    return null;
  }

  return <div className="h-16" aria-hidden="true" />;
}
