export type ExerciseCardType =
  | 'breathing-animation'
  | 'grounding-checklist'
  | 'cbt-thought-record'
  | 'body-scan-visual'
  | 'worry-dump-timer';

export interface ExerciseCardMeta {
  exerciseCard: ExerciseCardType;
  exerciseId: string;
  title?: string;
  duration?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  pattern?: { inhale: number; hold: number; exhale: number; pause?: number };
  rounds?: number;
  steps?: string[];
  cbtSteps?: { step: number; title: string; prompt: string }[];
}

export interface AssessmentPromptMeta {
  actionRequired: 'trigger_gad2_assessment';
  assessmentType: 'anxiety_gad2';
  prompt: string;
  ctaLabel: string;
  daysSinceLastAssessment: number | null;
}

const exerciseCardTypes: ExerciseCardType[] = [
  'breathing-animation',
  'grounding-checklist',
  'cbt-thought-record',
  'body-scan-visual',
  'worry-dump-timer'
];

const isExerciseCardType = (value: unknown): value is ExerciseCardType => {
  return typeof value === 'string' && exerciseCardTypes.includes(value as ExerciseCardType);
};

const parseRawMetadata = (metadata: unknown): Record<string, unknown> | null => {
  if (!metadata) {
    return null;
  }

  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  return null;
};

export const parseExerciseCardMeta = (metadata: unknown): ExerciseCardMeta | null => {
  const parsed = parseRawMetadata(metadata);
  if (!parsed) {
    return null;
  }

  const exerciseCard = parsed.exerciseCard;
  if (!isExerciseCardType(exerciseCard)) {
    return null;
  }

  const exerciseId = typeof parsed.exerciseId === 'string' ? parsed.exerciseId : '';
  if (!exerciseId) {
    return null;
  }

  return {
    exerciseCard,
    exerciseId,
    title: typeof parsed.title === 'string' ? parsed.title : undefined,
    duration: typeof parsed.duration === 'number' ? parsed.duration : undefined,
    difficulty:
      parsed.difficulty === 'beginner' || parsed.difficulty === 'intermediate' || parsed.difficulty === 'advanced'
        ? parsed.difficulty
        : undefined,
    pattern:
      parsed.pattern &&
      typeof parsed.pattern === 'object' &&
      !Array.isArray(parsed.pattern) &&
      typeof (parsed.pattern as Record<string, unknown>).inhale === 'number' &&
      typeof (parsed.pattern as Record<string, unknown>).exhale === 'number'
        ? {
            inhale: (parsed.pattern as Record<string, number>).inhale,
            hold: typeof (parsed.pattern as Record<string, unknown>).hold === 'number'
              ? (parsed.pattern as Record<string, number>).hold
              : 0,
            exhale: (parsed.pattern as Record<string, number>).exhale,
            pause: typeof (parsed.pattern as Record<string, unknown>).pause === 'number'
              ? (parsed.pattern as Record<string, number>).pause
              : undefined,
          }
        : undefined,
    rounds: typeof parsed.rounds === 'number' ? parsed.rounds : undefined,
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.filter((step): step is string => typeof step === 'string')
      : undefined,
    cbtSteps: Array.isArray(parsed.cbtSteps)
      ? parsed.cbtSteps
          .filter((step): step is { step: number; title: string; prompt: string } => {
            if (!step || typeof step !== 'object' || Array.isArray(step)) return false;
            const asRecord = step as Record<string, unknown>;
            return (
              typeof asRecord.step === 'number' &&
              typeof asRecord.title === 'string' &&
              typeof asRecord.prompt === 'string'
            );
          })
      : undefined,
  };
};

export const parseAssessmentPromptMeta = (metadata: unknown): AssessmentPromptMeta | null => {
  const parsed = parseRawMetadata(metadata);
  if (!parsed) {
    return null;
  }

  const source = (() => {
    const nested = parsed.assessmentPrompt;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    return parsed;
  })();

  const actionRequired = source.actionRequired ?? parsed.actionRequired;
  if (actionRequired !== 'trigger_gad2_assessment') {
    return null;
  }

  if (source.assessmentType !== 'anxiety_gad2') {
    return null;
  }

  if (typeof source.prompt !== 'string' || source.prompt.trim().length === 0) {
    return null;
  }

  return {
    actionRequired: 'trigger_gad2_assessment',
    assessmentType: 'anxiety_gad2',
    prompt: source.prompt.trim(),
    ctaLabel: typeof source.ctaLabel === 'string' && source.ctaLabel.trim().length > 0
      ? source.ctaLabel.trim()
      : 'Start quick anxiety check',
    daysSinceLastAssessment: typeof source.daysSinceLastAssessment === 'number'
      ? source.daysSinceLastAssessment
      : null,
  };
};
