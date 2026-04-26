import React from 'react';

import { useDevice } from '../../hooks/use-device';

import { cn } from './utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Vertical spacing between children
   * small: 16-20px on mobile
   * medium: 20-24px on tablet/desktop
   */
  spacing?: 'small' | 'medium' | 'large';
}

/**
 * Container that maintains consistent spacing and rhythm
 * across different screen sizes
 */
export function ResponsiveContainer({ 
  children, 
  className,
  spacing = 'medium'
}: ResponsiveContainerProps) {
  const spacingClasses = {
    small: 'space-y-4 md:space-y-5',
    medium: 'space-y-5 md:space-y-6',
    large: 'space-y-6 md:space-y-8',
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Number of columns at different breakpoints
   * auto: Responsive based on screen size
   * custom: Use className for custom breakpoints
   */
  columns?: 'auto' | 'custom';
  /**
   * Gap between grid items
   */
  gap?: 'small' | 'medium' | 'large';
}

/**
 * Responsive grid that adapts to device size
 * - Small phones: 1 column
 * - Large phones: 1 column (with optional horizontal carousels)
 * - Tablet portrait: 2 columns
 * - Tablet landscape: 2-3 columns
 * - Desktop: Unchanged (as per design)
 */
export function ResponsiveGrid({ 
  children, 
  className,
  columns = 'auto',
  gap = 'medium'
}: ResponsiveGridProps) {
  const gapClasses = {
    small: 'gap-3 md:gap-4',
    medium: 'gap-4 md:gap-6',
    large: 'gap-6 md:gap-8',
  };

  const columnClasses = columns === 'auto' 
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    : '';

  return (
    <div className={cn(
      'grid',
      columnClasses,
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Spacing between stacked items
   */
  spacing?: 'compact' | 'normal' | 'relaxed';
}

/**
 * Vertical stack with consistent spacing
 * Used for single-column mobile layouts
 */
export function ResponsiveStack({ 
  children, 
  className,
  spacing = 'normal'
}: ResponsiveStackProps) {
  const spacingClasses = {
    compact: 'space-y-2',
    normal: 'space-y-3 md:space-y-4',
    relaxed: 'space-y-4 md:space-y-6',
  };

  return (
    <div className={cn('flex flex-col', spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}

interface ResponsiveCollapsibleSectionProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  summary?: string;
}

/**
 * Collapsible section for progressive disclosure on mobile
 */
export function ResponsiveCollapsibleSection({
  children,
  title,
  icon,
  defaultOpen = true,
  summary
}: ResponsiveCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const { isMobile } = useDevice();

  // Always open on desktop, collapsible on mobile
  const shouldCollapse = isMobile;

  if (!shouldCollapse) {
    return <>{children}</>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <svg
          className={cn(
            'w-5 h-5 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen ? (
        <div className="p-4">
          {children}
        </div>
      ) : summary ? (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          {summary}
        </div>
      ) : null}
    </div>
  );
}

// Backward-compatible alias for existing imports.
export const CollapsibleSection = ResponsiveCollapsibleSection;

interface HorizontalScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Snap behavior for carousel-like scrolling
   */
  snap?: boolean;
}

/**
 * Horizontal scroll container for card carousels on mobile
 * Used for metrics cards and other scrollable content
 */
export function HorizontalScrollContainer({
  children,
  className,
  snap = true
}: HorizontalScrollContainerProps) {
  return (
    <div className={cn(
      'overflow-x-auto',
      snap && 'snap-x snap-mandatory',
      'scrollbar-hide',
      '-mx-4 px-4', // Bleed to edges
      className
    )}>
      <div className={cn(
        'flex gap-4',
        snap && 'scroll-px-4'
      )}>
        {React.Children.map(children, (child, index) => (
          <div
            key={index}
            className={cn(
              'flex-shrink-0',
              snap && 'snap-center',
              'w-[85vw] max-w-[340px]' // 85-92% viewport width
            )}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
