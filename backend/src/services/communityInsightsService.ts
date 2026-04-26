import { prisma } from '../config/database';

export interface CommunityInsightMetric {
  id: 'breathing-adoption' | 'stress-improvement' | 'journal-consistency';
  label: string;
  value: number;
  unit: 'percent' | 'points';
  description: string;
  sampleSize: number;
}

export interface CommunityInsightsPayload {
  generatedAt: string;
  expiresAt: string;
  metrics: CommunityInsightMetric[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const COMMUNITY_INSIGHTS_CACHE_TTL_MS = Number.parseInt(
  process.env.COMMUNITY_INSIGHTS_CACHE_TTL_MS || String(60 * 60 * 1000),
  10
);

let cacheEntry: { expiresAt: number; payload: CommunityInsightsPayload } | null = null;

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
};

const computeBreathingAdoption = async (eligibleUserCount: number): Promise<CommunityInsightMetric> => {
  const since = new Date(Date.now() - 30 * DAY_MS);

  const breathingUsers = await prisma.contentEngagement.findMany({
    where: {
      completed: true,
      createdAt: { gte: since },
      content: {
        OR: [
          { contentType: 'BREATHING_EXERCISE' },
          { type: { contains: 'breathing' } },
          { tags: { contains: 'breath' } },
        ],
      },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  const percentage = eligibleUserCount > 0
    ? clampPercent((breathingUsers.length / eligibleUserCount) * 100)
    : 0;

  return {
    id: 'breathing-adoption',
    label: 'Users practicing breathing',
    value: percentage,
    unit: 'percent',
    description: 'Users who completed at least one breathing-focused practice in the last 30 days.',
    sampleSize: eligibleUserCount,
  };
};

const computeStressImprovement = async (): Promise<CommunityInsightMetric> => {
  const since = new Date(Date.now() - 120 * DAY_MS);
  const stressTypes = ['stress', 'stress_pss4', 'stress_pss10'];

  const stressResults = await prisma.assessmentResult.findMany({
    where: {
      assessmentType: { in: stressTypes },
      completedAt: { gte: since },
    },
    orderBy: [
      { userId: 'asc' },
      { completedAt: 'asc' },
    ],
    select: {
      userId: true,
      score: true,
    },
  });

  const byUser = new Map<string, { first: number; latest: number; count: number }>();

  for (const result of stressResults) {
    const existing = byUser.get(result.userId);
    if (!existing) {
      byUser.set(result.userId, {
        first: result.score,
        latest: result.score,
        count: 1,
      });
      continue;
    }

    existing.latest = result.score;
    existing.count += 1;
  }

  const deltas: number[] = [];
  byUser.forEach((entry) => {
    if (entry.count < 2) {
      return;
    }

    // Lower stress scores indicate improvement.
    deltas.push(entry.first - entry.latest);
  });

  const averageImprovement = deltas.length > 0
    ? Number((deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length).toFixed(1))
    : 0;

  return {
    id: 'stress-improvement',
    label: 'Average stress score change',
    value: averageImprovement,
    unit: 'points',
    description: 'Average improvement in stress assessment scores for users with repeated check-ins.',
    sampleSize: deltas.length,
  };
};

const computeJournalConsistency = async (eligibleUserCount: number): Promise<CommunityInsightMetric> => {
  const since = new Date(Date.now() - 7 * DAY_MS);

  const entries = await prisma.journalEntry.findMany({
    where: {
      createdAt: { gte: since },
    },
    select: {
      userId: true,
    },
  });

  const entriesPerUser = new Map<string, number>();
  for (const entry of entries) {
    entriesPerUser.set(entry.userId, (entriesPerUser.get(entry.userId) || 0) + 1);
  }

  const consistentUsers = Array.from(entriesPerUser.values()).filter((count) => count >= 3).length;
  const percentage = eligibleUserCount > 0
    ? clampPercent((consistentUsers / eligibleUserCount) * 100)
    : 0;

  return {
    id: 'journal-consistency',
    label: 'Users journaling 3x weekly',
    value: percentage,
    unit: 'percent',
    description: 'Users who wrote at least three journal entries in the last seven days.',
    sampleSize: eligibleUserCount,
  };
};

export const getCommunityInsights = async (forceRefresh = false): Promise<CommunityInsightsPayload> => {
  const now = Date.now();
  if (!forceRefresh && cacheEntry && cacheEntry.expiresAt > now) {
    return cacheEntry.payload;
  }

  const eligibleUserCount = await prisma.user.count({
    where: {
      anonymousAnalytics: true,
    },
  });

  const [breathing, stress, journaling] = await Promise.all([
    computeBreathingAdoption(eligibleUserCount),
    computeStressImprovement(),
    computeJournalConsistency(eligibleUserCount),
  ]);

  const generatedAt = new Date(now);
  const expiresAtMs = now + Math.max(5 * 60 * 1000, COMMUNITY_INSIGHTS_CACHE_TTL_MS);
  const expiresAt = new Date(expiresAtMs);

  const payload: CommunityInsightsPayload = {
    generatedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    metrics: [breathing, stress, journaling],
  };

  cacheEntry = {
    expiresAt: expiresAtMs,
    payload,
  };

  return payload;
};
