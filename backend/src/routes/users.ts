import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logMoodSchema, getMoodHistorySchema } from '../api/validators/mood.validator';
import { getUserProfile, updateProfile, completeOnboarding, logMood, getMoodHistory } from '../controllers/userController';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate as any);

// Non-id routes must be declared before parameterized routes to avoid route collisions
router.post('/complete-onboarding', completeOnboarding as any);

// Profile route (alias for mobile app compatibility)  
// Mobile calls PUT /users/profile, this maps to the same updateProfile logic as PUT /auth/profile
router.put('/profile', async (req: any, res) => {
  try {
    const {
      birthday, gender, region, language, emergencyContact, emergencyPhone,
      approach, firstName, lastName, isOnboarded, dateOfBirth, preferredApproach,
      primaryConcern, dataConsent, clinicianSharing
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(birthday && {
          birthday: (() => {
            let b: any = birthday;
            if (typeof b === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(b)) {
              const [dd, mm, yyyy] = b.split('-');
              b = `${yyyy}-${mm}-${dd}`;
            }
            const d = new Date(b);
            return isNaN(d.getTime()) ? undefined : d;
          })()
        }),
        ...(dateOfBirth && {
          birthday: (() => {
            const d = new Date(dateOfBirth);
            return isNaN(d.getTime()) ? undefined : d;
          })()
        }),
        ...(gender && { gender }),
        ...(region && { region }),
        ...(language && { language }),
        ...(emergencyContact && { emergencyContact }),
        ...(emergencyPhone && { emergencyPhone }),
        ...(approach && { approach }),
        ...(preferredApproach && { approach: preferredApproach }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(isOnboarded !== undefined && { isOnboarded }),
        ...(dataConsent !== undefined && { dataConsent }),
        ...(clinicianSharing !== undefined && { clinicianSharing }),
      },
    });

    const { password: _password, securityAnswerHash: _answerHash, ...user } = updatedUser as any;
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
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

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
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
