import request from 'supertest';
import type { Express } from 'express';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  userFindUniqueMock,
  contentEngagementFindManyMock,
  assessmentResultFindManyMock,
  moodEntryFindManyMock,
  chatMessageFindManyMock,
  getPersonalizedRecommendationsMock,
} = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(async () => ({
    id: 'user-1',
    approach: 'hybrid',
    chatMessages: []
  })),
  contentEngagementFindManyMock: vi.fn<[], Promise<any[]>>(async () => []),
  assessmentResultFindManyMock: vi.fn<[], Promise<any[]>>(async () => []),
  moodEntryFindManyMock: vi.fn<[], Promise<any[]>>(async () => []),
  chatMessageFindManyMock: vi.fn<[], Promise<any[]>>(async () => []),
  getPersonalizedRecommendationsMock: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      findUnique: userFindUniqueMock,
    },
    contentEngagement: {
      findMany: contentEngagementFindManyMock,
      upsert: vi.fn(),
    },
    assessmentResult: {
      findMany: assessmentResultFindManyMock,
    },
    moodEntry: {
      findMany: moodEntryFindManyMock,
    },
    chatMessage: {
      findMany: chatMessageFindManyMock,
    },
    content: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(async () => []),
    },
    practice: {
      findMany: vi.fn(async () => []),
    },
    $queryRaw: vi.fn(async () => [{ ok: 1 }]),
  })),
}));

vi.mock('../src/config/database', () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  return { prisma, default: prisma };
});

vi.mock('../src/middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'user@example.com' };
    next();
  },
}));

vi.mock('../src/services/crisisDetectionService', () => ({
  crisisDetectionService: {
    detectCrisisLevel: vi.fn(async () => ({
      level: 'NONE',
      confidence: 0,
      indicators: [],
      recommendations: [],
    })),
  },
}));

const recommendationResult = {
  items: [
    {
      id: 'rec-1',
      title: 'Grounding Breath',
      description: 'Simple breathing exercise',
      type: 'content',
      approach: 'hybrid',
      reason: 'Quick emotional regulation support',
      source: 'library',
      priority: 8,
      immediateRelief: true,
    },
  ],
  focusAreas: ['stress-relief'],
  rationale: 'Personalized for stress relief',
  crisisLevel: 'NONE',
  immediateAction: false,
  fallbackUsed: false,
};

getPersonalizedRecommendationsMock.mockImplementation(async (_context: any) => recommendationResult);

vi.mock('../src/services/enhancedRecommendationService', () => ({
  enhancedRecommendationService: {
    getPersonalizedRecommendations: getPersonalizedRecommendationsMock,
  },
}));

vi.mock('../src/services/llmProvider', () => ({
  LLMService: vi.fn(() => ({
    generateResponse: vi.fn(async () => ({ content: 'mock response' })),
    getProviderStatus: vi.fn(async () => ({})),
  })),
  llmService: {
    generateResponse: vi.fn(async () => ({ content: 'mock response' })),
    getProviderStatus: vi.fn(async () => ({})),
  },
}));

let app: Express;

beforeAll(async () => {
  const module = await import('../src/server');
  app = module.default;
}, 60000);

describe('Recommendations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindUniqueMock.mockResolvedValue({
      id: 'user-1',
      approach: 'hybrid',
      chatMessages: []
    });
    contentEngagementFindManyMock.mockResolvedValue([] as any[]);
    assessmentResultFindManyMock.mockResolvedValue([] as any[]);
    moodEntryFindManyMock.mockResolvedValue([] as any[]);
    chatMessageFindManyMock.mockResolvedValue([] as any[]);
    getPersonalizedRecommendationsMock.mockResolvedValue(recommendationResult);
  });

  it('returns personalized recommendations payload', async () => {
    const res = await request(app).get('/api/recommendations/personalized');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data?.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.focusAreas).toContain('stress-relief');
    expect(res.body.meta?.crisisDetection?.level).toBe('NONE');
  });

  it('builds recommendation context from user-specific assessment, mood, and engagement data', async () => {
    contentEngagementFindManyMock.mockResolvedValueOnce([
      {
        contentId: 'liked-content-1',
        completed: true,
        rating: 5,
        effectiveness: 9,
        timeSpent: 600,
      },
    ] as any);

    assessmentResultFindManyMock.mockResolvedValueOnce([
      {
        assessmentType: 'anxiety',
        score: 80,
        normalizedScore: 82,
      },
    ] as any);

    moodEntryFindManyMock.mockResolvedValueOnce([
      { mood: 'Anxious' },
    ] as any);

    const res = await request(app).get('/api/recommendations/personalized');

    expect(res.status).toBe(200);
    expect(getPersonalizedRecommendationsMock).toHaveBeenCalledTimes(1);

    const [contextArg, maxItemsArg] = getPersonalizedRecommendationsMock.mock.calls[0];

    expect(maxItemsArg).toBe(6);
    expect(contextArg.user.id).toBe('user-1');
    expect(contextArg.user.wellnessScore).toBe(82);
    expect(contextArg.user.recentMood).toBe('Anxious');
    expect(contextArg.user.assessmentResults).toEqual([
      {
        type: 'anxiety',
        score: 80,
        normalizedScore: 82,
      },
    ]);
    expect(contextArg.user.completedContent).toEqual(['liked-content-1']);
    expect(contextArg.user.engagementHistory).toEqual([
      {
        contentId: 'liked-content-1',
        completed: true,
        rating: 5,
        effectiveness: 9,
        timeSpent: 600,
      },
    ]);
  });
});
