import {
  FileText,
  Users,
  BookOpen,
  Brain,
  HelpCircle,
  AlertTriangle,
  Inbox,
  Search,
  Plus
} from 'lucide-react';
import React from 'react';

import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';

type EmptyStateType = 
  | 'content'
  | 'users'
  | 'practices'
  | 'assessments'
  | 'faqs'
  | 'crisis'
  | 'tickets'
  | 'search'
  | 'generic';

interface AdminEmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const emptyStateConfig: Record<EmptyStateType, {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel: string;
  gradient: string;
}> = {
  content: {
    icon: BookOpen,
    title: 'No content yet',
    description: 'Create your first article, video, or audio content to help users on their mental wellbeing journey.',
    actionLabel: 'Add Content',
    gradient: 'from-cyan-500 to-blue-500'
  },
  users: {
    icon: Users,
    title: 'No users found',
    description: 'Users will appear here once they sign up for the platform.',
    actionLabel: 'Invite Users',
    gradient: 'from-violet-500 to-purple-500'
  },
  practices: {
    icon: Brain,
    title: 'No practices yet',
    description: 'Add meditation, breathing exercises, or other wellness practices for users to explore.',
    actionLabel: 'Add Practice',
    gradient: 'from-emerald-500 to-teal-500'
  },
  assessments: {
    icon: FileText,
    title: 'No assessments created',
    description: 'Build mental health assessments to help users understand their wellbeing.',
    actionLabel: 'Create Assessment',
    gradient: 'from-amber-500 to-orange-500'
  },
  faqs: {
    icon: HelpCircle,
    title: 'No FAQs yet',
    description: 'Add frequently asked questions to help users find answers quickly.',
    actionLabel: 'Add FAQ',
    gradient: 'from-pink-500 to-rose-500'
  },
  crisis: {
    icon: AlertTriangle,
    title: 'No crisis resources',
    description: 'Add emergency hotlines and crisis resources to keep users safe.',
    actionLabel: 'Add Resource',
    gradient: 'from-red-500 to-rose-500'
  },
  tickets: {
    icon: Inbox,
    title: 'No support tickets',
    description: 'Great news! There are no pending support tickets at the moment.',
    actionLabel: 'View History',
    gradient: 'from-indigo-500 to-blue-500'
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you\'re looking for.',
    actionLabel: 'Clear Filters',
    gradient: 'from-gray-500 to-slate-500'
  },
  generic: {
    icon: FileText,
    title: 'Nothing here yet',
    description: 'This section is empty. Add some items to get started.',
    actionLabel: 'Get Started',
    gradient: 'from-primary to-primary/70'
  }
};

export function AdminEmptyState({
  type = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  className
}: AdminEmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4 text-center',
      className
    )}>
      {/* Animated icon with gradient background */}
      <div className="relative mb-6">
        {/* Glow effect */}
        <div className={cn(
          'absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-2xl scale-150',
          config.gradient
        )} />
        
        {/* Icon container */}
        <div className={cn(
          'relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg',
          config.gradient
        )}>
          <Icon className="h-10 w-10 text-white" />
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-primary/20 animate-pulse" />
        <div className="absolute -bottom-1 -left-3 h-3 w-3 rounded-full bg-primary/30 animate-pulse delay-150" />
      </div>

      {/* Text content */}
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title || config.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description || config.description}
      </p>

      {/* Action button */}
      {onAction && (
        <Button
          onClick={onAction}
          className={cn(
            'gap-2 bg-gradient-to-r shadow-lg hover:shadow-xl transition-shadow',
            config.gradient
          )}
        >
          <Plus className="h-4 w-4" />
          {actionLabel || config.actionLabel}
        </Button>
      )}

      {/* Decorative dots pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-1 w-1 rounded-full bg-primary/10" />
        <div className="absolute top-1/3 right-1/3 h-1.5 w-1.5 rounded-full bg-primary/15" />
        <div className="absolute bottom-1/4 left-1/3 h-1 w-1 rounded-full bg-primary/10" />
        <div className="absolute bottom-1/3 right-1/4 h-2 w-2 rounded-full bg-primary/10" />
      </div>
    </div>
  );
}

// Compact version for inline use
export function AdminEmptyStateCompact({
  type = 'generic',
  title,
  description,
  className
}: Omit<AdminEmptyStateProps, 'onAction' | 'actionLabel'>) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-dashed',
      className
    )}>
      <div className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br flex-shrink-0',
        config.gradient
      )}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="font-medium text-sm">{title || config.title}</p>
        <p className="text-xs text-muted-foreground">{description || config.description}</p>
      </div>
    </div>
  );
}
