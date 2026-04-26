import { CheckCircle2, HelpCircle, Lock } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Separator } from '../../ui/separator';

const DEFAULT_SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  'What was the name of your first pet?',
  'What city were you born in?',
  "What is your favorite teacher's name?",
  "What was the model of your first mobile phone?",
  "What is your favorite childhood friend's name?",
  'What is your favorite movie?',
  'What was the name of your first school?',
  "What's your favorite food?",
  "What's your dream job as a child?"
];

interface SecurityQuestionSetupProps {
  onComplete: (payload: { question: string; answer: string }) => Promise<void> | void;
  userName?: string | null;
  isSubmitting?: boolean;
  error?: string | null;
  variant?: 'full' | 'card';
}

export const SecurityQuestionSetup: React.FC<SecurityQuestionSetupProps> = ({
  onComplete,
  userName,
  isSubmitting = false,
  error,
  variant = 'full'
}) => {
  const questions = useMemo(() => DEFAULT_SECURITY_QUESTIONS, []);
  const [selectedQuestion, setSelectedQuestion] = useState<string>(questions[0] ?? '');
  const [customQuestion, setCustomQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isProcessing = isSubmitting || submitting;
  const effectiveError = formError || error;
  const questionIsCustom = selectedQuestion === 'custom';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const questionToPersist = questionIsCustom ? customQuestion.trim() : selectedQuestion.trim();
    const answerToPersist = answer.trim();

    if (!questionToPersist) {
      setFormError('Please select or provide a security question.');
      return;
    }

    if (!answerToPersist) {
      setFormError('Please provide an answer to your security question.');
      return;
    }

    setSubmitting(true);
    try {
      await onComplete({ question: questionToPersist, answer: answerToPersist });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save security question. Please try again.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const headerContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
          <Lock className="mr-2 h-3.5 w-3.5" />
          Secure your recovery
        </Badge>
      </div>
      <CardTitle className="text-2xl font-semibold">Add a security question</CardTitle>
      <CardDescription>
        {userName ? `Hi ${userName}, choose a question only you can answer.` : 'Choose a question only you can answer.'}{' '}
        This helps us verify it’s really you if you ever forget your password.
      </CardDescription>
    </div>
  );

  const formFields = (
    <>
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-muted-foreground">Select a question</Label>
        <RadioGroup value={selectedQuestion} onValueChange={setSelectedQuestion} className="grid gap-3 md:grid-cols-2">
          {questions.map((question) => (
            <div key={question} className="flex items-start gap-3 rounded-lg border border-border/70 bg-background p-3">
              <RadioGroupItem value={question} id={question} className="mt-1" />
              <Label htmlFor={question} className="cursor-pointer text-sm leading-6">
                {question}
              </Label>
            </div>
          ))}
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/70 bg-background p-3">
            <RadioGroupItem value="custom" id="custom-question" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="custom-question" className="cursor-pointer text-sm font-medium">
                Use a custom question
              </Label>
              <Input
                type="text"
                value={customQuestion}
                onChange={(event) => setCustomQuestion(event.target.value)}
                placeholder="Enter your own question"
                disabled={!questionIsCustom || isProcessing}
                className="text-sm"
              />
            </div>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="security-answer">Your answer</Label>
        <Input
          id="security-answer"
          type="text"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Type your answer"
          disabled={isProcessing}
        />
        <p className="text-xs text-muted-foreground">
          Keep your answer memorable but hard to guess. We&apos;ll store it securely using strong hashing.
        </p>
      </div>
    </>
  );

  const infoContent = (
    <div className="space-y-5 text-sm text-muted-foreground">
      <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
        <p>We hash your answer with the same encryption standards as passwords—only you can provide the correct response.</p>
      </div>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
        <p>Choose something memorable that only you would know. Avoid facts that are public or posted on social media.</p>
      </div>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
        <p>You can update this question anytime from your account settings if your memories or preferences change.</p>
      </div>

      <Separator className="bg-border/70" />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Tips</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Answers aren&apos;t case-sensitive—use a phrase that&apos;s natural for you.</li>
          <li>Consider using a combination of words or numbers for extra uniqueness.</li>
          <li>If you choose a custom question, avoid yes/no questions.</li>
        </ul>
      </div>
    </div>
  );

  const formContent = (
    <>
      {effectiveError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{effectiveError}</AlertDescription>
        </Alert>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {formFields}

        <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
          {isProcessing ? 'Saving security question…' : 'Save and continue'}
        </Button>
      </form>
    </>
  );

  if (variant === 'card') {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
            <Lock className="mr-2 h-3.5 w-3.5" />
            Secure your recovery
          </Badge>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Add a security question</h3>
            <p className="text-sm text-muted-foreground">
              {userName ? `Hi ${userName}, choose a question only you can answer.` : 'Choose a question only you can answer.'}{' '}
              This helps us verify it’s really you if you ever forget your password.
            </p>
          </div>
        </div>
        {formContent}
        <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            Why this matters
          </div>
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">{infoContent}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:flex-row lg:items-start">
        <Card className="flex-1 shadow-lg">
          <CardHeader className="space-y-3">{headerContent}</CardHeader>
          <CardContent>{formContent}</CardContent>
        </Card>

        <Card className="flex-1 bg-background/80 shadow-sm ring-1 ring-border/60">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              Why this matters
            </div>
            <CardTitle className="text-xl">Security best practices</CardTitle>
            <CardDescription>
              Your security question adds an extra layer of protection when you need to recover your account.
            </CardDescription>
          </CardHeader>
          <CardContent>{infoContent}</CardContent>
        </Card>
      </div>
    </div>
  );
};
