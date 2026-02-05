import { ChevronRight, Home } from 'lucide-react';
import React from 'react';

import { cn } from '../../components/ui/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

interface AdminBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function AdminBreadcrumbs({ items, className }: AdminBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm text-muted-foreground', className)}
    >
      <ol className="flex items-center gap-1">
        {/* Home icon */}
        <li className="flex items-center">
          <button
            type="button"
            onClick={items[0]?.onClick}
            className="flex items-center gap-1 hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </button>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" aria-hidden="true" />
              {isLast ? (
                <span
                  className="flex items-center gap-1.5 font-medium text-foreground"
                  aria-current="page"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Helper to generate breadcrumbs from current section
export function generateBreadcrumbs(
  currentSection: string,
  onNavigate: (section: string) => void
): BreadcrumbItem[] {
  const sectionLabels: Record<string, string> = {
    overview: 'Overview',
    users: 'User Management',
    content: 'Content Library',
    practices: 'Practices',
    assessments: 'Assessments',
    therapists: 'Therapist Management',
    analytics: 'Analytics',
    'advanced-analytics': 'Advanced Analytics',
    faqs: 'FAQ Management',
    crisis: 'Crisis Resources',
    tickets: 'Support Tickets',
    diagnostics: 'System Diagnostics',
    activity: 'Activity Log'
  };

  const items: BreadcrumbItem[] = [
    {
      label: 'Admin',
      onClick: () => onNavigate('overview')
    }
  ];

  if (currentSection !== 'overview') {
    items.push({
      label: sectionLabels[currentSection] || currentSection,
      onClick: () => onNavigate(currentSection)
    });
  }

  return items;
}
