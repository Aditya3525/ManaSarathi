import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import { moodApi, type MoodEntry } from '../../../services/api';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Slider } from '../../ui/slider';

type EmotionGroupKey = 'joy' | 'sadness' | 'fear' | 'anger' | 'surprise' | 'disgust';

type EmotionGroupConfig = {
  key: EmotionGroupKey;
  label: string;
  positionClass: string;
  selectedClass: string;
  unselectedClass: string;
  emotions: string[];
};

const EMOTION_GROUPS: EmotionGroupConfig[] = [
  {
    key: 'joy',
    label: 'Joy',
    positionClass: 'col-start-2 row-start-1',
    selectedClass: 'border-emerald-600 bg-emerald-600 text-white',
    unselectedClass: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    emotions: ['Happy', 'Grateful', 'Excited', 'Calm', 'Proud'],
  },
  {
    key: 'sadness',
    label: 'Sadness',
    positionClass: 'col-start-1 row-start-2',
    selectedClass: 'border-sky-600 bg-sky-600 text-white',
    unselectedClass: 'border-sky-200 bg-sky-50 text-sky-900',
    emotions: ['Sad', 'Lonely', 'Hopeless', 'Numb', 'Grieving'],
  },
  {
    key: 'fear',
    label: 'Fear',
    positionClass: 'col-start-3 row-start-2',
    selectedClass: 'border-violet-600 bg-violet-600 text-white',
    unselectedClass: 'border-violet-200 bg-violet-50 text-violet-900',
    emotions: ['Anxious', 'Nervous', 'Worried', 'Overwhelmed', 'Insecure'],
  },
  {
    key: 'anger',
    label: 'Anger',
    positionClass: 'col-start-1 row-start-3',
    selectedClass: 'border-rose-600 bg-rose-600 text-white',
    unselectedClass: 'border-rose-200 bg-rose-50 text-rose-900',
    emotions: ['Frustrated', 'Irritated', 'Resentful', 'Jealous'],
  },
  {
    key: 'surprise',
    label: 'Surprise',
    positionClass: 'col-start-2 row-start-3',
    selectedClass: 'border-amber-600 bg-amber-600 text-white',
    unselectedClass: 'border-amber-200 bg-amber-50 text-amber-900',
    emotions: ['Amazed', 'Confused', 'Curious', 'Shocked'],
  },
  {
    key: 'disgust',
    label: 'Disgust',
    positionClass: 'col-start-3 row-start-3',
    selectedClass: 'border-slate-600 bg-slate-600 text-white',
    unselectedClass: 'border-slate-200 bg-slate-50 text-slate-900',
    emotions: ['Disappointed', 'Repulsed', 'Judgmental', 'Uneasy'],
  },
];

const LEGACY_MOOD_MAP: Record<EmotionGroupKey, string> = {
  joy: 'Great',
  sadness: 'Struggling',
  fear: 'Anxious',
  anger: 'Struggling',
  surprise: 'Good',
  disgust: 'Okay',
};

export interface EmotionWheelProps {
  onLogged?: (entry: MoodEntry) => void;
}

export function EmotionWheel({ onLogged }: EmotionWheelProps) {
  const [selectedGroup, setSelectedGroup] = useState<EmotionGroupKey | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [trigger, setTrigger] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeGroup = useMemo(
    () => EMOTION_GROUPS.find((group) => group.key === selectedGroup) ?? null,
    [selectedGroup]
  );

  const backgroundWash = selectedGroup
    ? ({
        joy: 'from-emerald-50/40 to-background dark:from-emerald-950/15',
        sadness: 'from-sky-50/40 to-background dark:from-sky-950/15',
        fear: 'from-violet-50/40 to-background dark:from-violet-950/15',
        anger: 'from-rose-50/40 to-background dark:from-rose-950/15',
        surprise: 'from-amber-50/40 to-background dark:from-amber-950/15',
        disgust: 'from-slate-50/40 to-background dark:from-slate-950/15',
      } as Record<EmotionGroupKey, string>)[selectedGroup]
    : 'from-background to-background';

  const legacyMood = selectedGroup ? LEGACY_MOOD_MAP[selectedGroup] : null;

  const handleGroupSelect = (group: EmotionGroupKey) => {
    setError(null);
    setSuccessMessage(null);

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }

    if (selectedGroup === group) {
      setSelectedGroup(null);
      setSelectedEmotion(null);
      return;
    }

    setSelectedGroup(group);
    setSelectedEmotion(null);
  };

  const handleSubmit = async () => {
    if (!selectedGroup || !selectedEmotion) {
      setError('Select an emotion group and a specific emotion first.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await moodApi.logMood({
        mood: LEGACY_MOOD_MAP[selectedGroup],
        emotion: selectedEmotion.toLowerCase(),
        emotionGroup: selectedGroup,
        intensity,
        trigger: trigger.trim() || undefined,
      });

      if (!response.success || !response.data) {
        setError(response.error || 'Unable to save your emotion check-in right now.');
        return;
      }

      setSuccessMessage('Emotion check-in saved. Your recommendations will adapt.');
      setTrigger('');
      onLogged?.(response.data);
    } catch (submitError) {
      console.error('Emotion wheel submission failed:', submitError);
      setError('Unable to save your emotion check-in right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`border-primary/15 bg-gradient-to-br ${backgroundWash} transition-all duration-500`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Emotion Wheel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pick the closest emotion, rate intensity, and optionally note what triggered it.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
          {EMOTION_GROUPS.map((group) => {
            const isSelected = group.key === selectedGroup;
            return (
              <Button
                key={group.key}
                type="button"
                variant="outline"
                className={`${group.positionClass} h-14 rounded-full border text-xs font-semibold transition-all duration-300 ${
                  isSelected
                    ? `${group.selectedClass} scale-105 shadow-md`
                    : `${group.unselectedClass} hover:scale-105`
                }`}
                onClick={() => handleGroupSelect(group.key)}
                aria-pressed={isSelected}
              >
                {group.label}
              </Button>
            );
          })}

          <div className="col-start-2 row-start-2 flex h-14 items-center justify-center rounded-full border border-dashed border-muted-foreground/30 bg-muted/30 px-2 text-center text-[11px] text-muted-foreground">
            {activeGroup ? `Selected: ${activeGroup.label}` : 'Choose a feeling family'}
          </div>
        </div>

        {activeGroup && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Sub-emotions in {activeGroup.label}</p>
            <div className="flex flex-wrap gap-2">
              {activeGroup.emotions.map((emotion) => {
                const isSelected = selectedEmotion === emotion;
                return (
                  <Button
                    key={emotion}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedEmotion(emotion);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                  >
                    {emotion}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Intensity</span>
            <span className="text-muted-foreground">{intensity}/10</span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[intensity]}
            onValueChange={(value) => setIntensity(value[0] ?? 5)}
            aria-label="Emotion intensity"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Light</span>
            <span>Deep</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="emotion-trigger">
            What brought this on? (optional)
          </label>
          <Input
            id="emotion-trigger"
            value={trigger}
            onChange={(event) => setTrigger(event.target.value)}
            placeholder="Example: deadline pressure, conflict, poor sleep"
            maxLength={250}
          />
        </div>

        {legacyMood && (
          <p className="text-xs text-muted-foreground">
            Legacy mood mapping: <span className="font-medium text-foreground">{legacyMood}</span>
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

        <Button
          type="button"
          className="w-full md:w-auto"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedEmotion || !selectedGroup}
        >
          {isSubmitting ? 'Saving...' : 'Save emotion check-in'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default EmotionWheel;
