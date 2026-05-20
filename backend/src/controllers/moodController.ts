import { Request, Response } from 'express';
import { prisma } from '../config/database';

/**
 * Mood Controller
 *
 * Handles CRUD operations and statistics for mood entries.
 */

const LEGACY_MOOD_BY_GROUP: Record<string, string> = {
    joy: 'Great',
    surprise: 'Good',
    fear: 'Anxious',
    anger: 'Struggling',
    sadness: 'Struggling',
    disgust: 'Okay'
};

const LEGACY_MOOD_BY_EMOTION: Record<string, string> = {
    anxious: 'Anxious',
    nervous: 'Anxious',
    worried: 'Anxious',
    overwhelmed: 'Struggling',
    insecure: 'Struggling',
    hopeless: 'Struggling',
    lonely: 'Struggling',
    grieving: 'Struggling',
    frustrated: 'Struggling',
    irritated: 'Struggling',
    resentful: 'Struggling',
    jealous: 'Struggling',
    calm: 'Good',
    grateful: 'Great',
    excited: 'Great',
    happy: 'Great',
    proud: 'Great'
};

const normalizeLegacyMood = (
    mood: unknown,
    emotionGroup: unknown,
    emotion: unknown
): string | null => {
    if (typeof mood === 'string' && mood.trim().length > 0) {
        return mood.trim();
    }

    const normalizedGroup = typeof emotionGroup === 'string' ? emotionGroup.trim().toLowerCase() : '';
    if (normalizedGroup && LEGACY_MOOD_BY_GROUP[normalizedGroup]) {
        return LEGACY_MOOD_BY_GROUP[normalizedGroup];
    }

    const normalizedEmotion = typeof emotion === 'string' ? emotion.trim().toLowerCase() : '';
    if (normalizedEmotion && LEGACY_MOOD_BY_EMOTION[normalizedEmotion]) {
        return LEGACY_MOOD_BY_EMOTION[normalizedEmotion];
    }

    return null;
};

/**
 * GET /api/mood
 * Fetch mood entries for the authenticated user with optional date filtering.
 */
export const getMoodEntries = async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { limit = '30', startDate, endDate } = req.query;

        const where: any = { userId };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) where.createdAt.lte = new Date(endDate as string);
        }

        const moodEntries = await prisma.moodEntry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Math.min(parseInt(limit as string) || 30, 100),
        });

        res.json({ success: true, data: moodEntries });
    } catch (error) {
        console.error('Error fetching mood entries:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch mood entries' });
    }
};

/**
 * POST /api/mood
 * Log a new mood entry for the authenticated user.
 */
export const createMoodEntry = async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { mood, emotion, emotionGroup, intensity, trigger, notes } = req.body;

        const resolvedMood = normalizeLegacyMood(mood, emotionGroup, emotion);

        if (!resolvedMood) {
            return res.status(400).json({
                success: false,
                error: 'Mood is required (directly or derived from emotion/emotionGroup)'
            });
        }


        const normalizedEmotion = typeof emotion === 'string' ? emotion.trim().toLowerCase() : null;
        const normalizedEmotionGroup =
            typeof emotionGroup === 'string' ? emotionGroup.trim().toLowerCase() : null;
        const normalizedTrigger = typeof trigger === 'string' && trigger.trim().length > 0
            ? trigger.trim()
            : null;
        const normalizedNotes = typeof notes === 'string' && notes.trim().length > 0
            ? notes.trim()
            : null;
        const normalizedIntensity = typeof intensity === 'number'
            ? Math.max(1, Math.min(10, Math.round(intensity)))
            : null;

        const moodEntry = await prisma.moodEntry.create({
            data: {
                userId,
                mood: resolvedMood,
                emotion: normalizedEmotion,
                emotionGroup: normalizedEmotionGroup,
                intensity: normalizedIntensity,
                trigger: normalizedTrigger,
                notes: normalizedNotes,
            },
        });

        res.status(201).json({ success: true, data: moodEntry });
    } catch (error) {
        console.error('Error creating mood entry:', error);
        res.status(500).json({ success: false, error: 'Failed to create mood entry' });
    }
};

/**
 * DELETE /api/mood/:id
 * Delete a specific mood entry owned by the authenticated user.
 */
export const deleteMoodEntry = async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { id } = req.params;

        // Verify the entry belongs to the authenticated user
        const existing = await prisma.moodEntry.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            return res.status(404).json({ success: false, error: 'Mood entry not found' });
        }

        await prisma.moodEntry.delete({ where: { id } });

        res.json({ success: true, message: 'Mood entry deleted' });
    } catch (error) {
        console.error('Error deleting mood entry:', error);
        res.status(500).json({ success: false, error: 'Failed to delete mood entry' });
    }
};

/**
 * GET /api/mood/stats
 * Return mood distribution, streak, and trend data for the authenticated user.
 */
export const getMoodStats = async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { days = '30' } = req.query;
        const daysNum = Math.min(parseInt(days as string) || 30, 365);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);

        // Fetch entries for the period
        const entries = await prisma.moodEntry.findMany({
            where: {
                userId,
                createdAt: { gte: startDate },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Mood distribution
        const distribution: Record<string, number> = {};
        entries.forEach((entry) => {
            distribution[entry.mood] = (distribution[entry.mood] || 0) + 1;
        });

        // Calculate streak (consecutive days with at least one entry)
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const entryDates = new Set(
            entries.map((e) => {
                const d = new Date(e.createdAt);
                d.setHours(0, 0, 0, 0);
                return d.toISOString();
            })
        );

        for (let i = 0; i < daysNum; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            if (entryDates.has(checkDate.toISOString())) {
                currentStreak++;
            } else {
                break;
            }
        }

        // Total and average entries per day
        const totalEntries = entries.length;
        const averagePerDay = daysNum > 0 ? +(totalEntries / daysNum).toFixed(2) : 0;

        // Most common mood
        const mostCommonMood = Object.entries(distribution)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

        res.json({
            success: true,
            data: {
                period: { days: daysNum, from: startDate.toISOString(), to: new Date().toISOString() },
                totalEntries,
                averagePerDay,
                currentStreak,
                mostCommonMood,
                distribution,
            },
        });
    } catch (error) {
        console.error('Error fetching mood stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch mood statistics' });
    }
};
