import { Play, Sparkles } from 'lucide-react';

import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';

interface OneThingTodayProps {
  title: string;
  description: string;
  duration?: string;
  onStart?: () => void;
}

export function OneThingToday({ title, description, duration, onStart }: OneThingTodayProps) {
  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-[var(--shadow-soft)]">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 animate-breathe">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              Your One Thing Today
            </p>
            <h3 className="text-base font-semibold leading-snug">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
          <Button
            size="sm"
            onClick={onStart}
            className="shrink-0 rounded-xl gap-2 shadow-sm"
          >
            <Play className="h-3.5 w-3.5" />
            {duration ? `Start · ${duration}` : 'Start'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
