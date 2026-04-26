import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { ProgressRing } from '../../ui/progress-ring';

interface ScoreRevealProps {
  score: number;
  maxScore?: number;
  interpretation: string;
  assessmentName: string;
  onContinue: () => void;
  recommendations?: string[];
}

export function ScoreReveal({
  score,
  maxScore = 100,
  interpretation,
  assessmentName,
  onContinue,
  recommendations,
}: ScoreRevealProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showInterpretation, setShowInterpretation] = useState(false);

  const safeMaxScore = maxScore > 0 ? maxScore : 100;
  const safeScore = Math.max(0, Math.min(score, safeMaxScore));
  const percentage = useMemo(
    () => Math.round((safeScore / safeMaxScore) * 100),
    [safeMaxScore, safeScore]
  );

  useEffect(() => {
    const duration = 1500;
    let start: number | null = null;
    let frame = 0;
    let revealTimeout = 0;

    setAnimatedScore(0);
    setShowInterpretation(false);

    const animate = (timestamp: number) => {
      if (start === null) {
        start = timestamp;
      }

      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * safeScore));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        revealTimeout = window.setTimeout(() => setShowInterpretation(true), 300);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(revealTimeout);
    };
  }, [safeScore]);

  return (
    <div className="page-enter flex min-h-[60vh] flex-col items-center justify-center space-y-6 p-6">
      <p className="text-sm text-muted-foreground">{assessmentName} - Complete</p>

      <ProgressRing value={percentage} size={160} strokeWidth={8} label={`${animatedScore}`} />

      {showInterpretation && (
        <Card className="page-enter w-full max-w-md">
          <CardContent className="space-y-4 p-5 text-center">
            <h3 className="text-lg font-semibold">{interpretation}</h3>

            {recommendations && recommendations.length > 0 && (
              <div className="space-y-2 text-left">
                <p className="text-sm font-medium text-muted-foreground">Recommendations:</p>
                <ul className="space-y-1.5">
                  {recommendations.slice(0, 3).map((recommendation, index) => (
                    <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="shrink-0 text-primary">*</span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={onContinue} className="w-full rounded-xl">
              Continue
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export type { ScoreRevealProps };