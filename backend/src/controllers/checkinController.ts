import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';

const createCheckinSchema = z.object({
  type: z.enum(['morning', 'evening', 'post-chat']),
  responses: z.record(z.string(), z.unknown()),
  mood: z.string().max(64).optional()
});

const getCheckinSummarySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional()
});

const startOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const average = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
};

export const createCheckin = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parsed = createCheckinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid check-in payload',
        details: parsed.error.flatten()
      });
    }

    const { type, responses, mood } = parsed.data;

    if (type === 'morning' || type === 'evening') {
      const existing = await prisma.microCheckin.findFirst({
        where: {
          userId,
          type,
          createdAt: {
            gte: startOfToday()
          }
        }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Today's ${type} check-in already exists`
        });
      }
    }

    const checkin = await prisma.microCheckin.create({
      data: {
        userId,
        type,
        responses: responses as Prisma.InputJsonValue,
        mood
      }
    });

    return res.status(201).json({ success: true, data: checkin });
  } catch (error) {
    console.error('Error creating micro check-in:', error);
    return res.status(500).json({ success: false, error: 'Failed to create check-in' });
  }
};

export const getCheckinSummary = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parsed = getCheckinSummarySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: parsed.error.flatten()
      });
    }

    const days = parsed.data.days ?? 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const checkins = await prisma.microCheckin.findMany({
      where: {
        userId,
        createdAt: {
          gte: since
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const morningEnergyScores = checkins
      .filter((entry) => entry.type === 'morning')
      .map((entry) => asNumber((entry.responses as Record<string, unknown>)?.energyLevel))
      .filter((value): value is number => value !== null);

    const eveningDayRatings = checkins
      .filter((entry) => entry.type === 'evening')
      .map((entry) => {
        const responses = entry.responses as Record<string, unknown>;
        return asNumber(responses?.dayRating ?? responses?.overallDay);
      })
      .filter((value): value is number => value !== null);

    return res.json({
      success: true,
      data: {
        checkins,
        avgEnergy: average(morningEnergyScores),
        avgDayRating: average(eveningDayRatings),
        totalCheckins: checkins.length,
        days
      }
    });
  } catch (error) {
    console.error('Error fetching check-in summary:', error);
    return res.status(500).json({ success: false, error: 'Failed to load check-in summary' });
  }
};
