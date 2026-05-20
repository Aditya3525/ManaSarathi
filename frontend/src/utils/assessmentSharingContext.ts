export const ASSESSMENT_SHARE_CONTEXT_STORAGE_KEY = 'ms-assessment-share-context-v1';

export type AssessmentShareSource = 'insights-share' | 'insights-discuss' | 'direct-booking';

export interface AssessmentShareSelection {
  scoreSummary: boolean;
  interpretation: boolean;
  recommendations: boolean;
  trend: boolean;
}

export interface AssessmentShareContext {
  source: AssessmentShareSource;
  assessmentType?: string;
  assessmentLabel: string;
  latestScore?: number;
  trend?: string;
  interpretation?: string;
  recommendations?: string[];
  wellnessScore?: number;
  generatedAt: string;
}

export const DEFAULT_SHARE_SELECTION: AssessmentShareSelection = {
  scoreSummary: true,
  interpretation: true,
  recommendations: true,
  trend: true,
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const sanitizeContext = (raw: unknown): AssessmentShareContext | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const source = value.source;
  const assessmentLabel = value.assessmentLabel;
  const generatedAt = value.generatedAt;

  if (
    (source !== 'insights-share' && source !== 'insights-discuss' && source !== 'direct-booking') ||
    typeof assessmentLabel !== 'string' ||
    assessmentLabel.trim().length === 0 ||
    typeof generatedAt !== 'string'
  ) {
    return null;
  }

  return {
    source,
    assessmentType: typeof value.assessmentType === 'string' ? value.assessmentType : undefined,
    assessmentLabel,
    latestScore: isFiniteNumber(value.latestScore) ? value.latestScore : undefined,
    trend: typeof value.trend === 'string' ? value.trend : undefined,
    interpretation: typeof value.interpretation === 'string' ? value.interpretation : undefined,
    recommendations: Array.isArray(value.recommendations)
      ? value.recommendations.filter((entry): entry is string => typeof entry === 'string')
      : undefined,
    wellnessScore: isFiniteNumber(value.wellnessScore) ? value.wellnessScore : undefined,
    generatedAt,
  };
};

export const saveAssessmentShareContext = (context: AssessmentShareContext): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ASSESSMENT_SHARE_CONTEXT_STORAGE_KEY, JSON.stringify(context));
};

export const readAssessmentShareContext = (): AssessmentShareContext | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(ASSESSMENT_SHARE_CONTEXT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return sanitizeContext(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const clearAssessmentShareContext = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ASSESSMENT_SHARE_CONTEXT_STORAGE_KEY);
};

export const getDefaultShareSelection = (context: AssessmentShareContext | null | undefined): AssessmentShareSelection => {
  if (!context) {
    return { ...DEFAULT_SHARE_SELECTION };
  }

  return {
    scoreSummary: isFiniteNumber(context.latestScore) || isFiniteNumber(context.wellnessScore),
    interpretation: typeof context.interpretation === 'string' && context.interpretation.trim().length > 0,
    recommendations: Array.isArray(context.recommendations) && context.recommendations.length > 0,
    trend: typeof context.trend === 'string' && context.trend.trim().length > 0,
  };
};

export const hasShareSelectionEnabled = (selection: AssessmentShareSelection): boolean =>
  selection.scoreSummary || selection.interpretation || selection.recommendations || selection.trend;
