import express from 'express';

import prisma from '../../config/database';
import { requireAdmin } from './requireAdmin';

const router = express.Router();

router.get('/dashboard/summary', requireAdmin, async (req: any, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsersLast7d,
      newUsersLast7d,
      newUsersPrev7d,
      totalPractices,
      totalContent,
      publishedPractices,
      publishedContent,
      totalAssessments,
      pendingTickets,
      urgentTickets,
      pendingTherapistBookings,
      crisisEventsLast7d,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { updatedAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.practice.count(),
      prisma.content.count(),
      prisma.practice.count({ where: { isPublished: true } }),
      prisma.content.count({ where: { isPublished: true } }),
      prisma.assessmentDefinition.count(),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'OPEN', priority: 'URGENT' } }),
      prisma.therapistBooking.count({ where: { status: 'PENDING' } }),
      prisma.crisisEvent.count({ where: { detectedAt: { gte: sevenDaysAgo } } }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          details: true,
          createdAt: true,
        },
      }),
    ]);

    const userGrowthPercent =
      newUsersPrev7d > 0
        ? Math.round(((newUsersLast7d - newUsersPrev7d) / newUsersPrev7d) * 100)
        : newUsersLast7d > 0
          ? 100
          : 0;

    res.json({
      success: true,
      data: {
        kpis: {
          totalUsers,
          activeUsersLast7d,
          newUsersLast7d,
          userGrowthPercent,
          totalPractices,
          totalContent,
          publishedPractices,
          publishedContent,
          totalAssessments,
        },
        attention: {
          pendingTickets,
          urgentTickets,
          pendingTherapistBookings,
          crisisEventsLast7d,
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

export default router;
