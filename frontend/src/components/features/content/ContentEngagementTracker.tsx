import { Heart, Loader2, Smile, Star, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/select';
import { Slider } from '../../ui/slider';

interface ContentEngagementTrackerProps {
  contentId: string;
  timeSpent: number; // in seconds
  onSubmit: (data: EngagementData) => Promise<void>;
  onClose: () => void;
  moodBefore?: string;
}

export interface EngagementData {
  completed: boolean;
  rating: number | null;
  timeSpent: number;
  moodBefore: string | null;
  moodAfter: string | null;
  effectiveness: number | null;
}

const moodOptions = [
  { value: 'happy', label: '😊 Happy', emoji: '😊' },
  { value: 'calm', label: '😌 Calm', emoji: '😌' },
  { value: 'anxious', label: '😰 Anxious', emoji: '😰' },
  { value: 'sad', label: '😢 Sad', emoji: '😢' },
  { value: 'stressed', label: '😫 Stressed', emoji: '😫' },
  { value: 'angry', label: '😠 Angry', emoji: '😠' },
  { value: 'neutral', label: '😐 Neutral', emoji: '😐' },
  { value: 'overwhelmed', label: '😵 Overwhelmed', emoji: '😵' },
  { value: 'hopeful', label: '🙂 Hopeful', emoji: '🙂' },
  { value: 'peaceful', label: '😇 Peaceful', emoji: '😇' }
];

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export function ContentEngagementTracker({
  timeSpent,
  onSubmit,
  onClose,
  moodBefore
}: ContentEngagementTrackerProps) {
  const { push } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<string>('');
  const [effectiveness, setEffectiveness] = useState<number[]>([5]);

  const handleSubmit = async () => {
    if (!rating) {
      push({
        title: 'Rating Required',
        description: 'Please rate this content before submitting.',
        type: 'error'
      });
      return;
    }

    if (!moodAfter) {
      push({
        title: 'Mood Required',
        description: 'Please select your current mood.',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        completed: true,
        rating,
        timeSpent: Math.round(timeSpent),
        moodBefore: moodBefore || null,
        moodAfter,
        effectiveness: effectiveness[0]
      });

      push({
        title: 'Thank you!',
        description: 'Your feedback helps us provide better recommendations.',
        type: 'success'
      });

      onClose();
    } catch (error) {
      console.error('Failed to submit engagement:', error);
      push({
        title: 'Submission Failed',
        description: 'Please try again or skip for now.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onSubmit({
      completed: true,
      rating: null,
      timeSpent: Math.round(timeSpent),
      moodBefore: moodBefore || null,
      moodAfter: null,
      effectiveness: null
    }).catch(console.error);
    
    onClose();
  };

  return (
    <div className="space-y-6 py-4">
      {/* Time Spent Display */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
          <Heart className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            You spent <span className="font-bold">{formatTime(Math.round(timeSpent))}</span> on this content
          </span>
        </div>
      </div>

      {/* Star Rating */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">How would you rate this content?</Label>
        <div className="flex items-center justify-center gap-2 py-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              onClick={() => setRating(star)}
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredRating ?? rating ?? 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
        {rating && (
          <p className="text-center text-sm text-muted-foreground">
            {rating === 1 && 'Not helpful'}
            {rating === 2 && 'Somewhat helpful'}
            {rating === 3 && 'Moderately helpful'}
            {rating === 4 && 'Very helpful'}
            {rating === 5 && 'Extremely helpful'}
          </p>
        )}
      </div>

      {/* Effectiveness Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">How effective was this for you?</Label>
          <span className="text-2xl font-bold text-primary">{effectiveness[0]}/10</span>
        </div>
        <Slider
          value={effectiveness}
          onValueChange={setEffectiveness}
          min={1}
          max={10}
          step={1}
          className="py-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Not effective</span>
          <span>Somewhat effective</span>
          <span>Very effective</span>
        </div>
      </div>

      {/* Mood After */}
      <div className="space-y-2">
        <Label htmlFor="mood-after" className="text-base font-semibold flex items-center gap-2">
          <Smile className="h-4 w-4" />
          How are you feeling now?
        </Label>
        <Select value={moodAfter} onValueChange={setMoodAfter}>
          <SelectTrigger id="mood-after" className="w-full">
            <SelectValue placeholder="Select your current mood" />
          </SelectTrigger>
          <SelectContent>
            {moodOptions.map((mood) => (
              <SelectItem key={mood.value} value={mood.value}>
                {mood.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mood Before Display (if available) */}
      {moodBefore && (
        <div className="p-3 bg-muted/50 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Mood before:</span>{' '}
            <span className="capitalize">
              {moodOptions.find((m) => m.value === moodBefore)?.emoji} {moodBefore}
            </span>
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={handleSkip}
          disabled={isSubmitting}
          className="flex-1"
        >
          Skip for now
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !rating || !moodAfter}
          className="flex-1 gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <ThumbsUp className="h-4 w-4" />
              Submit Feedback
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
