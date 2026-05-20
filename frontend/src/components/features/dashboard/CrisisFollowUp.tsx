import { AlertTriangle, HeartHandshake, LifeBuoy } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { crisisApi, type CrisisEvent } from '../../../services/api';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';

interface CrisisFollowUpProps {
  event: CrisisEvent;
  onRespond?: () => void;
  onNavigate: (page: string) => void;
}

type FollowUpChoice = 'better' | 'same' | 'struggling';

const copyByChoice: Record<FollowUpChoice, string> = {
  better: 'I\'m feeling better',
  same: 'About the same',
  struggling: 'Still struggling'
};

function toRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const days = Math.round(diffHours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function CrisisFollowUp({ event, onRespond, onNavigate }: CrisisFollowUpProps) {
  const [submittingChoice, setSubmittingChoice] = useState<FollowUpChoice | null>(null);
  const [completedChoice, setCompletedChoice] = useState<FollowUpChoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const relativeTime = useMemo(() => toRelativeTime(event.detectedAt), [event.detectedAt]);

  const submitChoice = async (choice: FollowUpChoice) => {
    if (submittingChoice) return;

    setError(null);
    setSubmittingChoice(choice);

    try {
      const response = await crisisApi.submitFollowUp({
        eventId: event.id,
        response: choice
      });

      if (!response.success) {
        setError(response.error || 'Unable to save your response right now.');
        setSubmittingChoice(null);
        return;
      }

      setCompletedChoice(choice);
      setSubmittingChoice(null);
      onRespond?.();
    } catch (submitError) {
      console.error('Failed to submit crisis follow-up:', submitError);
      setError('Unable to save your response right now.');
      setSubmittingChoice(null);
    }
  };

  return (
    <Card className="border-red-200 bg-gradient-to-r from-red-50/90 via-rose-50/70 to-background">
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-700">
              <HeartHandshake className="h-5 w-5" />
              <h3 className="font-semibold text-base">Quick follow-up</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              We noticed things felt heavy {relativeTime}. How are you feeling now?
            </p>
          </div>
          <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
            Safety check
          </Badge>
        </div>

        {completedChoice ? (
          <div className="space-y-3 rounded-lg border border-red-200/70 bg-background/80 p-3">
            <p className="text-sm">
              Thanks for checking in: <strong>{copyByChoice[completedChoice]}</strong>
            </p>
            {completedChoice === 'struggling' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => onNavigate('help')}
                  className="min-h-[40px]"
                >
                  <LifeBuoy className="h-4 w-4 mr-2" />
                  Crisis resources
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate('chatbot')}
                  className="min-h-[40px]"
                >
                  Talk to AI companion
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(copyByChoice) as FollowUpChoice[]).map((choice) => (
              <Button
                key={choice}
                variant={choice === 'struggling' ? 'destructive' : 'outline'}
                size="sm"
                className="min-h-[40px]"
                disabled={Boolean(submittingChoice)}
                onClick={() => submitChoice(choice)}
              >
                {submittingChoice === choice ? 'Saving...' : copyByChoice[choice]}
              </Button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-700 flex items-center gap-2" role="alert">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default CrisisFollowUp;
