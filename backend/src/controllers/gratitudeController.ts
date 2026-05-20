import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';

import { prisma } from '../config/database';
import { formatZodErrors } from '../utils/zodHelpers';

const createGratitudeSchema = z.object({
  items: z.array(z.string().min(1).max(120).trim()).min(1).max(10),
  note: z.string().max(500).trim().optional(),
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

const getGratitudeModel = () => {
  return (prisma as any).gratitudeEntry;
};

const normalizeItems = (items: string[]): string[] => {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  ).slice(0, 10);
};

/**
 * POST /api/gratitude
 */
export const createGratitudeEntry = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const gratitudeModel = getGratitudeModel();
    if (!gratitudeModel) {
      return res.status(503).json({
        success: false,
        error: 'Gratitude feature is not available yet. Please run the latest database migration.'
      });
    }

    const validation = createGratitudeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid gratitude payload',
        details: formatZodErrors(validation.error),
      });
    }

    const normalizedItems = normalizeItems(validation.data.items);
    if (normalizedItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please include at least one gratitude item',
      });
    }

    const entry = await gratitudeModel.create({
      data: {
        userId,
        items: normalizedItems as Prisma.InputJsonValue,
        note: validation.data.note && validation.data.note.length > 0 ? validation.data.note : null,
      },
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Error creating gratitude entry:', error);
    return res.status(500).json({ success: false, error: 'Failed to save gratitude entry' });
  }
};

/**
 * GET /api/gratitude?days=30
 */
export const getGratitudeEntries = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const gratitudeModel = getGratitudeModel();
    if (!gratitudeModel) {
      return res.status(503).json({
        success: false,
        error: 'Gratitude feature is not available yet. Please run the latest database migration.'
      });
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

    const entries = await gratitudeModel.findMany({
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
        entries,
        days,
        total: entries.length,
      },
    });
  } catch (error) {
    console.error('Error fetching gratitude entries:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch gratitude entries' });
  }
};
