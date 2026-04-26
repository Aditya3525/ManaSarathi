import { Response } from 'express';
import { z } from 'zod';

import { prisma } from '../config/database';
import { formatZodErrors } from '../utils/zodHelpers';

const createHabitSchema = z.object({
  title: z.string().min(3).max(120).trim(),
  cue: z.string().min(3).max(160).trim(),
  practiceId: z.string().min(1).max(64).trim().optional(),
});

const updateHabitSchema = z.object({
  title: z.string().min(3).max(120).trim().optional(),
  cue: z.string().min(3).max(160).trim().optional(),
  practiceId: z.string().min(1).max(64).trim().nullable().optional(),
  active: z.boolean().optional(),
});

const completeHabitSchema = z.object({
  note: z.string().max(300).trim().optional(),
});

const paramsSchema = z.object({
  id: z.string().min(1),
});

const listHabitsSchema = z.object({
  active: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
      return undefined;
    }),
});

const getHabitModel = () => {
  return (prisma as any).userHabit;
};

const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const isYesterday = (candidate: Date, now = new Date()): boolean => {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(candidate, yesterday);
};

const nextStreakFromCompletion = (lastCompletedAt: Date | null, currentStreak: number): number => {
  if (!lastCompletedAt) {
    return 1;
  }

  const now = new Date();
  if (isSameDay(lastCompletedAt, now)) {
    return Math.max(1, currentStreak);
  }

  if (isYesterday(lastCompletedAt, now)) {
    return Math.max(1, currentStreak) + 1;
  }

  return 1;
};

/**
 * GET /api/habits
 */
export const listHabits = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const habitModel = getHabitModel();
    if (!habitModel) {
      return res.status(503).json({
        success: false,
        error: 'Habit feature is not available yet. Please run the latest database migration.'
      });
    }

    const validation = listHabitsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: formatZodErrors(validation.error)
      });
    }

    const habits = await habitModel.findMany({
      where: {
        userId,
        ...(typeof validation.data.active === 'boolean' ? { active: validation.data.active } : {}),
      },
      orderBy: [
        { active: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return res.json({
      success: true,
      data: {
        habits,
        total: habits.length,
      },
    });
  } catch (error) {
    console.error('Error listing habits:', error);
    return res.status(500).json({ success: false, error: 'Failed to list habits' });
  }
};

/**
 * POST /api/habits
 */
export const createHabit = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const habitModel = getHabitModel();
    if (!habitModel) {
      return res.status(503).json({
        success: false,
        error: 'Habit feature is not available yet. Please run the latest database migration.'
      });
    }

    const validation = createHabitSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid habit payload',
        details: formatZodErrors(validation.error),
      });
    }

    const habit = await habitModel.create({
      data: {
        userId,
        title: validation.data.title,
        cue: validation.data.cue,
        practiceId: validation.data.practiceId || null,
      },
    });

    return res.status(201).json({ success: true, data: habit });
  } catch (error) {
    console.error('Error creating habit:', error);
    return res.status(500).json({ success: false, error: 'Failed to create habit' });
  }
};

/**
 * PATCH /api/habits/:id
 */
export const updateHabit = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const habitModel = getHabitModel();
    if (!habitModel) {
      return res.status(503).json({
        success: false,
        error: 'Habit feature is not available yet. Please run the latest database migration.'
      });
    }

    const paramsValidation = paramsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid habit id',
        details: formatZodErrors(paramsValidation.error),
      });
    }

    const bodyValidation = updateHabitSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid habit update payload',
        details: formatZodErrors(bodyValidation.error),
      });
    }

    const existing = await habitModel.findFirst({
      where: {
        id: paramsValidation.data.id,
        userId,
      },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Habit not found' });
    }

    const updated = await habitModel.update({
      where: { id: existing.id },
      data: {
        ...(typeof bodyValidation.data.title === 'string' ? { title: bodyValidation.data.title } : {}),
        ...(typeof bodyValidation.data.cue === 'string' ? { cue: bodyValidation.data.cue } : {}),
        ...(bodyValidation.data.practiceId !== undefined
          ? {
              practiceId:
                typeof bodyValidation.data.practiceId === 'string' && bodyValidation.data.practiceId.length > 0
                  ? bodyValidation.data.practiceId
                  : null
            }
          : {}),
        ...(typeof bodyValidation.data.active === 'boolean' ? { active: bodyValidation.data.active } : {}),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating habit:', error);
    return res.status(500).json({ success: false, error: 'Failed to update habit' });
  }
};

/**
 * POST /api/habits/:id/complete
 */
export const completeHabit = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const habitModel = getHabitModel();
    if (!habitModel) {
      return res.status(503).json({
        success: false,
        error: 'Habit feature is not available yet. Please run the latest database migration.'
      });
    }

    const paramsValidation = paramsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid habit id',
        details: formatZodErrors(paramsValidation.error),
      });
    }

    const bodyValidation = completeHabitSchema.safeParse(req.body || {});
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid completion payload',
        details: formatZodErrors(bodyValidation.error),
      });
    }

    const existing = await habitModel.findFirst({
      where: {
        id: paramsValidation.data.id,
        userId,
      },
      select: {
        id: true,
        active: true,
        streak: true,
        lastCompletedAt: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Habit not found' });
    }

    if (!existing.active) {
      return res.status(409).json({ success: false, error: 'Activate the habit before marking it complete' });
    }

    const lastCompleted = existing.lastCompletedAt ? new Date(existing.lastCompletedAt) : null;
    const nextStreak = nextStreakFromCompletion(lastCompleted, existing.streak || 0);

    const updated = await habitModel.update({
      where: { id: existing.id },
      data: {
        streak: nextStreak,
        lastCompletedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      data: {
        ...updated,
        completedToday: true,
      },
    });
  } catch (error) {
    console.error('Error completing habit:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark habit complete' });
  }
};

/**
 * DELETE /api/habits/:id
 */
export const deleteHabit = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const habitModel = getHabitModel();
    if (!habitModel) {
      return res.status(503).json({
        success: false,
        error: 'Habit feature is not available yet. Please run the latest database migration.'
      });
    }

    const paramsValidation = paramsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid habit id',
        details: formatZodErrors(paramsValidation.error),
      });
    }

    const existing = await habitModel.findFirst({
      where: {
        id: paramsValidation.data.id,
        userId,
      },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Habit not found' });
    }

    await habitModel.delete({ where: { id: existing.id } });

    return res.json({ success: true, data: { id: existing.id } });
  } catch (error) {
    console.error('Error deleting habit:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete habit' });
  }
};
