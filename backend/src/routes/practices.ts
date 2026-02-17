import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Public: list published practices (optionally filter by type/difficulty)
router.get('/', async (req, res) => {
  try {
    const { type, difficulty, approach, format } = req.query;
    const where: any = { isPublished: true };
    if (type && typeof type === 'string') where.type = type;
    if (difficulty && typeof difficulty === 'string') where.difficulty = difficulty;
    if (approach && typeof approach === 'string') where.approach = approach;
    if (format && typeof format === 'string') where.format = format;

    const practices = await prisma.practice.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: practices });
  } catch (error) {
    console.error('Public practices fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch practices' });
  }
});

// Log a practice session (authenticated)
router.post('/sessions', authenticate as any, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { practiceId, startTime, endTime, completed, notes } = req.body;

    if (!practiceId) {
      return res.status(400).json({ success: false, error: 'practiceId is required' });
    }

    // Track practice as a progress metric
    const progressEntry = await prisma.progressTracking.create({
      data: {
        userId,
        metric: 'practice_session',
        value: completed ? 1 : 0,
        notes: JSON.stringify({
          practiceId,
          startTime,
          endTime,
          completed: completed ?? true,
          notes: notes || '',
        }),
      },
    });

    res.json({ success: true, data: progressEntry });
  } catch (error) {
    console.error('Log practice session error:', error);
    res.status(500).json({ success: false, error: 'Failed to log practice session' });
  }
});

// Public: get single published practice
router.get('/:id', async (req, res) => {
  try {
    const practice = await prisma.practice.findFirst({
      where: { id: req.params.id, isPublished: true }
    });
    if (!practice) return res.status(404).json({ success: false, error: 'Practice not found' });
    res.json({ success: true, data: practice });
  } catch (error) {
    console.error('Public practice fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch practice' });
  }
});

export default router;
