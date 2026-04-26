import { Sparkles } from 'lucide-react';

import { Card, CardContent } from '../../ui/card';

interface JournalInsightProps {
  insight: string;
  entryCount: number;
}

export function JournalInsight({ insight, entryCount }: JournalInsightProps) {
  if (entryCount < 5) {
    return (
      <Card className="border-dashed border-primary/20 bg-primary/5">
        <CardContent className="space-y-2 p-4 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Write {5 - entryCount} more entries to unlock AI-powered insights about your patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="page-enter border-primary/15 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wide text-primary">AI Insight</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{insight}</p>
      </CardContent>
    </Card>
  );
}

export default JournalInsight;