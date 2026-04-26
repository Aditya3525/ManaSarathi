import { prisma } from '../config/database';

type ProgressDirection = 'improving' | 'declining' | 'stable';

export interface ProgressSignal {
  area: string;
  direction: ProgressDirection;
  detail: string;
}

const HIGHER_IS_BETTER_TYPES = new Set([
  'emotionalintelligence',
  'emotionalintelligenceteique',
  'emotionalintelligenceei10',
  'emotionalintelligenceeq5',
  'personality',
  'personalityminiipip',
  'personalitybigfive10',
  'archetypes',
  'psychologicalarchetypes'
]);

const normalizeType = (type: string): string => type.toLowerCase().replace(/[^a-z0-9]/g, '');

const prettifyType = (type: string): string =>
  type
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

const directionFromDelta = (type: string, delta: number): ProgressDirection => {
  if (Math.abs(delta) < 8) {
    return 'stable';
  }

  const higherIsBetter = HIGHER_IS_BETTER_TYPES.has(normalizeType(type));
  if (higherIsBetter) {
    return delta > 0 ? 'improving' : 'declining';
  }
  return delta < 0 ? 'improving' : 'declining';
};

export class ProgressDetectionService {
  async detectProgress(userId: string): Promise<ProgressSignal[]> {
    const signals: ProgressSignal[] = [];

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [assessments, thisWeekMoods, lastWeekMoods, completedEngagements] = await Promise.all([
      prisma.assessmentResult.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 40
      }),
      prisma.moodEntry.findMany({
        where: { userId, createdAt: { gte: oneWeekAgo } }
      }),
      prisma.moodEntry.findMany({
        where: { userId, createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } }
      }),
      prisma.contentEngagement.count({
        where: { userId, completed: true, createdAt: { gte: oneWeekAgo } }
      })
    ]);

    const byType = new Map<string, { latest: number; previous: number | null }>();
    for (const assessment of assessments) {
      if (!byType.has(assessment.assessmentType)) {
        byType.set(assessment.assessmentType, {
          latest: assessment.normalizedScore ?? assessment.score,
          previous: null
        });
        continue;
      }

      const current = byType.get(assessment.assessmentType);
      if (current && current.previous === null) {
        current.previous = assessment.normalizedScore ?? assessment.score;
      }
    }

    byType.forEach((scores, type) => {
      if (scores.previous === null) {
        return;
      }

      const delta = scores.latest - scores.previous;
      const direction = directionFromDelta(type, delta);
      if (direction === 'stable') {
        return;
      }

      const area = prettifyType(type);
      const deltaPoints = Math.abs(Math.round(delta));

      signals.push({
        area,
        direction,
        detail:
          direction === 'improving'
            ? `${area} has improved by ${deltaPoints} points since the previous check.`
            : `${area} has worsened by ${deltaPoints} points since the previous check.`
      });
    });

    if (thisWeekMoods.length >= 3 && lastWeekMoods.length >= 3) {
      const positiveMoods = new Set(['great', 'good', 'calm', 'okay']);

      const thisWeekPositiveRatio =
        thisWeekMoods.filter((entry) => positiveMoods.has(entry.mood.toLowerCase())).length /
        thisWeekMoods.length;
      const lastWeekPositiveRatio =
        lastWeekMoods.filter((entry) => positiveMoods.has(entry.mood.toLowerCase())).length /
        lastWeekMoods.length;

      const ratioDelta = thisWeekPositiveRatio - lastWeekPositiveRatio;
      if (ratioDelta >= 0.2) {
        signals.push({
          area: 'Mood',
          direction: 'improving',
          detail: 'Mood check-ins are trending more positive this week versus last week.'
        });
      } else if (ratioDelta <= -0.2) {
        signals.push({
          area: 'Mood',
          direction: 'declining',
          detail: 'Mood check-ins are trending lower this week versus last week.'
        });
      }
    }

    if (completedEngagements >= 5) {
      signals.push({
        area: 'Engagement',
        direction: 'improving',
        detail: `Completed ${completedEngagements} wellbeing activities this week.`
      });
    }

    return signals.slice(0, 6);
  }
}

export const progressDetectionService = new ProgressDetectionService();
