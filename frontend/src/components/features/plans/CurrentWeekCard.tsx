import { CheckCircle, Circle, Pin } from 'lucide-react';

import type { PlanModuleWithState } from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';

interface CurrentWeekCardProps {
  weekTitle: string;
  modules: PlanModuleWithState[];
  overallProgress: number;
  onModuleClick: (moduleId: string) => void;
}

export function CurrentWeekCard({ weekTitle, modules, overallProgress, onModuleClick }: CurrentWeekCardProps) {
  return (
    <Card className="page-enter border-primary/20 shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">This Week: {weekTitle}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {modules.map((module) => {
          const isComplete = module.userState?.completed;
          const progress = module.userState?.progress ?? 0;

          return (
            <button
              key={module.id}
              type="button"
              onClick={() => onModuleClick(module.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-200 text-left touch-manipulation"
            >
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${isComplete ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                  {module.title}
                </span>
                {!isComplete && progress > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={progress} className="h-1 flex-1" />
                    <span className="text-[10px] text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}

        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Week progress</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export type { CurrentWeekCardProps };
