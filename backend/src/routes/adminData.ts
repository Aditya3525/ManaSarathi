import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@example.com,admin@mentalwellbeing.ai')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

// Protect all admin-data routes with authentication and admin allowlist checks.
router.use(authenticate as any);
router.use((req: any, res: Response, next) => {
  const email = String(req.user?.email || '').toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
});

/**
 * DELETE /api/admin/users/:email
 * Delete a user and all related data with proper cascade
 */
router.delete('/users/:email', async (req: Request, res: Response) => {
  const { email } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        assessments: true,
        moodEntries: true,
        planModules: true,
        conversations: true,
        chatMessages: true,
        assessmentSessions: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascade should handle related records)
    await prisma.user.delete({
      where: { id: user.id }
    });

    res.json({
      success: true,
      message: `User ${email} and all related data deleted successfully`,
      deletedRecords: {
        assessments: user.assessments.length,
        moodEntries: user.moodEntries.length,
        planModules: user.planModules.length,
        conversations: user.conversations.length,
        chatMessages: user.chatMessages.length,
        assessmentSessions: user.assessmentSessions.length,
      }
    });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    
    // If cascade fails, do manual deletion
    if (error.message?.includes('foreign key') || error.message?.includes('FOREIGN KEY')) {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Manual cascade delete
        await prisma.$transaction([
          prisma.contentEngagement.deleteMany({ where: { userId: user.id } }),
          prisma.dashboardInsights.deleteMany({ where: { userId: user.id } }),
          prisma.chatbotConversation.deleteMany({ where: { userId: user.id } }),
          prisma.assessmentInsight.deleteMany({ where: { userId: user.id } }),
          prisma.progressTracking.deleteMany({ where: { userId: user.id } }),
          prisma.conversationGoal.deleteMany({ where: { userId: user.id } }),
          prisma.conversationMemory.deleteMany({ where: { userId: user.id } }),
          prisma.chatMessage.deleteMany({ where: { userId: user.id } }),
          prisma.conversation.deleteMany({ where: { userId: user.id } }),
          prisma.userPlanModule.deleteMany({ where: { userId: user.id } }),
          prisma.moodEntry.deleteMany({ where: { userId: user.id } }),
          prisma.assessmentResult.deleteMany({ where: { userId: user.id } }),
          prisma.assessmentSession.deleteMany({ where: { userId: user.id } }),
          prisma.user.delete({ where: { id: user.id } }),
        ]);

        res.json({
          success: true,
          message: `User ${email} deleted with manual cascade`,
        });
      } catch (manualError) {
        console.error('Manual cascade delete failed:', manualError);
        res.status(500).json({ error: 'Failed to delete user even with manual cascade' });
      }
    } else {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
});

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        googleId: true,
        isOnboarded: true,
        createdAt: true,
        _count: {
          select: {
            assessments: true,
            moodEntries: true,
            conversations: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
