import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface DashboardCollapsibleSectionProps {
  title: string;
  summary?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: string | number;
}

export function DashboardCollapsibleSection({
  title,
  summary,
  icon,
  defaultOpen = false,
  children,
  badge,
}: DashboardCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `collapsible-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors duration-200 touch-manipulation text-left"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && <span className="text-primary/70 shrink-0">{icon}</span>}
          <div className="min-w-0">
            <span className="font-medium text-sm">{title}</span>
            {!isOpen && summary && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{summary}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge !== undefined && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>
      {isOpen ? (
        <div id={contentId} className="overflow-hidden">
          <div className="p-4 pt-0 border-t border-border/30">
            {children}
          </div>
        </div>
      ) : (
        <div id={contentId} className="hidden" aria-hidden="true" />
      )}
    </div>
  );
}

// Backward-compatible alias.
export { DashboardCollapsibleSection as CollapsibleSection };
