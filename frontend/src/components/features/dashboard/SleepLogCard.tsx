import { MoonStar } from 'lucide-react';
import { useMemo, useState } from 'react';

import { sleepApi, type SleepLog, type SleepStats } from '../../../services/api';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Slider } from '../../ui/slider';
import { Textarea } from '../../ui/textarea';

const SLEEP_FACTORS = ['worry', 'screen_time', 'caffeine', 'pain', 'noise', 'late_meal', 'work_stress'];

export interface SleepLogCardProps {
  latestLog: SleepLog | null;
  stats: SleepStats | null;
  onLogged?: () => void;
}

const dateKey = (dateInput: string): string => {
  const date = new Date(dateInput);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const toTimeValue = (dateInput?: string | null, fallback = '23:00'): string => {
  if (!dateInput) return fallback;
  const date = new Date(dateInput);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export function SleepLogCard({ latestLog, stats, onLogged }: SleepLogCardProps) {
  const [bedTime, setBedTime] = useState(() => toTimeValue(latestLog?.bedTime, '23:00'));
  const [wakeTime, setWakeTime] = useState(() => toTimeValue(latestLog?.wakeTime, '07:00'));
  const [quality, setQuality] = useState(() => latestLog?.quality ?? 3);
  const [notes, setNotes] = useState('');
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasTodayLog = useMemo(() => {
    if (!latestLog) return false;
    return dateKey(latestLog.createdAt) === dateKey(new Date().toISOString());
  }, [latestLog]);

  const toggleFactor = (factor: string) => {
    setSelectedFactors((prev) =>
      prev.includes(factor) ? prev.filter((item) => item !== factor) : [...prev, factor]
    );
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const [bedHour, bedMinute] = bedTime.split(':').map((value) => Number(value));
      const [wakeHour, wakeMinute] = wakeTime.split(':').map((value) => Number(value));

      if (!Number.isFinite(bedHour) || !Number.isFinite(bedMinute) || !Number.isFinite(wakeHour) || !Number.isFinite(wakeMinute)) {
        setError('Please enter valid bed and wake times.');
        return;
      }

      const now = new Date();
      const bedDate = new Date(now);
      bedDate.setHours(bedHour, bedMinute, 0, 0);

      const wakeDate = new Date(now);
      wakeDate.setHours(wakeHour, wakeMinute, 0, 0);

      if (wakeDate.getTime() <= bedDate.getTime()) {
        wakeDate.setDate(wakeDate.getDate() + 1);
      }

      const response = await sleepApi.logSleep({
        bedTime: bedDate.toISOString(),
        wakeTime: wakeDate.toISOString(),
        quality,
        factors: selectedFactors.length > 0 ? selectedFactors : undefined,
        notes: notes.trim() || undefined,
      });

      if (!response.success) {
        setError(response.error || 'Unable to save sleep log right now.');
        return;
      }

      setSuccessMessage('Sleep log saved. Your dashboard and coach context are updated.');
      setSelectedFactors([]);
      setNotes('');
      onLogged?.();
    } catch (submitError) {
      console.error('Failed to save sleep log:', submitError);
      setError('Unable to save sleep log right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestDuration = typeof latestLog?.duration === 'number' ? latestLog.duration.toFixed(1) : null;

  return (
    <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50/70 via-background to-slate-50/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <MoonStar className="h-5 w-5 text-cyan-600" />
          Sleep Tracking
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Latest sleep entry</p>
            {hasTodayLog ? <Badge variant="secondary">Logged today</Badge> : <Badge variant="outline">Not logged today</Badge>}
          </div>

          {latestLog ? (
            <p className="text-sm text-muted-foreground">
              {latestDuration ? `${latestDuration}h` : 'Duration n/a'} • quality {latestLog.quality}/5
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No sleep logs yet.</p>
          )}

          {stats && (
            <p className="text-xs text-muted-foreground">
              7-day average: {stats.averageDuration !== null ? `${stats.averageDuration.toFixed(1)}h` : 'n/a'} • quality{' '}
              {stats.averageQuality !== null ? `${stats.averageQuality.toFixed(1)}/5` : 'n/a'}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="sleep-bed-time">
              Bed time
            </label>
            <Input
              id="sleep-bed-time"
              type="time"
              value={bedTime}
              onChange={(event) => setBedTime(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="sleep-wake-time">
              Wake time
            </label>
            <Input
              id="sleep-wake-time"
              type="time"
              value={wakeTime}
              onChange={(event) => setWakeTime(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Sleep quality</span>
            <span className="text-muted-foreground">{quality}/5</span>
          </div>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[quality]}
            onValueChange={(value) => setQuality(value[0] ?? 3)}
            aria-label="Sleep quality"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Possible factors</p>
          <div className="flex flex-wrap gap-2">
            {SLEEP_FACTORS.map((factor) => {
              const active = selectedFactors.includes(factor);
              return (
                <Button
                  key={factor}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => toggleFactor(factor)}
                >
                  {factor.replace('_', ' ')}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="sleep-notes">
            Notes (optional)
          </label>
          <Textarea
            id="sleep-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything that impacted your sleep?"
            maxLength={500}
          />
        </div>

        {stats && stats.commonFactors.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Most common disruptors:{' '}
            {stats.commonFactors
              .slice(0, 3)
              .map((item) => item.factor.replace('_', ' '))
              .join(', ')}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {successMessage && (
          <p className="text-sm text-emerald-700" role="status">
            {successMessage}
          </p>
        )}

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full md:w-auto">
          {isSubmitting ? 'Saving...' : 'Save sleep log'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default SleepLogCard;
