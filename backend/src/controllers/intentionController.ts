import { Response } from 'express';
import { z } from 'zod';

import { prisma } from '../config/database';
import { formatZodErrors } from '../utils/zodHelpers';

export const PRESET_INTENTIONS = [
  'I will notice one good moment today',
  'I will take 3 deep breaths when stressed',
  'I will set one clear boundary today',
  'I will eat one meal mindfully',
  'I will speak kindly to myself today',
  'I will step outside for 5 minutes',
  'I will say no to one thing that drains me',
  'I will reach out to someone I care about',
];

const setIntentionSchema = z.object({
  intention: z.string().min(3).max(220).trim(),
  isCustom: z.boolean().optional(),
});

const reflectSchema = z.object({
  completed: z.boolean({
    required_error: 'completed is required',
  }),
  reflection: z.string().max(500).trim().optional(),
});

const historyQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((value) => {
      const parsed = Number.parseInt(value || '7', 10);
      if (Number.isNaN(parsed)) return 7;
      return parsed;
    })
    .refine((value) => value >= 1 && value <= 90, 'days must be between 1 and 90'),
});

const paramsSchema = z.object({
  id: z.string().min(1),
});

const getTodayRange = (): { start: Date; end: Date } => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

/**
 * GET /api/intentions/presets
 */
export const getIntentionPresets = async (_req: any, res: Response) => {
  return res.json({
    success: true,
    data: PRESET_INTENTIONS,
  });
};

/**
 * GET /api/intentions/today
 */
export const getTodayIntention = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { start, end } = getTodayRange();

    const intention = await prisma.dailyIntention.findFirst({
      where: {
        userId,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({ success: true, data: intention ?? null });
  } catch (error) {
    console.error('Error fetching today intention:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch today intention' });
  }
};

/**
 * POST /api/intentions
 */
export const setTodayIntention = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = setIntentionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid intention payload',
        details: formatZodErrors(validation.error),
      });
    }

    const { intention, isCustom } = validation.data;
    const { start, end } = getTodayRange();

    const existing = await prisma.dailyIntention.findFirst({
      where: {
        userId,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existing && existing.completed !== null) {
      return res.status(409).json({
        success: false,
        error: 'Today\'s intention was already reflected and cannot be changed',
      });
    }

    const saved = existing
      ? await prisma.dailyIntention.update({
          where: { id: existing.id },
          data: {
            intention,
            isCustom: Boolean(isCustom),
            reflection: null,
            completed: null,
          },
        })
      : await prisma.dailyIntention.create({
          data: {
            userId,
            intention,
            isCustom: Boolean(isCustom),
          },
        });

    return res.status(existing ? 200 : 201).json({ success: true, data: saved });
  } catch (error) {
    console.error('Error setting today intention:', error);
    return res.status(500).json({ success: false, error: 'Failed to set today intention' });
  }
};

/**
 * PATCH /api/intentions/:id/reflect
 */
export const reflectOnIntention = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramsValidation = paramsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid intention id',
        details: formatZodErrors(paramsValidation.error),
      });
    }

    const bodyValidation = reflectSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reflection payload',
        details: formatZodErrors(bodyValidation.error),
      });
    }

    const { id } = paramsValidation.data;
    const { completed, reflection } = bodyValidation.data;

    const existing = await prisma.dailyIntention.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Intention not found' });
    }

    const updated = await prisma.dailyIntention.update({
      where: { id },
      data: {
        completed,
        reflection: reflection && reflection.length > 0 ? reflection : null,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error reflecting on intention:', error);
    return res.status(500).json({ success: false, error: 'Failed to save intention reflection' });
  }
};

/**
 * GET /api/intentions?days=7
 */
export const getIntentionHistory = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = historyQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: formatZodErrors(validation.error),
      });
    }

    const days = validation.data.days;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const intentions = await prisma.dailyIntention.findMany({
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      success: true,
      data: {
        intentions,
        days,
        total: intentions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching intention history:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch intention history' });
  }
};
