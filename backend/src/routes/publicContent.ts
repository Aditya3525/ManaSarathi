import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Public: list published content (basic filters)
router.get('/', async (req, res) => {
  try {
    const { type, category, approach } = req.query;
    const where: any = { isPublished: true };
    if (type && typeof type === 'string') where.type = type;
    if (category && typeof category === 'string') where.category = category;
    if (approach && typeof approach === 'string') where.approach = approach;

    const items = await prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        contentType: true,
        category: true,
        approach: true,
        description: true,
        youtubeUrl: true,
        thumbnailUrl: true,
        difficulty: true,
        intensityLevel: true,
        focusAreas: true,
        immediateRelief: true,
        crisisEligible: true,
        timeOfDay: true,
        environment: true,
        culturalContext: true,
        sourceUrl: true,
        sourceName: true,
        duration: true,
        tags: true,
        content: true, // May contain url or body depending on creation
        averageRating: true,
        completions: true,
        effectiveness: true,
      }
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Public content fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch content' });
  }
});

// Public: get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.content.findFirst({
      where: { id: req.params.id, isPublished: true }
    });
    if (!item) return res.status(404).json({ success: false, error: 'Content not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Public content fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch content' });
  }
});

export default router;
