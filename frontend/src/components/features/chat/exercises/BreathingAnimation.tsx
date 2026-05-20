import { Pause, Play } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

interface BreathingAnimationProps {
  title?: string;
  pattern?: { inhale: number; hold: number; exhale: number; pause?: number };
  rounds?: number;
  onComplete?: () => void;
}

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'pause';

const phaseLabels: Record<BreathingPhase, string> = {
  inhale: 'Breathe in...',
  hold: 'Hold...',
  exhale: 'Breathe out...',
  pause: 'Rest...'
};

const defaultPattern = {
  inhale: 4,
  hold: 4,
  exhale: 4,
  pause: 2
};

const nextPhase = (phase: BreathingPhase, pattern: { inhale: number; hold: number; exhale: number; pause?: number }): BreathingPhase => {
  if (phase === 'inhale') return pattern.hold > 0 ? 'hold' : 'exhale';
  if (phase === 'hold') return 'exhale';
  if (phase === 'exhale') return (pattern.pause || 0) > 0 ? 'pause' : 'inhale';
  return 'inhale';
};

const phaseDurationSeconds = (phase: BreathingPhase, pattern: { inhale: number; hold: number; exhale: number; pause?: number }): number => {
  if (phase === 'inhale') return pattern.inhale;
  if (phase === 'hold') return pattern.hold;
  if (phase === 'exhale') return pattern.exhale;
  return pattern.pause || 0;
};

export function BreathingAnimation({
  title = 'Guided Breathing',
  pattern,
  rounds = 5,
  onComplete
}: BreathingAnimationProps) {
  const resolvedPattern = useMemo(() => ({ ...defaultPattern, ...(pattern || {}) }), [pattern]);
  const totalRounds = Math.max(1, rounds);

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<BreathingPhase>('inhale');
  const [currentRound, setCurrentRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(phaseDurationSeconds('inhale', resolvedPattern));

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setPhase('inhale');
    setCurrentRound(1);
    setSecondsLeft(phaseDurationSeconds('inhale', resolvedPattern));
    setIsRunning(false);
  }, [resolvedPattern, totalRounds]);

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        const upcomingPhase = nextPhase(phase, resolvedPattern);
        const completedRound = phase === 'exhale' || phase === 'pause';

        if (completedRound && upcomingPhase === 'inhale') {
          setCurrentRound((round) => {
            if (round >= totalRounds) {
              setIsRunning(false);
              onComplete?.();
              return totalRounds;
            }
            return round + 1;
          });
        }

        setPhase(upcomingPhase);
        return phaseDurationSeconds(upcomingPhase, resolvedPattern);
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isRunning, onComplete, phase, resolvedPattern, totalRounds]);

  const phaseScale =
    phase === 'inhale' ? 'scale-[1.6]' : phase === 'hold' ? 'scale-[1.6]' : phase === 'exhale' ? 'scale-100' : 'scale-95';

  return (
    <Card className="border-cyan-200 bg-gradient-to-b from-cyan-50/70 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Round {currentRound} of {totalRounds}
        </div>

        <div className="flex items-center justify-center py-4">
          <div className="relative h-40 w-40 flex items-center justify-center">
            <div
              className={`absolute h-28 w-28 rounded-full bg-cyan-300/50 transition-transform duration-1000 ease-in-out ${phaseScale}`}
            />
            <div className="relative z-10 text-center space-y-1">
              <p className="text-sm font-medium">{phaseLabels[phase]}</p>
              <p className="text-2xl font-semibold">{secondsLeft}s</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isRunning ? 'secondary' : 'default'}
            onClick={() => setIsRunning((prev) => !prev)}
            className="min-h-[40px]"
          >
            {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsRunning(false);
              setPhase('inhale');
              setCurrentRound(1);
              setSecondsLeft(phaseDurationSeconds('inhale', resolvedPattern));
            }}
            className="min-h-[40px]"
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default BreathingAnimation;
