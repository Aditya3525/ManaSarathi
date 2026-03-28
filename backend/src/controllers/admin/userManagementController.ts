import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { logActivity } from './activityLogController';
import prisma from '../../config/database';

const parseBoundedInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const USER_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'email',
  'name',
  'firstName',
  'lastName',
  'isPremium',
  'isOnboarded',
  'approach'
]);

interface UserFilter {
  search?: string;
  isPremium?: boolean;
  isOnboarded?: boolean;
  approach?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Get list of users with filtering and pagination
 * GET /api/admin/users
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      isPremium,
      isOnboarded,
      approach,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseBoundedInt(page, 1, 1, 100000);
    const limitNum = parseBoundedInt(limit, 20, 1, 200);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (isPremium !== undefined) {
      where.isPremium = isPremium === 'true';
    }

    if (isOnboarded !== undefined) {
      where.isOnboarded = isOnboarded === 'true';
    }

    if (approach) {
      where.approach = approach;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo as string);
      }
    }

    // Build order by
    const sortField = USER_SORT_FIELDS.has(sortBy as string) ? (sortBy as string) : 'createdAt';
    const sortDirection: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: any = {};
    orderBy[sortField] = sortDirection;

    // Fetch users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          isPremium: true,
          isOnboarded: true,
          approach: true,
          profilePhoto: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assessments: true,
              moodEntries: true,
              conversations: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages,
          hasMore: pageNum < totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};

/**
 * Get detailed user information
 * GET /api/admin/users/:id
 */
export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assessments: true,
            moodEntries: true,
            conversations: true,
            chatMessages: true,
            planModules: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get recent assessments
    const recentAssessments = await prisma.assessmentResult.findMany({
      where: { userId: id },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        assessmentType: true,
        score: true,
        completedAt: true
      }
    });

    // Get recent mood entries
    const recentMoods = await prisma.moodEntry.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        mood: true,
        notes: true,
        createdAt: true
      }
    });

    // Remove password from response
    const { password, securityAnswerHash, ...userWithoutSensitive } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutSensitive,
        recentActivity: {
          assessments: recentAssessments,
          moods: recentMoods
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details'
    });
  }
};

/**
 * Update user status (premium, onboarded, etc.)
 * PATCH /api/admin/users/:id
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPremium, isOnboarded, approach } = req.body;

    const updateData: any = {};

    if (isPremium !== undefined) {
      updateData.isPremium = isPremium;
    }

    if (isOnboarded !== undefined) {
      updateData.isOnboarded = isOnboarded;
    }

    if (approach !== undefined) {
      updateData.approach = approach;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        isPremium: true,
        isOnboarded: true,
        approach: true
      }
    });

    // Log activity
    const adminEmail = (req as any).admin?.email || 'unknown';
    await logActivity(
      adminEmail,
      'UPDATE',
      'USER',
      id,
      user.email,
      { changes: Object.keys(updateData) },
      req
    );

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
};

/**
 * Get user activity timeline
 * GET /api/admin/users/:id/activity
 */
export const getUserActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '50' } = req.query;
    const limitNum = parseBoundedInt(limit, 50, 1, 200);

    // Fetch various activities
    const [assessments, moodEntries, conversations] = await Promise.all([
      prisma.assessmentResult.findMany({
        where: { userId: id },
        orderBy: { completedAt: 'desc' },
        take: limitNum,
        select: {
          id: true,
          assessmentType: true,
          score: true,
          completedAt: true
        }
      }),
      prisma.moodEntry.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        select: {
          id: true,
          mood: true,
          createdAt: true,
          notes: true
        }
      }),
      prisma.conversation.findMany({
        where: { userId: id },
        orderBy: { lastMessageAt: 'desc' },
        take: limitNum,
        select: {
          id: true,
          title: true,
          lastMessageAt: true,
          _count: {
            select: {
              messages: true
            }
          }
        }
      })
    ]);

    // Combine and sort activities
    const activities = [
      ...assessments.map(a => ({
        type: 'assessment',
        id: a.id,
        timestamp: a.completedAt,
        data: {
          assessmentType: a.assessmentType,
          score: a.score
        }
      })),
      ...moodEntries.map(m => ({
        type: 'mood',
        id: m.id,
        timestamp: m.createdAt,
        data: {
          mood: m.mood,
          notes: m.notes
        }
      })),
      ...conversations.map(c => ({
        type: 'conversation',
        id: c.id,
        timestamp: c.lastMessageAt,
        data: {
          title: c.title,
          messageCount: c._count.messages
        }
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitNum);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    });
  }
};

/**
 * Delete user account (soft delete by setting flag or hard delete)
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete = false } = req.query;

    // Get user details before deletion
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true, name: true }
    });

    if (hardDelete === 'true') {
      // Hard delete - actually remove from database
      await prisma.user.delete({
        where: { id }
      });

      // Log activity
      const adminEmail = (req as any).admin?.email || 'unknown';
      await logActivity(
        adminEmail,
        'DELETE',
        'USER',
        id,
        user?.email || 'Unknown User',
        { hardDelete: true },
        req
      );

      res.json({
        success: true,
        message: 'User permanently deleted'
      });
    } else {
      // Soft delete - just mark as inactive (you'd need to add an isActive field)
      // For now, we'll just anonymize the user
      await prisma.user.update({
        where: { id },
        data: {
          email: `deleted_${id}@deleted.com`,
          name: 'Deleted User',
          firstName: 'Deleted',
          lastName: 'User',
          password: null,
          googleId: null
        }
      });

      // Log activity
      const adminEmail = (req as any).admin?.email || 'unknown';
      await logActivity(
        adminEmail,
        'DELETE',
        'USER',
        id,
        user?.email || 'Unknown User',
        { hardDelete: false, anonymized: true },
        req
      );

      res.json({
        success: true,
        message: 'User account deactivated'
      });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

/**
 * Reset user password
 * POST /api/admin/users/:id/reset-password
 */
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: { email: true, name: true }
    });

    // Log activity
    const adminEmail = (req as any).admin?.email || 'unknown';
    await logActivity(
      adminEmail,
      'UPDATE',
      'USER',
      id,
      user.email,
      { action: 'password_reset' },
      req
    );

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
};

/**
 * Get user statistics summary
 * GET /api/admin/users/stats
 */
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      premiumUsers,
      onboardedUsers,
      activeThisMonth,
      usersByApproach
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.user.count({ where: { isOnboarded: true } }),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.user.groupBy({
        by: ['approach'],
        _count: { id: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalUsers,
        premium: premiumUsers,
        onboarded: onboardedUsers,
        activeThisMonth,
        byApproach: usersByApproach.map(a => ({
          approach: a.approach || 'not-set',
          count: a._count.id
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics'
    });
  }
};
