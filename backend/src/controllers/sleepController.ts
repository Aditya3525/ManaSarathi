import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';

import { prisma } from '../config/database';
import { formatZodErrors } from '../utils/zodHelpers';

const createSleepSchema = z.object({
  bedTime: z.string().datetime('bedTime must be a valid ISO date'),
  wakeTime: z.string().datetime('wakeTime must be a valid ISO date'),
  quality: z.number().int().min(1).max(5),
  factors: z.array(z.string().min(1).max(50)).max(10).optional(),
  notes: z.string().max(500).trim().optional(),
});

const querySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((value) => {
      const parsed = Number.parseInt(value || '30', 10);
      if (Number.isNaN(parsed)) return 30;
      return parsed;
    })
    .refine((value) => value >= 1 && value <= 90, 'days must be between 1 and 90'),
});

const computeDurationHours = (bedTime: Date, wakeTime: Date): number => {
  const adjustedWake = new Date(wakeTime);
  if (adjustedWake.getTime() <= bedTime.getTime()) {
    adjustedWake.setDate(adjustedWake.getDate() + 1);
  }

  const durationMs = adjustedWake.getTime() - bedTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  return Number(durationHours.toFixed(2));
};

const parseFactors = (value: Prisma.JsonValue | null): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

/**
 * POST /api/sleep
 */
export const createSleepLog = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = createSleepSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sleep log payload',
        details: formatZodErrors(validation.error),
      });
    }

    const { bedTime, wakeTime, quality, factors, notes } = validation.data;
    const bed = new Date(bedTime);
    const wake = new Date(wakeTime);
    const duration = computeDurationHours(bed, wake);

    const log = await prisma.sleepLog.create({
      data: {
        userId,
        bedTime: bed,
        wakeTime: wake,
        quality,
        factors: factors ? (factors as Prisma.InputJsonValue) : undefined,
        duration,
        notes: notes && notes.length > 0 ? notes : null,
      },
    });

    return res.status(201).json({ success: true, data: log });
  } catch (error) {
    console.error('Error creating sleep log:', error);
    return res.status(500).json({ success: false, error: 'Failed to log sleep' });
  }
};

/**
 * GET /api/sleep?days=30
 */
export const getSleepHistory = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = querySchema.safeParse(req.query);
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

    const logs = await prisma.sleepLog.findMany({
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
        logs,
        days,
        total: logs.length,
      },
    });
  } catch (error) {
    console.error('Error fetching sleep history:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch sleep history' });
  }
};

/**
 * GET /api/sleep/stats?days=30
 */
export const getSleepStats = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = querySchema.safeParse(req.query);
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

    const logs = await prisma.sleepLog.findMany({
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

    const total = logs.length;
    const averageQuality = total > 0
      ? Number((logs.reduce((sum, log) => sum + log.quality, 0) / total).toFixed(2))
      : null;

    const durations = logs
      .map((log) => (typeof log.duration === 'number' ? log.duration : null))
      .filter((value): value is number => value !== null);

    const averageDuration = durations.length > 0
      ? Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2))
      : null;

    const factorCounts: Record<string, number> = {};
    logs.forEach((log) => {
      parseFactors(log.factors).forEach((factor) => {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      });
    });

    const commonFactors = Object.entries(factorCounts)
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.json({
      success: true,
      data: {
        periodDays: days,
        totalLogs: total,
        averageQuality,
        averageDuration,
        commonFactors,
      },
    });
  } catch (error) {
    console.error('Error fetching sleep stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch sleep stats' });
  }
};
