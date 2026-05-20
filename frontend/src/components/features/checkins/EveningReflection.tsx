import { MoonStar } from 'lucide-react';
import React, { useState } from 'react';

import { checkinsApi } from '../../../services/api';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Slider } from '../../ui/slider';

interface EveningReflectionProps {
  onComplete?: () => void;
}

const ratingLabel = (value: number): string => {
  if (value <= 1) return 'Very hard';
  if (value === 2) return 'Hard';
  if (value === 3) return 'Mixed';
  if (value === 4) return 'Good';
  return 'Great';
};

export function EveningReflection({ onComplete }: EveningReflectionProps) {
  const [dayRating, setDayRating] = useState(3);
  const [smallWin, setSmallWin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await checkinsApi.createCheckin({
        type: 'evening',
        responses: {
          dayRating,
          smallWin: smallWin.trim() || undefined
        }
      });

      if (!response.success) {
        setError(response.error || 'Unable to save your reflection right now.');
        return;
      }

      setSmallWin('');
      onComplete?.();
    } catch (submitError) {
      console.error('Evening reflection failed:', submitError);
      setError('Unable to save your reflection right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-background to-slate-50/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <MoonStar className="h-5 w-5 text-indigo-500" />
          Evening Reflection
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Close your day with one small reflection before sleep.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">How was your day?</span>
            <span className="text-muted-foreground">
              {ratingLabel(dayRating)} ({dayRating}/5)
            </span>
          </div>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[dayRating]}
            onValueChange={(value) => setDayRating(value[0] ?? 3)}
            aria-label="Day rating"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="small-win">
            Name one small win from today
          </label>
          <Input
            id="small-win"
            value={smallWin}
            onChange={(event) => setSmallWin(event.target.value)}
            placeholder="Something you handled, even if tiny"
            maxLength={180}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full md:w-auto"
        >
          {isSubmitting ? 'Saving...' : 'Save evening reflection'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default EveningReflection;
