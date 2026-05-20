import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface TimelineStep {
  id: string;
  label: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  weekNumber: number;
}

interface JourneyTimelineProps {
  steps: TimelineStep[];
  currentStep?: string;
}

export function JourneyTimeline({ steps, currentStep }: JourneyTimelineProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide py-4 px-2">
      {steps.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${step.status === 'completed'
                    ? 'bg-primary text-primary-foreground shadow-[var(--shadow-glow-primary)]'
                    : step.status === 'in-progress'
                      ? 'bg-primary/20 text-primary border-2 border-primary animate-glow'
                      : 'bg-muted text-muted-foreground border border-border'
                  }
                `}
              >
                {step.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : step.status === 'in-progress' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Week {step.weekNumber}
              </span>
              <span
                className={`text-[10px] whitespace-nowrap max-w-[80px] text-center truncate ${
                  isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div
                className={`w-8 sm:w-12 h-0.5 mx-1 rounded-full transition-colors duration-300 ${
                  step.status === 'completed' ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export type { TimelineStep, JourneyTimelineProps };
