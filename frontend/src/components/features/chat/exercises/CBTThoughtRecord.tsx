import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { journalApi } from '../../../../services/api';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Slider } from '../../../ui/slider';
import { Textarea } from '../../../ui/textarea';

interface CBTStep {
  step: number;
  title: string;
  prompt: string;
}

interface CBTThoughtRecordProps {
  title?: string;
  steps?: CBTStep[];
  onComplete?: () => void;
}

const defaultSteps: CBTStep[] = [
  { step: 1, title: 'What happened?', prompt: 'Describe the situation objectively.' },
  { step: 2, title: 'Automatic thought', prompt: 'What thought came up first?' },
  { step: 3, title: 'Emotion + intensity', prompt: 'What did you feel, and how intense was it?' },
  { step: 4, title: 'Evidence for', prompt: 'What supports this thought?' },
  { step: 5, title: 'Evidence against', prompt: 'What challenges this thought?' },
  { step: 6, title: 'Balanced thought', prompt: 'Write a kinder, realistic alternative thought.' },
  { step: 7, title: 'Re-rate emotion', prompt: 'After reframing, how intense is the emotion now?' },
];

export function CBTThoughtRecord({ title = 'CBT Thought Record', steps, onComplete }: CBTThoughtRecordProps) {
  const resolvedSteps = useMemo(() => (steps && steps.length > 0 ? steps : defaultSteps), [steps]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [emotionLabel, setEmotionLabel] = useState('');
  const [emotionBefore, setEmotionBefore] = useState(75);
  const [emotionAfter, setEmotionAfter] = useState(40);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const currentStep = resolvedSteps[activeIndex];

  const persistToJournal = async () => {
    setSaveError(null);
    setIsSaving(true);

    try {
      const body = resolvedSteps
        .map((step) => `### ${step.title}\n${answers[step.step] || 'No response recorded.'}`)
        .join('\n\n');

      const reflection = [
        `Emotion: ${emotionLabel || 'Not specified'}`,
        `Intensity before: ${emotionBefore}/100`,
        `Intensity after: ${emotionAfter}/100`,
      ].join('\n');

      const response = await journalApi.createEntry({
        prompt: 'CBT Thought Record',
        content: `${body}\n\n${reflection}`,
        tags: ['cbt', 'thought-record', 'chat-exercise'],
      });

      if (!response.success) {
        setSaveError(response.error || 'Unable to save this thought record.');
        setIsSaving(false);
        return;
      }

      setSaved(true);
      setIsSaving(false);
      onComplete?.();
    } catch (error) {
      console.error('Failed to save CBT thought record:', error);
      setSaveError('Unable to save this thought record.');
      setIsSaving(false);
    }
  };

  const moveNext = async () => {
    if (activeIndex === resolvedSteps.length - 1) {
      await persistToJournal();
      return;
    }
    setActiveIndex((index) => Math.min(index + 1, resolvedSteps.length - 1));
  };

  return (
    <Card className="border-violet-200 bg-gradient-to-b from-violet-50/80 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {activeIndex + 1} of {resolvedSteps.length}
          </span>
          <span>{currentStep.title}</span>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${Math.round(((activeIndex + 1) / resolvedSteps.length) * 100)}%` }}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{currentStep.prompt}</p>
          <Textarea
            value={answers[currentStep.step] || ''}
            onChange={(event) => {
              const value = event.target.value;
              setAnswers((prev) => ({ ...prev, [currentStep.step]: value }));
            }}
            placeholder="Write freely here..."
            className="min-h-[120px]"
          />
        </div>

        {(currentStep.step === 3 || currentStep.step === 7) && (
          <div className="space-y-3 rounded-lg border border-violet-200/70 bg-background/80 p-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="cbt-emotion">
                Emotion label
              </label>
              <Input
                id="cbt-emotion"
                value={emotionLabel}
                onChange={(event) => setEmotionLabel(event.target.value)}
                placeholder="e.g. anxiety, shame, frustration"
              />
            </div>

            {currentStep.step === 3 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Intensity before reframing: {emotionBefore}/100</div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[emotionBefore]}
                  onValueChange={(value) => setEmotionBefore(value[0] ?? 75)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium">Intensity after reframing: {emotionAfter}/100</div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[emotionAfter]}
                  onValueChange={(value) => setEmotionAfter(value[0] ?? 40)}
                />
              </div>
            )}
          </div>
        )}

        {saved && (
          <p className="text-sm text-emerald-700">Thought record saved to your journal.</p>
        )}

        {saveError && (
          <p className="text-sm text-red-700" role="alert">
            {saveError}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveIndex((index) => Math.max(index - 1, 0))}
            disabled={activeIndex === 0 || isSaving}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button onClick={() => void moveNext()} disabled={isSaving}>
            {activeIndex === resolvedSteps.length - 1 ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save record'}
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CBTThoughtRecord;
