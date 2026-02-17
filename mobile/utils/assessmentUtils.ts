/**
 * Assessment Utility Functions
 * 
 * Friendly labels, trend helpers, score interpretation, and type normalization.
 * Ported from webapp's assessmentUtils.ts
 */

import type { AssessmentTrend } from '@/types';

const sanitizeType = (type?: string): string =>
  (type ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const HIGHER_SCORE_BETTER_KEYS = [
  'emotionalintelligence',
  'teiquesf',
  'personality',
  'personalityminiipip',
];

/** Whether a higher score means "better" for this assessment type */
export const isHigherScoreBetter = (type?: string): boolean => {
  const normalized = sanitizeType(type);
  if (!normalized) return false;
  return HIGHER_SCORE_BETTER_KEYS.some((pattern) => normalized.includes(pattern));
};

/** Convert raw assessment type keys to user-friendly labels */
export const friendlyAssessmentLabel = (type: string): string => {
  switch (type) {
    case 'anxiety':
    case 'anxiety_assessment':
    case 'anxiety_gad2':
      return 'Anxiety';
    case 'depression':
    case 'depression_phq9':
    case 'depression_phq2':
    case 'phq9':
      return 'Depression';
    case 'stress':
    case 'stress_pss10':
    case 'stress_pss4':
      return 'Stress';
    case 'emotionalIntelligence':
    case 'emotional-intelligence':
    case 'emotional_intelligence':
    case 'emotional_intelligence_teique':
    case 'emotional_intelligence_ei10':
    case 'emotional_intelligence_eq5':
    case 'teique_sf':
      return 'Emotional Intelligence';
    case 'overthinking':
    case 'overthinking_ptq':
    case 'overthinking_brooding':
    case 'overthinking_rrs4':
      return 'Overthinking';
    case 'trauma-fear':
    case 'traumaFear':
    case 'trauma':
    case 'trauma_pcl5':
    case 'trauma_pcptsd5':
      return 'Trauma & Fear Response';
    case 'archetypes':
    case 'psychologicalArchetypes':
    case 'psychological_archetypes':
    case 'personality_mini_ipip':
    case 'personality':
      return 'Personality (Mini-IPIP)';
    case 'personality_bigfive10':
      return 'Personality Snapshot (Big Five)';
    default:
      return type
        .replace(/[-_]/g, ' ')
        .split(/(?=[A-Z])/)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[a-z]/, (match) => match.toUpperCase());
  }
};

/** Get color for assessment severity level */
export const getSeverityColor = (severity: string): { bg: string; text: string; icon: string } => {
  switch (severity?.toLowerCase()) {
    case 'minimal':
    case 'low':
    case 'excellent':
      return { bg: '#d1fae5', text: '#065f46', icon: '#10b981' };
    case 'mild':
    case 'moderate':
    case 'fair':
      return { bg: '#fef3c7', text: '#92400e', icon: '#f59e0b' };
    case 'moderately severe':
    case 'severe':
    case 'needs attention':
      return { bg: '#fee2e2', text: '#991b1b', icon: '#ef4444' };
    default:
      return { bg: '#e0e7ff', text: '#3730a3', icon: '#6366f1' };
  }
};

/** Get a human-readable trend label */
export const trendLabelForType = (
  type: string | undefined,
  trend: AssessmentTrend | 'mixed',
): string => {
  if (trend === 'mixed') return 'Mixed';
  if (trend === 'baseline') return 'Baseline';
  if (trend === 'stable') return 'Stable';

  const higherIsBetter = isHigherScoreBetter(type);

  if (trend === 'improving') return 'Improving';
  if (trend === 'declining') return higherIsBetter ? 'Declining' : 'Worsening';

  return trend;
};

/** Get NativeWind-compatible color class for a trend */
export const trendColor = (trend: AssessmentTrend | 'mixed'): string => {
  switch (trend) {
    case 'improving':
      return 'text-emerald-600';
    case 'declining':
      return 'text-rose-600';
    case 'stable':
      return 'text-blue-600';
    case 'mixed':
      return 'text-amber-600';
    default:
      return 'text-gray-600';
  }
};

/** Get hex color for a trend (useful for icons) */
export const trendHexColor = (trend: AssessmentTrend | 'mixed'): string => {
  switch (trend) {
    case 'improving':
      return '#059669';
    case 'declining':
      return '#e11d48';
    case 'stable':
      return '#2563eb';
    case 'mixed':
      return '#d97706';
    default:
      return '#6b7280';
  }
};

/** Get color class for a score delta */
export const deltaClassForType = (
  type: string | undefined,
  change: number | null | undefined,
): string => {
  if (change === null || change === undefined || change === 0) {
    return 'text-gray-500';
  }

  const higherIsBetter = isHigherScoreBetter(type);
  const positiveChange = change > 0;
  const isImprovement = higherIsBetter ? positiveChange : !positiveChange;

  return isImprovement ? 'text-emerald-600' : 'text-rose-600';
};

/** Get badge variant for severity level */
export const severityBadgeVariant = (
  severity: string,
): 'success' | 'warning' | 'danger' | 'default' => {
  switch (severity?.toLowerCase()) {
    case 'minimal':
    case 'low':
    case 'excellent':
      return 'success';
    case 'mild':
    case 'moderate':
    case 'fair':
      return 'warning';
    case 'moderately severe':
    case 'severe':
    case 'needs attention':
      return 'danger';
    default:
      return 'default';
  }
};

/** Get icon color for assessment category */
export const assessmentCategoryColor = (category: string): string => {
  switch (category?.toLowerCase()) {
    case 'required':
      return '#ef4444';
    case 'recommended':
      return '#f59e0b';
    case 'optional':
      return '#6366f1';
    case 'advanced':
      return '#8b5cf6';
    default:
      return '#6366f1';
  }
};
