import { Request, Response } from 'express';
import prisma from '../../config/database';

interface AnalyticsTimeframe {
  startDate: Date;
  endDate: Date;
}

/**
 * Get comprehensive analytics data for admin dashboard
 * GET /api/admin/analytics
 */
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range
    const timeframes: Record<string, AnalyticsTimeframe> = {
      '7d': {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      },
      '30d': {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      },
      '90d': {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      },
      'all': {
        startDate: new Date(2020, 0, 1),
        endDate: new Date()
      }
    };

    const { startDate, endDate } = timeframes[timeframe as string] || timeframes['30d'];

    // Parallel queries for performance
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalAssessments,
      completedAssessments,
      totalPractices,
      practiceCompletions,
      totalContent,
      contentViews,
      premiumUsers,
      assessmentsByType,
      popularPractices,
      popularContent,
      userGrowthData,
      engagementData
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (had activity within timeframe)
      prisma.user.count({
        where: {
          updatedAt: {
            gte: startDate
          }
        }
      }),
      
      // New users in timeframe
      prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Total assessments
      prisma.assessmentDefinition.count({
        where: { isActive: true }
      }),
      
      // Completed assessments in timeframe
      prisma.assessmentResult.count({
        where: {
          completedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Total practices
      prisma.practice.count({
        where: { isPublished: true }
      }),
      
      // Practice completions tracked via completed plan modules in timeframe
      prisma.userPlanModule.count({
        where: {
          completed: true,
          completedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Total content
      prisma.content.count({
        where: { isPublished: true }
      }),
      
      // Content interactions tracked via engagement updates in timeframe
      prisma.contentEngagement.count({
        where: {
          updatedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Premium users
      prisma.user.count({
        where: {
          isPremium: true
        }
      }),
      
      // Assessments by type
      prisma.assessmentResult.groupBy({
        by: ['assessmentType'],
        where: {
          completedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      }),
      
      // Popular practices (would need tracking)
      prisma.practice.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          type: true,
          duration: true
        },
        take: 10,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      
      // Popular content
      prisma.content.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          type: true,
          category: true
        },
        take: 10,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      
      // User growth by day
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          date("createdAt") as date,
          COUNT(*) as count
        FROM users
        WHERE "createdAt" >= ${startDate.toISOString()}
          AND "createdAt" <= ${endDate.toISOString()}
        GROUP BY date("createdAt")
        ORDER BY date ASC
      `,
      
      // Engagement data (assessments per day)
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          date("createdAt") as date,
          COUNT(*) as count
        FROM assessment_results
        WHERE "createdAt" >= ${startDate.toISOString()}
          AND "createdAt" <= ${endDate.toISOString()}
        GROUP BY date("createdAt")
        ORDER BY date ASC
      `
    ]);

    // Get assessment names for the top assessments
    const assessmentTypes = assessmentsByType.map(a => a.assessmentType);
    const assessmentNames = await prisma.assessmentDefinition.findMany({
      where: {
        id: {
          in: assessmentTypes
        }
      },
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    const assessmentNameMap = new Map(
      assessmentNames.map(a => [a.id, { name: a.name, type: a.type }])
    );

    // Calculate completion rate
    const completionRate = totalAssessments > 0 
      ? ((completedAssessments / (activeUsers || 1)) * 100).toFixed(1)
      : '0';

    // Format response
    const analytics = {
      overview: {
        totalUsers,
        activeUsers,
        newUsers,
        premiumUsers,
        activeRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0',
        premiumRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0'
      },
      assessments: {
        totalAssessments,
        completedAssessments,
        completionRate,
        averagePerUser: activeUsers > 0 ? (completedAssessments / activeUsers).toFixed(1) : '0',
        byType: assessmentsByType.map(a => ({
          assessmentType: a.assessmentType,
          name: assessmentNameMap.get(a.assessmentType)?.name || 'Unknown',
          id: a.assessmentType,
          type: assessmentNameMap.get(a.assessmentType)?.type || 'Basic',
          completions: a._count?.id || 0
        }))
      },
      practices: {
        totalPractices,
        completions: practiceCompletions,
        popular: popularPractices.map(p => ({
          id: p.id,
          title: p.title,
          type: p.type,
          duration: p.duration
        }))
      },
      content: {
        totalContent,
        views: contentViews,
        popular: popularContent.map(c => ({
          id: c.id,
          title: c.title,
          type: c.type,
          category: c.category
        }))
      },
      trends: {
        userGrowth: userGrowthData.map(d => ({
          date: d.date,
          count: Number(d.count)
        })),
        engagement: engagementData.map(d => ({
          date: d.date,
          count: Number(d.count)
        }))
      },
      timeframe: {
        type: timeframe as string,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get user statistics
 * GET /api/admin/analytics/users
 */
export const getUserAnalytics = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      activeToday,
      activeThisWeek,
      activeThisMonth,
      premiumUsers
    ] = await Promise.all([
      prisma.user.count(),
      
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      prisma.user.count({
        where: { isPremium: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: {
          today: activeToday,
          thisWeek: activeThisWeek,
          thisMonth: activeThisMonth
        },
        premium: premiumUsers
      }
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics'
    });
  }
};

/**
 * Get content performance analytics
 * GET /api/admin/analytics/content
 */
export const getContentAnalytics = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    const whereClause = type ? { type: type as string, isPublished: true } : { isPublished: true };

    const [
      contentByType,
      contentByApproach,
      recentContent
    ] = await Promise.all([
      prisma.content.groupBy({
        by: ['type'],
        where: { isPublished: true },
        _count: {
          id: true
        }
      }),
      
      prisma.content.groupBy({
        by: ['approach'],
        where: { isPublished: true },
        _count: {
          id: true
        }
      }),
      
      prisma.content.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          type: true,
          category: true,
          createdAt: true,
          isPublished: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      })
    ]);

    res.json({
      success: true,
      data: {
        byType: contentByType.map(c => ({
          type: c.type,
          count: c._count.id
        })),
        byApproach: contentByApproach.map(c => ({
          approach: c.approach,
          count: c._count.id
        })),
        recent: recentContent
      }
    });
  } catch (error) {
    console.error('Error fetching content analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content analytics'
    });
  }
};

/**
 * Get assessment performance analytics
 * GET /api/admin/analytics/assessments
 */
export const getAssessmentAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const timeframes: Record<string, Date> = {
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    };

    const startDate = timeframes[timeframe as string] || timeframes['30d'];

    const [
      totalAssessments,
      completionsByAssessment,
      averageScores,
      completionTrend
    ] = await Promise.all([
      prisma.assessmentDefinition.count({
        where: { isActive: true }
      }),
      
      prisma.assessmentResult.groupBy({
        by: ['assessmentType'],
        where: {
          completedAt: { gte: startDate }
        },
        _count: { id: true },
        orderBy: {
          _count: { id: 'desc' }
        }
      }),
      
      prisma.assessmentResult.groupBy({
        by: ['assessmentType'],
        where: {
          completedAt: { gte: startDate }
        },
        _avg: { score: true }
      }),
      
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          date("completedAt") as date,
          COUNT(*) as count
        FROM assessment_results
        WHERE "completedAt" >= ${startDate.toISOString()}
        GROUP BY date("completedAt")
        ORDER BY date ASC
      `
    ]);

    // Get assessment details by type
    const assessmentTypes = completionsByAssessment.map(a => a.assessmentType);
    const assessments = await prisma.assessmentDefinition.findMany({
      where: { type: { in: assessmentTypes } },
      select: {
        id: true,
        name: true,
        type: true,
        category: true
      }
    });

    const assessmentMap = new Map(assessments.map(a => [a.type, a]));
    const avgScoreMap = new Map(averageScores.map(a => [a.assessmentType, a._avg?.score || null]));

    res.json({
      success: true,
      data: {
        total: totalAssessments,
        completions: completionsByAssessment.map(c => ({
          assessmentType: c.assessmentType,
          name: assessmentMap.get(c.assessmentType)?.name || 'Unknown',
          type: assessmentMap.get(c.assessmentType)?.type || 'unknown',
          category: assessmentMap.get(c.assessmentType)?.category || 'general',
          completions: c._count?.id || 0,
          averageScore: avgScoreMap.get(c.assessmentType) || null
        })),
        trend: completionTrend.map(t => ({
          date: t.date,
          count: Number(t.count)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching assessment analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessment analytics'
    });
  }
};
