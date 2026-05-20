import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent } from '../../ui/card';

interface ProgressNarrativeProps {
  dominantMood: string;
  moodDaysCount: number;
  totalDays: number;
  anxietyChange?: number | null;
  streakDays: number;
  assessmentsCompleted: number;
}

export function ProgressNarrative({
  dominantMood,
  moodDaysCount,
  totalDays,
  anxietyChange,
  streakDays,
  assessmentsCompleted,
}: ProgressNarrativeProps) {
  const anxietyDirection = anxietyChange
    ? anxietyChange < 0
      ? 'dropped'
      : 'increased'
    : null;

  const anxietyIcon = anxietyChange
    ? anxietyChange < 0
      ? <TrendingDown className="h-3.5 w-3.5 text-emerald-500 inline" />
      : <TrendingUp className="h-3.5 w-3.5 text-rose-500 inline" />
    : <Minus className="h-3.5 w-3.5 text-muted-foreground inline" />;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10 shadow-[var(--shadow-soft)]">
      <CardContent className="p-5 space-y-3">
        <h3 className="font-semibold text-base">Your Story This Period</h3>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            This week you felt <strong className="text-foreground">{dominantMood}</strong> most often
            ({moodDaysCount}/{totalDays} days).
            {streakDays > 0 && (
              <> You&apos;ve maintained a <strong className="text-foreground">{streakDays}-day</strong> check-in streak.</>
            )}
          </p>
          {anxietyChange !== null && anxietyChange !== undefined && (
            <p>
              Your anxiety scores have {anxietyDirection} {anxietyIcon}{' '}
              <strong className="text-foreground">{Math.abs(Math.round(anxietyChange))}%</strong> since
              your last assessment.
            </p>
          )}
          {assessmentsCompleted > 0 && (
            <p>
              You&apos;ve completed <strong className="text-foreground">{assessmentsCompleted}</strong> assessments -
              your consistency is building a clearer picture of your wellbeing.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export type { ProgressNarrativeProps };
