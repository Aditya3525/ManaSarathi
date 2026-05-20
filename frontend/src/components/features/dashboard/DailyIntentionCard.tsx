import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

import { intentionsApi, type DailyIntention } from '../../../services/api';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';

const PRESET_INTENTIONS = [
  'I will notice one good moment today',
  'I will take 3 deep breaths when stressed',
  'I will set one clear boundary today',
  'I will eat one meal mindfully',
  'I will speak kindly to myself today',
  'I will step outside for 5 minutes',
  'I will say no to one thing that drains me',
  'I will reach out to someone I care about',
];

export interface DailyIntentionCardProps {
  intention: DailyIntention | null;
  currentHour: number;
  onUpdated?: () => void;
}

export function DailyIntentionCard({ intention, currentHour, onUpdated }: DailyIntentionCardProps) {
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customIntention, setCustomIntention] = useState('');
  const [reflectionChoice, setReflectionChoice] = useState<boolean | null>(null);
  const [reflectionNote, setReflectionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsReflection = Boolean(intention && intention.completed === null && currentHour >= 17);

  const handleSaveIntention = async () => {
    const intent = customIntention.trim() || selectedPreset;
    if (!intent) {
      setError('Choose a preset or write a custom intention.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await intentionsApi.setTodayIntention({
        intention: intent,
        isCustom: customIntention.trim().length > 0,
      });

      if (!response.success) {
        setError(response.error || 'Unable to save your intention right now.');
        return;
      }

      setSelectedPreset('');
      setCustomIntention('');
      onUpdated?.();
    } catch (submitError) {
      console.error('Failed to save intention:', submitError);
      setError('Unable to save your intention right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReflect = async () => {
    if (!intention) return;
    if (reflectionChoice === null) {
      setError('Choose Yes or Not yet before saving your reflection.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await intentionsApi.reflect(intention.id, {
        completed: reflectionChoice,
        reflection: reflectionNote.trim() || undefined,
      });

      if (!response.success) {
        setError(response.error || 'Unable to save your evening reflection right now.');
        return;
      }

      setReflectionChoice(null);
      setReflectionNote('');
      onUpdated?.();
    } catch (submitError) {
      console.error('Failed to save intention reflection:', submitError);
      setError('Unable to save your evening reflection right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-background to-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          {currentHour < 17 ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-indigo-500" />}
          Daily Intention
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!intention && (
          <>
            <p className="text-sm text-muted-foreground">
              Set one small focus for today. Keep it realistic and kind.
            </p>

            <div className="flex flex-wrap gap-2">
              {PRESET_INTENTIONS.map((preset) => {
                const isSelected = selectedPreset === preset;
                return (
                  <Button
                    key={preset}
                    type="button"
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedPreset(preset);
                      setError(null);
                    }}
                    className="max-w-full whitespace-normal text-left"
                  >
                    {preset}
                  </Button>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="custom-intention">
                Or write your own intention
              </label>
              <Input
                id="custom-intention"
                value={customIntention}
                onChange={(event) => setCustomIntention(event.target.value)}
                placeholder="I will..."
                maxLength={220}
              />
            </div>

            <Button onClick={handleSaveIntention} disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting ? 'Saving...' : 'Set today\'s intention'}
            </Button>
          </>
        )}

        {intention && (
          <>
            <div className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today&apos;s intention</p>
              <p className="text-sm font-medium">{intention.intention}</p>

              <div className="flex items-center gap-2 pt-1">
                {intention.completed === null && <Badge variant="secondary">Not reflected yet</Badge>}
                {intention.completed === true && <Badge className="bg-emerald-600 text-white">Completed</Badge>}
                {intention.completed === false && <Badge variant="destructive">Not completed</Badge>}
              </div>
            </div>

            {needsReflection && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Did you follow through today?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={reflectionChoice === true ? 'default' : 'outline'}
                    onClick={() => setReflectionChoice(true)}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={reflectionChoice === false ? 'default' : 'outline'}
                    onClick={() => setReflectionChoice(false)}
                  >
                    Not yet
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="intention-reflection">
                    Evening note (optional)
                  </label>
                  <Textarea
                    id="intention-reflection"
                    value={reflectionNote}
                    onChange={(event) => setReflectionNote(event.target.value)}
                    placeholder="What helped or got in the way?"
                    maxLength={500}
                  />
                </div>

                <Button onClick={handleReflect} disabled={isSubmitting} className="w-full md:w-auto">
                  {isSubmitting ? 'Saving...' : 'Save reflection'}
                </Button>
              </div>
            )}

            {intention.completed === null && currentHour < 17 && (
              <p className="text-sm text-muted-foreground">
                Come back this evening to reflect on how this intention went.
              </p>
            )}

            {intention.completed !== null && intention.reflection && (
              <p className="text-sm text-muted-foreground">
                Reflection: {intention.reflection}
              </p>
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default DailyIntentionCard;
