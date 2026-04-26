import { Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../config/database';

const trackSchema = Joi.object({
  metric: Joi.string().min(2).max(64).required(),
  value: Joi.number().required(),
  notes: Joi.string().optional()
});

export const trackProgress = async (req: any, res: Response) => {
  try {
    const { error } = trackSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }
    const userId = req.user.id;
    const { metric, value, notes } = req.body;
    const record = await prisma.progressTracking.create({ data: { userId, metric, value, notes } });
    res.status(201).json({ success: true, data: record });
  } catch (e) {
    console.error('Track progress error', e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getProgressHistory = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { metric } = req.query;
    const where: any = { userId };
    if (metric) where.metric = metric;
    const history = await prisma.progressTracking.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 200
    });
    res.json({ success: true, data: history });
  } catch (e) {
    console.error('Get progress history error', e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
