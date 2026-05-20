import { Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';

interface InlineFeedbackProps {
  messageId: string;
  onSubmit: (messageId: string, rating: 'positive' | 'negative', notes?: string) => void;
  onDismiss?: () => void;
}

export function InlineFeedback({ messageId, onSubmit, onDismiss }: InlineFeedbackProps) {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleRating = (value: 'positive' | 'negative') => {
    setRating(value);
  };

  const handleSubmit = () => {
    if (!rating) {
      return;
    }

    onSubmit(messageId, rating, notes.trim() || undefined);
    setSubmitted(true);
    setTimeout(() => onDismiss?.(), 2000);
  };

  if (submitted) {
    return (
      <div className="text-xs text-muted-foreground py-2 message-enter">
        Thanks for your feedback.
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2 message-enter">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Was this helpful?</span>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={rating === 'positive' ? 'default' : 'outline'}
            className="h-7 px-2.5 text-xs rounded-lg"
            onClick={() => handleRating('positive')}
          >
            <ThumbsUp className="h-3 w-3 mr-1" /> Yes
          </Button>
          <Button
            size="sm"
            variant={rating === 'negative' ? 'default' : 'outline'}
            className="h-7 px-2.5 text-xs rounded-lg"
            onClick={() => handleRating('negative')}
          >
            <ThumbsDown className="h-3 w-3 mr-1" /> No
          </Button>
        </div>
      </div>

      {rating && (
        <div className="flex gap-2 items-end card-expand-enter">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Tell us more (optional)..."
            className="text-xs min-h-[60px] resize-none rounded-lg"
            maxLength={500}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            className="h-8 px-3 rounded-lg shrink-0"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
