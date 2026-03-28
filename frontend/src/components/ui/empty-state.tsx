import { LucideIcon } from 'lucide-react';
import React from 'react';

import { cn } from '../../lib/utils';

import { Button } from './button';
import { Card, CardContent } from './card';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

/**
 * EmptyState Component
 * Standardized component for displaying empty states with optional actions
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {Icon && (
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {description}
          </p>
        )}

        {children}

        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full sm:w-auto">
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || 'default'}
                className="w-full sm:w-auto"
              >
                {action.label}
              </Button>
            )}

            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact EmptyState for smaller areas
 */
export function EmptyStateCompact({
  icon: Icon,
  title,
  description,
  action,
  className,
}: Omit<EmptyStateProps, 'secondaryAction' | 'children'>) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 px-4 text-center', className)}>
      {Icon && (
        <Icon className="h-12 w-12 text-muted-foreground/50 mb-3" />
      )}

      <p className="text-sm font-medium text-foreground mb-1">
        {title}
      </p>

      {description && (
        <p className="text-xs text-muted-foreground mb-4">
          {description}
        </p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'outline'}
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * EmptyState for lists/tables
 */
export function EmptyStateList({
  icon: Icon,
  title,
  description,
  action,
}: Omit<EmptyStateProps, 'secondaryAction' | 'children' | 'className'>) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {Icon && (
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <h4 className="text-base font-medium text-foreground mb-2">
        {title}
      </h4>

      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          {description}
        </p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'default'}
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * EmptyState with illustration
 */
export function EmptyStateIllustration({
  illustration,
  title,
  description,
  action,
  secondaryAction,
  className,
}: Omit<EmptyStateProps, 'icon'> & { illustration: string }) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <img 
          src={illustration} 
          alt={title}
          className="w-48 h-48 object-contain mb-6 opacity-75"
        />

        <h3 className="text-xl font-semibold text-foreground mb-2">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {description}
          </p>
        )}

        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full sm:w-auto">
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || 'default'}
                className="w-full sm:w-auto"
              >
                {action.label}
              </Button>
            )}

            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
