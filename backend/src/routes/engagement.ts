import { Router } from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { enhancedRecommendationService } from '../services/enhancedRecommendationService';
import type { EnhancedRecommendationContext } from '../services/enhancedRecommendationService';
import { crisisDetectionService } from '../services/crisisDetectionService';

const router = Router();
const prisma = new PrismaClient();
const engagementLogger = logger.child({ module: 'Engagement' });

// Validation schemas
const engagementSchema = Joi.object({
  completed: Joi.boolean().required(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  timeSpent: Joi.number().integer().min(0).optional(), // in seconds
  moodBefore: Joi.string().max(50).optional(),
  moodAfter: Joi.string().max(50).optional(),
  effectiveness: Joi.number().integer().min(1).max(10).optional()
});

const recommendationContextSchema = Joi.object({
  timeOfDay: Joi.string().valid('morning', 'afternoon', 'evening', 'night').optional(),
  availableTime: Joi.number().integer().min(1).optional(), // in minutes
  environment: Joi.string().valid('home', 'work', 'public', 'nature').optional(),
  immediateNeed: Joi.boolean().optional()
});

/**
 * POST /api/content/:id/engage
 * Track user engagement with content
 */
// @ts-ignore - Express router type inference issue with custom AuthRequest
router.post('/:id/engage', authenticate, async (req, res) => {
  const authReq = req as AuthRequest;
  const requestId = authReq.headers['x-request-id'] as string;
  const contentId = authReq.params.id;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  try {
    // Validate request body
    const { error, value } = engagementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    engagementLogger.info({ requestId, userId, contentId }, 'Recording content engagement');

    // Check if content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Upsert engagement record
    const engagement = await prisma.contentEngagement.upsert({
      where: {
        userId_contentId: {
          userId,
          contentId
        }
      },
      update: {
        completed: value.completed,
        rating: value.rating,
        timeSpent: value.timeSpent,
        moodBefore: value.moodBefore,
        moodAfter: value.moodAfter,
        effectiveness: value.effectiveness,
        updatedAt: new Date()
      },
      create: {
        userId,
        contentId,
        completed: value.completed,
        rating: value.rating,
        timeSpent: value.timeSpent,
        moodBefore: value.moodBefore,
        moodAfter: value.moodAfter,
        effectiveness: value.effectiveness
      }
    });

    // Update content statistics if completed
    if (value.completed) {
      const allEngagements = await prisma.contentEngagement.findMany({
        where: { contentId, completed: true }
      });

      const totalCompletions = allEngagements.length;
      const ratingsWithValues = allEngagements.filter(e => e.rating != null);
      const effectivenessWithValues = allEngagements.filter(e => e.effectiveness != null);

      const averageRating = ratingsWithValues.length > 0
        ? ratingsWithValues.reduce((sum, e) => sum + (e.rating || 0), 0) / ratingsWithValues.length
        : null;

      const averageEffectiveness = effectivenessWithValues.length > 0
        ? effectivenessWithValues.reduce((sum, e) => sum + (e.effectiveness || 0), 0) / effectivenessWithValues.length
        : null;

      await prisma.content.update({
        where: { id: contentId },
        data: {
          completions: totalCompletions,
          averageRating,
          effectiveness: averageEffectiveness
        }
      });
    }

    engagementLogger.info({ requestId, engagementId: engagement.id }, 'Engagement recorded successfully');

    res.json({
      success: true,
      data: engagement
    });

  } catch (error) {
    engagementLogger.error({ err: error, requestId, userId, contentId }, 'Failed to record engagement');
    res.status(500).json({
      success: false,
      error: 'Failed to record engagement'
    });
  }
});

/**
 * GET /api/recommendations/personalized
 * Get personalized, crisis-aware content recommendations
 */
// @ts-ignore - Express router type inference issue with custom AuthRequest
router.get('/personalized', authenticate, async (req, res) => {
  const authReq = req as AuthRequest;
  const requestId = authReq.headers['x-request-id'] as string;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  try {
    // Validate query parameters
    const { error, value } = recommendationContextSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    engagementLogger.info({ requestId, userId }, 'Generating personalized recommendations');

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get engagement history
    const engagementHistory = await prisma.contentEngagement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Fetch assessment results separately
    const assessmentResults = await prisma.assessmentResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 10
    });

    // Fetch mood entries separately
    const moodEntries = await prisma.moodEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    // Fetch chat messages for crisis detection
    const chatMessages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Detect crisis level with proper context
    const crisisDetection = await crisisDetectionService.detectCrisisLevel(userId, {
      assessments: assessmentResults,
      recentMessages: chatMessages,
      moodHistory: moodEntries,
      engagementHistory: engagementHistory.map(e => ({
        completed: e.completed,
        effectiveness: e.effectiveness,
        timeSpent: e.timeSpent
      }))
    });

    const normalizedScores = assessmentResults
      .map((result: any) => (typeof result.normalizedScore === 'number' ? result.normalizedScore : null))
      .filter((value: number | null): value is number => value !== null);

    const rawScores = assessmentResults
      .map((result: any) => (typeof result.score === 'number' ? result.score : null))
      .filter((value: number | null): value is number => value !== null);

    const wellnessScore = (() => {
      const baseValues = normalizedScores.length > 0 ? normalizedScores : rawScores;
      if (baseValues.length === 0) return 50;

      const average = baseValues.reduce((sum, value) => sum + value, 0) / baseValues.length;
      return Math.max(0, Math.min(100, Math.round(average)));
    })();

    // Build recommendation context
    const context: EnhancedRecommendationContext = {
      user: {
        id: userId,
        approach: (user.approach as any) || 'hybrid',
        wellnessScore,
        recentMood: moodEntries[0]?.mood,
        assessmentResults: assessmentResults.map((a: any) => ({
          type: a.assessmentType,
          score: a.score,
          normalizedScore: a.normalizedScore || undefined
        })),
        completedContent: engagementHistory.filter((e: any) => e.completed).map((e: any) => e.contentId),
        engagementHistory: engagementHistory.map((e: any) => ({
          contentId: e.contentId,
          completed: e.completed,
          rating: e.rating,
          effectiveness: e.effectiveness,
          timeSpent: e.timeSpent
        }))
      },
      currentState: {
        timeOfDay: value.timeOfDay,
        availableTime: value.availableTime,
        environment: value.environment,
        crisisLevel: crisisDetection.level,
        immediateNeed: value.immediateNeed || crisisDetection.level === 'HIGH' || crisisDetection.level === 'CRITICAL'
      }
    };

    // Get recommendations
    const recommendations = await enhancedRecommendationService.getPersonalizedRecommendations(
      context,
      6
    );

    engagementLogger.info(
      { requestId, userId, crisisLevel: crisisDetection.level, itemCount: recommendations.items.length },
      'Recommendations generated'
    );

    res.json({
      success: true,
      data: recommendations,
      meta: {
        crisisDetection: {
          level: crisisDetection.level,
          confidence: crisisDetection.confidence,
          immediateAction: crisisDetection.level === 'CRITICAL' || crisisDetection.level === 'HIGH'
        }
      }
    });

  } catch (error) {
    engagementLogger.error({ err: error, requestId, userId }, 'Failed to generate recommendations');
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

/**
 * GET /api/crisis/check
 * Perform on-demand crisis assessment
 */
// @ts-ignore - Express router type inference issue with custom AuthRequest
router.get('/check', authenticate, async (req, res) => {
  const authReq = req as AuthRequest;
  const requestId = authReq.headers['x-request-id'] as string;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  try {
    engagementLogger.info({ requestId, userId }, 'Performing crisis check');

    // Fetch crisis detection context
    const assessments = await prisma.assessmentResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 10
    });

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const moods = await prisma.moodEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    // Detect crisis level with context
    const detection = await crisisDetectionService.detectCrisisLevel(userId, {
      assessments,
      recentMessages: messages,
      moodHistory: moods
    });

    engagementLogger.info(
      { requestId, userId, level: detection.level, confidence: detection.confidence },
      'Crisis check completed'
    );

    res.json({
      success: true,
      data: {
        level: detection.level,
        confidence: detection.confidence,
        immediateAction: detection.level === 'CRITICAL' || detection.level === 'HIGH',
        recommendations: detection.recommendations,
        indicators: detection.indicators
      }
    });

  } catch (error) {
    engagementLogger.error({ err: error, requestId, userId }, 'Failed to perform crisis check');
    res.status(500).json({
      success: false,
      error: 'Failed to perform crisis check'
    });
  }
});

/**
 * GET /api/content/:id/engagement
 * Get engagement statistics for a specific content item
 */
// @ts-ignore - Express router type inference issue with custom AuthRequest
router.get('/:id/engagement', authenticate, async (req, res) => {
  const authReq = req as AuthRequest;
  const requestId = authReq.headers['x-request-id'] as string;
  const contentId = authReq.params.id;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  try {
    // Get user's engagement
    const userEngagement = await prisma.contentEngagement.findUnique({
      where: {
        userId_contentId: {
          userId,
          contentId
        }
      }
    });

    // Get overall statistics
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: {
        completions: true,
        averageRating: true,
        effectiveness: true
      }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: {
        userEngagement,
        statistics: {
          totalCompletions: content.completions,
          averageRating: content.averageRating,
          averageEffectiveness: content.effectiveness
        }
      }
    });

  } catch (error) {
    engagementLogger.error({ err: error, requestId, contentId }, 'Failed to fetch engagement data');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engagement data'
    });
  }
});

/**
 * GET /api/content/engagements/me
 * Get all content engagements for the authenticated user
 */
// @ts-ignore
router.get('/engagements/me', authenticate, async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const engagements = await prisma.contentEngagement.findMany({
      where: { userId },
      include: { content: { select: { id: true, title: true, type: true, thumbnailUrl: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: engagements });
  } catch (error) {
    engagementLogger.error({ err: error, userId }, 'Failed to fetch user engagements');
    res.status(500).json({ success: false, error: 'Failed to fetch engagements' });
  }
});

/**
 * POST /api/content/:id/bookmark
 * Toggle bookmark on a content item
 * Bookmarks are stored in progressTracking with dedicated bookmark metrics
 */
// @ts-ignore
router.post('/:id/bookmark', authenticate, async (req, res) => {
  const authReq = req as AuthRequest;
  const contentId = authReq.params.id;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // Check if content or practice exists
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    const practice = !content ? await prisma.practice.findUnique({ where: { id: contentId } }) : null;

    if (!content && !practice) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    if (content) {
      // Content bookmarks use dedicated progress records to avoid overwriting engagement history.
      const existingBookmark = await prisma.progressTracking.findFirst({
        where: {
          userId,
          metric: 'content_bookmark',
          notes: { contains: `"contentId":"${contentId}"` },
        },
      });

      const legacyBookmark = await prisma.contentEngagement.findUnique({
        where: { userId_contentId: { userId, contentId } },
      });

      const isLegacyBookmark =
        Boolean(legacyBookmark) &&
        !legacyBookmark?.completed &&
        legacyBookmark?.rating == null &&
        legacyBookmark?.timeSpent == null &&
        legacyBookmark?.moodBefore == null &&
        legacyBookmark?.moodAfter == null &&
        legacyBookmark?.effectiveness == null;

      if (existingBookmark || isLegacyBookmark) {
        if (existingBookmark) {
          await prisma.progressTracking.delete({ where: { id: existingBookmark.id } });
        }

        if (isLegacyBookmark) {
          await prisma.contentEngagement.delete({
            where: { userId_contentId: { userId, contentId } },
          });
        }

        res.json({ success: true, data: { bookmarked: false } });
      } else {
        await prisma.progressTracking.create({
          data: {
            userId,
            metric: 'content_bookmark',
            value: 1,
            notes: JSON.stringify({ contentId }),
          },
        });

        res.json({ success: true, data: { bookmarked: true } });
      }
    } else {
      // Practice bookmarks use dedicated progress records.
      const existing = await prisma.progressTracking.findFirst({
        where: {
          userId,
          metric: 'practice_bookmark',
          notes: { contains: `"practiceId":"${contentId}"` },
        },
      });

      if (existing) {
        await prisma.progressTracking.delete({ where: { id: existing.id } });
        res.json({ success: true, data: { bookmarked: false } });
      } else {
        await prisma.progressTracking.create({
          data: { userId, metric: 'practice_bookmark', value: 1, notes: JSON.stringify({ practiceId: contentId }) },
        });
        res.json({ success: true, data: { bookmarked: true } });
      }
    }
  } catch (error) {
    engagementLogger.error({ err: error, contentId, userId }, 'Failed to toggle bookmark');
    res.status(500).json({ success: false, error: 'Failed to toggle bookmark' });
  }
});

/**
 * GET /api/content/bookmarks
 * Get all bookmarked content for the authenticated user
 */
// @ts-ignore
router.get('/bookmarks', authenticate, async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const [contentBookmarkRecords, practiceBookmarkRecords, legacyBookmarks] = await Promise.all([
      prisma.progressTracking.findMany({
        where: { userId, metric: 'content_bookmark' },
        orderBy: { date: 'desc' },
      }),
      prisma.progressTracking.findMany({
        where: { userId, metric: 'practice_bookmark' },
        orderBy: { date: 'desc' },
      }),
      // Backward compatibility for older bookmark records previously saved in contentEngagement.
      prisma.contentEngagement.findMany({
        where: {
          userId,
          completed: false,
          rating: null,
          timeSpent: null,
          moodBefore: null,
          moodAfter: null,
          effectiveness: null,
        },
        select: { contentId: true },
      }),
    ]);

    const contentIds = new Set<string>();
    for (const entry of contentBookmarkRecords) {
      try {
        const parsed = JSON.parse(entry.notes || '{}') as { contentId?: string };
        if (parsed.contentId) {
          contentIds.add(parsed.contentId);
        }
      } catch {
        // Ignore malformed records.
      }
    }

    for (const legacy of legacyBookmarks) {
      if (legacy.contentId) {
        contentIds.add(legacy.contentId);
      }
    }

    const content = contentIds.size > 0
      ? await prisma.content.findMany({
          where: { id: { in: Array.from(contentIds) } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const practiceIds = new Set<string>();
    for (const entry of practiceBookmarkRecords) {
      try {
        const parsed = JSON.parse(entry.notes || '{}') as { practiceId?: string };
        if (parsed.practiceId) {
          practiceIds.add(parsed.practiceId);
        }
      } catch {
        // Ignore malformed records.
      }
    }

    const practices = practiceIds.size > 0
      ? await prisma.practice.findMany({
          where: { id: { in: Array.from(practiceIds) } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    res.json({
      success: true,
      data: {
        content,
        practices,
      },
    });
  } catch (error) {
    engagementLogger.error({ err: error, userId }, 'Failed to fetch bookmarks');
    res.status(500).json({ success: false, error: 'Failed to fetch bookmarks' });
  }
});

export default router;


 
