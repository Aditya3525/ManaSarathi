import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { createRequestLogger } from '../utils/logger';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../shared/errors/AppError';
import { formatZodErrors } from '../utils/zodHelpers';

// Validation schema for safety plan
const safetyPlanSchema = z.object({
  warningSignsJson: z.string().optional(),
  copingStrategiesJson: z.string().optional(),
  contactsJson: z.string().optional(),
  therapistName: z.string().optional(),
  therapistPhone: z.string().optional(),
  psychiatristName: z.string().optional(),
  psychiatristPhone: z.string().optional(),
  emergencyRoom: z.string().optional(),
  crisisLine: z.string().optional(),
  safeEnvironmentJson: z.string().optional(),
  reasonsToLiveJson: z.string().optional()
});

// Map onboarding country names to DB country codes
const countryNameToCode: Record<string, string> = {
  'India': 'IN',
  'United States': 'US',
  'United Kingdom': 'UK',
  'Canada': 'CA',
  'Australia': 'AU',
  'Germany': 'DE',
  'France': 'FR',
  'Spain': 'ES',
  'Brazil': 'BR',
  'Japan': 'JP',
  'Singapore': 'SG',
  'United Arab Emirates': 'AE',
};

/**
 * Get all active crisis resources
 * GET /api/crisis/resources
 */
export const getCrisisResources = async (req: Request, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'crisis',
    action: 'getResources'
  });

  try {
    const rawCountry = (req.query.country as string) || 'US';
    // Resolve country name to code (e.g., 'India' → 'IN'), or use as-is if already a code
    const country = countryNameToCode[rawCountry] || rawCountry;

    const resources = await prisma.crisisResource.findMany({
      where: {
        isActive: true,
        country
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        phoneNumber: true,
        textNumber: true,
        website: true,
        description: true,
        availability: true,
        language: true,
        tags: true
      }
    });

    log.info({ count: resources.length, country }, 'Fetched crisis resources');

    res.json({
      success: true,
      data: { resources }
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch crisis resources');
    res.status(500).json({ success: false, error: 'Failed to fetch crisis resources' });
  }
};

/**
 * Create or update user's safety plan
 * POST /api/crisis/safety-plan
 */
export const createOrUpdateSafetyPlan = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'crisis',
    action: 'saveSafetyPlan',
    userId: req.user.id
  });

  try {
    const validation = safetyPlanSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(formatZodErrors(validation.error), 'Invalid safety plan data');
    }

    const userId = req.user.id;
    const data = validation.data;

    const safetyPlan = await prisma.safetyPlan.upsert({
      where: { userId },
      create: {
        userId,
        ...data
      },
      update: data
    });

    log.info({ safetyPlanId: safetyPlan.id }, 'Safety plan saved');

    res.json({
      success: true,
      data: { safetyPlan },
      message: 'Safety plan saved successfully'
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to save safety plan');
    if (error instanceof ValidationError) {
      throw error;
    }
    res.status(500).json({ success: false, error: 'Failed to save safety plan' });
  }
};

/**
 * Get user's safety plan
 * GET /api/crisis/safety-plan
 */
export const getSafetyPlan = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'crisis',
    action: 'getSafetyPlan',
    userId: req.user.id
  });

  try {
    const userId = req.user.id;

    const safetyPlan = await prisma.safetyPlan.findUnique({
      where: { userId }
    });

    if (!safetyPlan) {
      // Return empty template if no plan exists
      res.json({
        success: true,
        data: {
          safetyPlan: {
            userId,
            warningSignsJson: '[]',
            copingStrategiesJson: '[]',
            contactsJson: '[]',
            safeEnvironmentJson: '[]',
            reasonsToLiveJson: '[]',
            crisisLine: '988'
          }
        }
      });
      return;
    }

    log.info({ safetyPlanId: safetyPlan.id }, 'Fetched safety plan');

    res.json({
      success: true,
      data: { safetyPlan }
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch safety plan');
    res.status(500).json({ success: false, error: 'Failed to fetch safety plan' });
  }
};

/**
 * Delete user's safety plan
 * DELETE /api/crisis/safety-plan
 */
export const deleteSafetyPlan = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'crisis',
    action: 'deleteSafetyPlan',
    userId: req.user.id
  });

  try {
    const userId = req.user.id;

    await prisma.safetyPlan.deleteMany({
      where: { userId }
    });

    log.info('Safety plan deleted');

    res.json({
      success: true,
      message: 'Safety plan deleted successfully'
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to delete safety plan');
    res.status(500).json({ success: false, error: 'Failed to delete safety plan' });
  }
};
