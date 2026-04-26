import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '../api/validators';
import { logMoodSchema, getMoodHistorySchema } from '../api/validators/mood.validator';
import { getUserProfile, updateProfile, completeOnboarding, logMood, getMoodHistory } from '../controllers/userController';
import { prisma } from '../config/database';
import { STRONG_PASSWORD_MESSAGE, isStrongPassword } from '../shared/auth/passwordPolicy';

const router = express.Router();

// All routes require authentication
router.use(authenticate as any);

// Non-id routes must be declared before parameterized routes to avoid route collisions
router.post('/complete-onboarding', completeOnboarding as any);

// Profile route (alias for mobile app compatibility)  
// Mobile calls PUT /users/profile, this maps to the same updateProfile logic as PUT /auth/profile
router.put('/profile', validate(updateProfileSchema), (req: any, res, next) => {
  req.params = { ...req.params, userId: req.user?.id };
  return (updateProfile as any)(req, res, next);
});

// Change password (for mobile app - authenticated users)
router.post('/change-password', async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ success: false, error: STRONG_PASSWORD_MESSAGE });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return res.status(400).json({ success: false, error: 'Password not set for this account' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// Mood tracking routes
router.post('/mood', validate(logMoodSchema), logMood as any);
router.get('/mood-history', validate(getMoodHistorySchema), getMoodHistory as any);

// User profile routes
router.get('/:userId', getUserProfile as any);
router.put('/:userId', updateProfile as any);

export default router;
