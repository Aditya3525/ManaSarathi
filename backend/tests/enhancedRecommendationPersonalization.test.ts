import { beforeEach, describe, expect, it, vi } from 'vitest';

const { contentFindManyMock, practiceFindManyMock } = vi.hoisted(() => ({
  contentFindManyMock: vi.fn(),
  practiceFindManyMock: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    content: {
      findMany: contentFindManyMock,
    },
    practice: {
      findMany: practiceFindManyMock,
    },
  })),
}));

import { enhancedRecommendationService } from '../src/services/enhancedRecommendationService';
import type { EnhancedRecommendationContext } from '../src/services/enhancedRecommendationService';

const createContext = (overrides?: Partial<EnhancedRecommendationContext>): EnhancedRecommendationContext => ({
  user: {
    id: 'user-1',
    approach: 'hybrid',
    wellnessScore: 70,
    recentMood: 'Okay',
    assessmentResults: [],
    completedContent: [],
    engagementHistory: [],
    ...overrides?.user,
  },
  currentState: {
    ...overrides?.currentState,
  },
});

describe('EnhancedRecommendationService personalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contentFindManyMock.mockResolvedValue([]);
    practiceFindManyMock.mockResolvedValue([]);
  });

  it('produces different focus areas and rationale per user data', async () => {
    const anxietyUser = createContext({
      user: {
        id: 'user-anxiety',
        approach: 'hybrid',
        wellnessScore: 78,
        recentMood: 'Anxious',
        assessmentResults: [{ type: 'anxiety', score: 82 }],
        completedContent: [],
        engagementHistory: [],
      },
    });

    const depressionUser = createContext({
      user: {
        id: 'user-depression',
        approach: 'hybrid',
        wellnessScore: 76,
        recentMood: 'Sad',
        assessmentResults: [{ type: 'depression', score: 84 }],
        completedContent: [],
        engagementHistory: [],
      },
    });

    const anxietyResult = await enhancedRecommendationService.getPersonalizedRecommendations(anxietyUser, 4);
    const depressionResult = await enhancedRecommendationService.getPersonalizedRecommendations(depressionUser, 4);

    expect(anxietyResult.focusAreas).toContain('anxiety');
    expect(depressionResult.focusAreas).toContain('depression');
    expect(anxietyResult.rationale).not.toEqual(depressionResult.rationale);
  });

  it('uses high-rated engagement history as anchors for similar content', async () => {
    contentFindManyMock.mockImplementation(async (args: any) => {
      if (Array.isArray(args?.where?.id?.in)) {
        return [
          {
            id: 'liked-content-1',
            category: 'Anxiety',
            tags: 'calm, breath',
            focusAreas: '["anxiety"]',
            type: 'ARTICLE',
          },
        ];
      }

      if (Array.isArray(args?.where?.id?.notIn)) {
        return [
          {
            id: 'candidate-1',
            title: 'Anxiety Reset Drill',
            description: 'A quick reset for anxious moments.',
            type: 'ARTICLE',
            category: 'Anxiety',
            approach: 'hybrid',
            duration: 300,
            difficulty: 'Beginner',
            content: 'https://example.com/anxiety-reset',
            tags: 'calm, breath',
            focusAreas: '["anxiety"]',
            effectiveness: 9,
          },
        ];
      }

      return [];
    });

    const context = createContext({
      user: {
        id: 'user-engagement',
        approach: 'hybrid',
        wellnessScore: 72,
        recentMood: 'Anxious',
        assessmentResults: [{ type: 'anxiety', score: 81 }],
        completedContent: ['liked-content-1'],
        engagementHistory: [
          {
            contentId: 'liked-content-1',
            completed: true,
            rating: 5,
            effectiveness: 9,
            timeSpent: 420,
          },
        ],
      },
    });

    const result = await enhancedRecommendationService.getPersonalizedRecommendations(context, 4);

    const usedAnchorQuery = contentFindManyMock.mock.calls.some(([args]: any[]) =>
      Array.isArray(args?.where?.id?.in) && args.where.id.in.includes('liked-content-1')
    );

    expect(usedAnchorQuery).toBe(true);
    expect(result.items.some((item) => item.id === 'candidate-1')).toBe(true);
    expect(result.items.some((item) => item.reason.toLowerCase().includes('positive engagement'))).toBe(true);
  });
});
