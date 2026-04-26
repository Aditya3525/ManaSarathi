import { useState } from 'react';

import { Card, CardContent } from '../../ui/card';

interface MoodOption {
  emoji: string;
  label: string;
  value: string;
  color: string;
}

const MOODS: MoodOption[] = [
  { emoji: '😊', label: 'Great', value: 'Great', color: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20' },
  { emoji: '🙂', label: 'Good', value: 'Good', color: 'from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-900/20' },
  { emoji: '😐', label: 'Okay', value: 'Okay', color: 'from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20' },
  { emoji: '😔', label: 'Rough', value: 'Struggling', color: 'from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/20' },
  { emoji: '😰', label: 'Anxious', value: 'Anxious', color: 'from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20' },
];

interface MoodSelectorProps {
  onSelect: (mood: string) => void;
  selectedMood?: string | null;
  disabled?: boolean;
}

export function MoodSelector({ onSelect, selectedMood, disabled }: MoodSelectorProps) {
  const [animatingMood, setAnimatingMood] = useState<string | null>(null);

  const handleSelect = (mood: MoodOption) => {
    if (disabled) return;
    setAnimatingMood(mood.value);
    // Brief animation before submitting
    setTimeout(() => {
      onSelect(mood.value);
      setAnimatingMood(null);
    }, 300);
  };

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardContent className="p-0">
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-2">
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood.value;
            const isAnimating = animatingMood === mood.value;
            return (
              <button
                key={mood.value}
                type="button"
                onClick={() => handleSelect(mood)}
                disabled={disabled}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-2xl
                  transition-all duration-300 ease-out
                  min-w-[64px] touch-manipulation
                  ${isSelected
                    ? `bg-gradient-to-b ${mood.color} ring-2 ring-primary/30 shadow-md scale-105`
                    : 'hover:bg-muted/50 hover:scale-105'
                  }
                  ${isAnimating ? 'scale-115' : ''}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                aria-label={`Mood: ${mood.label}`}
                aria-pressed={isSelected}
              >
                <span
                  className={`text-3xl sm:text-4xl transition-transform duration-300 ${isAnimating ? 'scale-125' : ''}`}
                  role="img"
                  aria-hidden="true"
                >
                  {mood.emoji}
                </span>
                <span className={`text-xs font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {mood.label}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
