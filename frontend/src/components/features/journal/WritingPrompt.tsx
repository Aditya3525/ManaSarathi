import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../ui/button';

const PROMPTS = [
  'What moment today made you pause?',
  "What is something you're learning about yourself?",
  'Describe a small kindness you noticed today.',
  'What would you tell your yesterday self?',
  'What emotion visited you most today?',
  'What boundary did you maintain or wish you had?',
  'What gave you energy today? What drained it?',
  "Write about something you're grateful for that you usually overlook.",
];

interface WritingPromptProps {
  onUsePrompt: (prompt: string) => void;
}

export function WritingPrompt({ onUsePrompt }: WritingPromptProps) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length));

  const rotate = () => {
    setIndex((prev) => (prev + 1) % PROMPTS.length);
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/30 p-3">
      <span className="mt-0.5 shrink-0 text-xs font-semibold uppercase text-muted-foreground">Prompt</span>
      <div className="min-w-0 flex-1">
        <p className="page-enter text-sm italic leading-relaxed text-muted-foreground" key={index}>
          {PROMPTS[index]}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rotate} aria-label="New prompt">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onUsePrompt(PROMPTS[index])}>
          Use
        </Button>
      </div>
    </div>
  );
}

export default WritingPrompt;