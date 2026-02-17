import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { buildAssessmentInsights } from '../services/assessmentInsightsService';
import { recommendationService } from '../services/recommendationService';
import { EnhancedInsightsService } from '../services/enhancedInsightsService';

const router = express.Router();
const prisma = new PrismaClient();
const enhancedInsightsService = new EnhancedInsightsService();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /api/dashboard/summary
 * Get comprehensive dashboard data for the authenticated user
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        approach: true,
        birthday: true,
        region: true,
        emergencyContact: true,
        emergencyPhone: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch assessment insights
    const assessments = await prisma.assessmentResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 20
    });

    const assessmentInsights = assessments.length > 0
      ? await buildAssessmentInsights(assessments, { userName: user.firstName || user.name })
      : null;

    // Fetch recent mood entries
    const recentMoods = await prisma.moodEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 7
    });

    // Calculate weekly stats
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [weeklyPractices, weeklyMoodEntries, weeklyAssessments] = await Promise.all([
      prisma.userPlanModule.count({
        where: {
          userId,
          completed: true,
          completedAt: { gte: weekAgo }
        }
      }),
      prisma.moodEntry.count({
        where: {
          userId,
          createdAt: { gte: weekAgo }
        }
      }),
      prisma.assessmentResult.count({
        where: {
          userId,
          completedAt: { gte: weekAgo }
        }
      })
    ]);

    // Calculate streak
    const allMoodEntries = await prisma.moodEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < allMoodEntries.length; i++) {
      const entryDate = new Date(allMoodEntries[i].createdAt);
      entryDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (entryDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Get recommended practice
    let recommendedPractice = null;
    if (assessmentInsights && user.approach) {
      try {
        const userContext: any = {
          id: user.id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          approach: user.approach as 'western' | 'eastern' | 'hybrid',
          assessmentInsights: {
            byType: assessmentInsights.insights.byType,
            recommendations: []
          },
          wellnessScore: assessmentInsights.insights.wellnessScore?.value
        };

        const recommendations = await recommendationService.getContentRecommendations({
          userId,
          userContext,
          approach: user.approach as 'western' | 'eastern' | 'hybrid',
          wellnessScore: assessmentInsights.insights.wellnessScore?.value,
          maxItems: 1
        });

        if (recommendations.items.length > 0) {
          recommendedPractice = recommendations.items[0];
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      }
    }

    // Compile response
    const dashboardData = {
      user: {
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        approach: user.approach,
        profileCompletion: calculateProfileCompletion(user),
        memberSince: user.createdAt.toISOString()
      },
      assessmentScores: assessmentInsights ? {
        anxiety: assessmentInsights.insights.byType['anxiety']?.latestScore ||
          assessmentInsights.insights.byType['anxiety_assessment']?.latestScore || null,
        stress: assessmentInsights.insights.byType['stress']?.latestScore || null,
        emotionalIntelligence: assessmentInsights.insights.byType['emotionalIntelligence']?.latestScore || null,
        wellnessScore: assessmentInsights.insights.wellnessScore?.value || null,
        byType: assessmentInsights.insights.byType,
        overallTrend: assessmentInsights.insights.overallTrend,
        aiSummary: assessmentInsights.insights.aiSummary,
        updatedAt: assessmentInsights.insights.updatedAt
      } : null,
      recentInsights: assessmentInsights ?
        generateInsightsFromAssessments(assessmentInsights.insights.byType, assessmentInsights.insights.aiSummary) : [],
      weeklyProgress: {
        practices: {
          completed: weeklyPractices,
          goal: 7,
          percentage: Math.round((weeklyPractices / 7) * 100)
        },
        moodCheckins: {
          completed: weeklyMoodEntries,
          goal: 7,
          percentage: Math.round((weeklyMoodEntries / 7) * 100)
        },
        assessments: {
          completed: weeklyAssessments,
          goal: 4,
          percentage: Math.round((weeklyAssessments / 4) * 100)
        },
        currentStreak: currentStreak
      },
      recentMoods: recentMoods.map(mood => ({
        mood: mood.mood,
        notes: mood.notes,
        createdAt: mood.createdAt.toISOString()
      })),
      recommendedPractice: recommendedPractice ? {
        title: recommendedPractice.title,
        description: recommendedPractice.description,
        type: recommendedPractice.type,
        duration: recommendedPractice.duration,
        tags: recommendedPractice.tags,
        reason: recommendedPractice.reason,
        approach: recommendedPractice.approach
      } : null
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

/**
 * GET /api/dashboard/insights
 * Get AI-generated insights based on user's assessment history
 */
/**
 * GET /api/dashboard/insights
 * Get combined insights from assessments and chatbot conversations
 * Uses smart caching with daily expiration
 */
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get combined insights (assessments + chatbot)
    let combinedInsights = await enhancedInsightsService.getDashboardInsights(userId);

    // If generation failed, try to fetch the last cached insight directly
    if (!combinedInsights) {
      const cached = await prisma.dashboardInsights.findUnique({ where: { userId } });
      if (cached && cached.insightsData) {
        try {
          combinedInsights = JSON.parse(cached.insightsData);
        } catch { }
      }
    }

    // If we have any insight (generated or cached), verify it has real data before returning
    if (combinedInsights) {
      const hasAssessmentData = combinedInsights.assessments.scores.length > 0;
      const hasChatData = combinedInsights.chatbot.summaries.length > 0;

      // Only return cached insights if they contain actual user data
      if (hasAssessmentData || hasChatData) {
        return res.json({
          insights: [],
          aiSummary: combinedInsights.aiSummary,
          overallTrend: 'baseline',
          wellnessScore: null,
          assessments: {
            count: combinedInsights.assessments.scores.length,
            averageScore: combinedInsights.assessments.scores.length > 0
              ? combinedInsights.assessments.scores.reduce((sum, s) => sum + s.score, 0) / combinedInsights.assessments.scores.length
              : 0,
            trend: 'stable',
            recentScores: combinedInsights.assessments.scores.slice(0, 5).map(s => s.score)
          },
          chatbot: {
            conversationCount: combinedInsights.chatbot.summaries.length,
            averageEmotionalState: combinedInsights.chatbot.emotionalStates.length > 0
              ? combinedInsights.chatbot.emotionalStates[0]
              : 'neutral',
            commonTopics: combinedInsights.chatbot.keyTopics,
            lastConversationDate: combinedInsights.chatbot.lastDate?.toISOString()
          },
          generatedAt: combinedInsights.generatedAt?.toISOString?.() || new Date().toISOString(),
          source: 'combined',
          cached: true
        });
      }
      // If cached data has no real content, fall through to assessment-only check
    }

    // If no insight ever existed, fallback to assessment-only logic
    const assessments = await prisma.assessmentResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 20
    });

    if (assessments.length === 0) {
      return res.json({
        insights: [],
        aiSummary: 'Complete your first assessment or chat with our AI to receive personalized insights.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, name: true }
    });

    const assessmentInsights = await buildAssessmentInsights(
      assessments,
      { userName: user?.firstName || user?.name }
    );

    const insights = generateInsightsFromAssessments(
      assessmentInsights.insights.byType,
      assessmentInsights.insights.aiSummary
    );

    return res.json({
      insights,
      aiSummary: assessmentInsights.insights.aiSummary,
      overallTrend: assessmentInsights.insights.overallTrend,
      wellnessScore: assessmentInsights.insights.wellnessScore,
      source: 'assessments-only',
      cached: false
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to load insights' });
  }
});

/**
 * POST /api/dashboard/insights/refresh
 * Force refresh of combined insights (bypasses cache)
 * Useful for manual refresh button in UI
 */
router.post('/insights/refresh', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Force regeneration by passing forceRefresh=true
    const combinedInsights = await enhancedInsightsService.getDashboardInsights(userId, true);

    if (!combinedInsights) {
      return res.status(500).json({
        error: 'Failed to generate insights',
        message: 'Unable to refresh insights at this time. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Insights refreshed successfully',
      data: {
        assessments: combinedInsights.assessments,
        chatbot: combinedInsights.chatbot,
        aiSummary: combinedInsights.aiSummary,
        generatedAt: combinedInsights.generatedAt,
        source: 'combined',
        cached: false
      }
    });
  } catch (error) {
    console.error('Error refreshing insights:', error);
    res.status(500).json({
      error: 'Failed to refresh insights',
      message: 'An unexpected error occurred while refreshing insights.'
    });
  }
});

/**
 * GET /api/dashboard/weekly-progress
 * Get detailed weekly progress statistics
 */
router.get('/weekly-progress', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [weeklyPractices, weeklyMoodEntries, weeklyAssessments, allMoodEntries] = await Promise.all([
      prisma.userPlanModule.findMany({
        where: {
          userId,
          completed: true,
          completedAt: { gte: weekAgo }
        },
        select: {
          completedAt: true,
          module: {
            select: {
              title: true,
              type: true
            }
          }
        }
      }),
      prisma.moodEntry.findMany({
        where: {
          userId,
          createdAt: { gte: weekAgo }
        },
        select: {
          mood: true,
          createdAt: true
        }
      }),
      prisma.assessmentResult.findMany({
        where: {
          userId,
          completedAt: { gte: weekAgo }
        },
        select: {
          assessmentType: true,
          score: true,
          completedAt: true
        }
      }),
      prisma.moodEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < allMoodEntries.length; i++) {
      const entryDate = new Date(allMoodEntries[i].createdAt);
      entryDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (entryDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    res.json({
      practices: {
        completed: weeklyPractices.length,
        goal: 7,
        percentage: Math.round((weeklyPractices.length / 7) * 100),
        details: weeklyPractices.map(p => ({
          title: p.module.title,
          type: p.module.type,
          completedAt: p.completedAt?.toISOString()
        }))
      },
      moodCheckins: {
        completed: weeklyMoodEntries.length,
        goal: 7,
        percentage: Math.round((weeklyMoodEntries.length / 7) * 100),
        moodDistribution: calculateMoodDistribution(weeklyMoodEntries)
      },
      assessments: {
        completed: weeklyAssessments.length,
        goal: 4,
        percentage: Math.round((weeklyAssessments.length / 4) * 100),
        types: Array.from(new Set(weeklyAssessments.map(a => a.assessmentType)))
      },
      streak: {
        current: currentStreak,
        message: getStreakMessage(currentStreak)
      }
    });
  } catch (error) {
    console.error('Error fetching weekly progress:', error);
    res.status(500).json({ error: 'Failed to load weekly progress' });
  }
});

/**
 * GET /api/dashboard/recommended-practice
 * Get AI-recommended practice based on assessment insights
 */
router.get('/recommended-practice', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        approach: true
      }
    });

    if (!user || !user.approach) {
      return res.json({ recommendedPractice: null });
    }

    // Get assessment insights
    const assessments = await prisma.assessmentResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 10
    });

    if (assessments.length === 0) {
      return res.json({ recommendedPractice: null });
    }

    const assessmentInsights = await buildAssessmentInsights(
      assessments,
      { userName: user.firstName || user.name }
    );

    const userContext: any = {
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      approach: user.approach as 'western' | 'eastern' | 'hybrid',
      assessmentInsights: {
        byType: assessmentInsights.insights.byType,
        recommendations: []
      },
      wellnessScore: assessmentInsights.insights.wellnessScore?.value
    };

    const recommendations = await recommendationService.getContentRecommendations({
      userId,
      userContext,
      approach: user.approach as 'western' | 'eastern' | 'hybrid',
      wellnessScore: assessmentInsights.insights.wellnessScore?.value,
      maxItems: 3
    });

    res.json({
      recommendations: recommendations.items,
      focusAreas: recommendations.focusAreas,
      rationale: recommendations.rationale
    });
  } catch (error) {
    console.error('Error fetching recommended practice:', error);
    res.status(500).json({ error: 'Failed to load recommendations' });
  }
});

// Helper functions
function calculateProfileCompletion(user: any): number {
  const fields = [
    user.firstName,
    user.lastName,
    user.birthday,
    user.region,
    user.approach,
    user.emergencyContact,
    user.emergencyPhone
  ];
  const completed = fields.filter(f => f !== null && f !== undefined && f !== '').length;
  return Math.round((completed / fields.length) * 100);
}

function generateInsightsFromAssessments(byType: any, aiSummary: string): any[] {
  const insights: any[] = [];

  // Add AI summary as primary insight
  if (aiSummary) {
    insights.push({
      type: 'ai-summary',
      title: 'Your Wellbeing Overview',
      description: aiSummary,
      icon: 'sparkles',
      timestamp: new Date().toISOString()
    });
  }

  // Generate insights from assessment trends
  Object.entries(byType).forEach(([type, summary]: [string, any]) => {
    if (summary.trend === 'declining') {
      insights.push({
        type: 'pattern',
        title: `Pattern detected: ${friendlyLabel(type)}`,
        description: `Your ${friendlyLabel(type).toLowerCase()} levels show a declining trend. ${summary.recommendations?.[0] || 'Consider focusing on self-care practices.'}`,
        icon: 'trending-down',
        severity: 'warning',
        timestamp: summary.lastCompletedAt
      });
    }

    if (summary.trend === 'improving' && summary.latestScore < 40) {
      insights.push({
        type: 'progress',
        title: `Progress update: ${friendlyLabel(type)}`,
        description: `Great work! Your ${friendlyLabel(type).toLowerCase()} has improved ${Math.abs(summary.change || 0).toFixed(0)}% since your last assessment.`,
        icon: 'trending-up',
        severity: 'success',
        timestamp: summary.lastCompletedAt
      });
    }
  });

  return insights.slice(0, 5); // Limit to 5 insights
}

function friendlyLabel(type: string): string {
  const labels: Record<string, string> = {
    anxiety: 'Anxiety',
    anxiety_assessment: 'Anxiety',
    stress: 'Stress',
    emotionalIntelligence: 'Emotional Intelligence',
    overthinking: 'Overthinking',
    depression: 'Depression',
    trauma: 'Trauma Response'
  };
  return labels[type] || type.split(/(?=[A-Z])/).join(' ');
}

function calculateMoodDistribution(moodEntries: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  moodEntries.forEach(entry => {
    distribution[entry.mood] = (distribution[entry.mood] || 0) + 1;
  });
  return distribution;
}

function getStreakMessage(streak: number): string {
  if (streak === 0) return 'Start your streak today!';
  if (streak === 1) return 'Great start! Keep it going.';
  if (streak < 7) return `${streak} days strong! Building momentum.`;
  if (streak < 30) return `${streak}-day streak! You\'re on fire! 🔥`;
  return `Amazing ${streak}-day streak! You\'re a wellness champion! 🏆`;
}

export default router;
