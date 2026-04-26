import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { journalService } from '../services/journalService';
import { formatZodErrors } from '../utils/zodHelpers';

const createJournalEntrySchema = z.object({
  prompt: z.string().max(500).optional().nullable(),
  content: z.string().min(1).max(8000),
  mood: z.string().max(64).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional()
});

const getJournalQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((value) => {
      const parsed = Number.parseInt(value || '30', 10);
      if (Number.isNaN(parsed)) return 30;
      return parsed;
    })
    .refine((value) => value >= 1 && value <= 180, 'days must be between 1 and 180')
});

const deleteJournalSchema = z.object({
  id: z.string().min(1)
});

const normalizeEmotionFromMood = (mood?: string | null): string => {
  const lower = (mood || '').trim().toLowerCase();
  if (['anxious', 'anxiety', 'panic', 'worry'].includes(lower)) return 'anxiety';
  if (['struggling', 'overwhelmed', 'stressed', 'stress'].includes(lower)) return 'stress';
  if (['sad', 'sadness', 'low'].includes(lower)) return 'sadness';
  if (['angry', 'anger', 'frustrated'].includes(lower)) return 'anger';
  if (['great', 'good', 'calm', 'hopeful'].includes(lower)) return 'positive';
  return 'neutral';
};

/**
 * POST /api/journal
 */
export const createJournalEntry = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = createJournalEntrySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid journal entry payload',
        details: formatZodErrors(validation.error)
      });
    }

    const { prompt, content, mood, tags } = validation.data;
    const resolvedTags = tags && tags.length > 0 ? tags : journalService.extractTags(content);

    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        prompt: prompt || null,
        content,
        mood: mood || null,
        tags: resolvedTags.length > 0 ? (resolvedTags as any) : null
      }
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return res.status(500).json({ success: false, error: 'Failed to create journal entry' });
  }
};

/**
 * GET /api/journal?days=30
 */
export const getJournalEntries = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const queryValidation = getJournalQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: formatZodErrors(queryValidation.error)
      });
    }

    const days = queryValidation.data.days;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const entries = await prisma.journalEntry.findMany({
      where: {
        userId,
        createdAt: { gte: since }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: {
        entries,
        days,
        total: entries.length
      }
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch journal entries' });
  }
};

/**
 * GET /api/journal/prompts
 */
export const getJournalPrompt = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const [user, latestMood] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          approach: true
        }
      }),
      prisma.moodEntry.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          mood: true
        }
      })
    ]);

    const emotion = normalizeEmotionFromMood(latestMood?.mood);
    const approach = user?.approach || 'hybrid';
    const prompt = journalService.getPromptForState(emotion, approach);

    return res.json({
      success: true,
      data: {
        prompt,
        emotion,
        approach
      }
    });
  } catch (error) {
    console.error('Error fetching journal prompt:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch journal prompt' });
  }
};

/**
 * GET /api/journal/reflection
 */
export const getWeeklyReflection = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const reflection = await journalService.getOrGenerateWeeklyReflection(userId);
    return res.json({ success: true, data: reflection });
  } catch (error) {
    console.error('Error getting weekly reflection:', error);
    return res.status(500).json({ success: false, error: 'Failed to get weekly reflection' });
  }
};

/**
 * DELETE /api/journal/:id
 */
export const deleteJournalEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = deleteJournalSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid journal entry id',
        details: formatZodErrors(validation.error)
      });
    }

    const existing = await prisma.journalEntry.findFirst({
      where: {
        id: validation.data.id,
        userId
      },
      select: { id: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    await prisma.journalEntry.delete({ where: { id: validation.data.id } });
    return res.json({ success: true, message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete journal entry' });
  }
};
