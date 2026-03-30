import express from 'express';
import Joi from 'joi';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  resetStores,
} = vi.hoisted(() => {
  const practicesStore: any[] = [];
  const contentStore: any[] = [];

  const normalizeWhere = (where: any, item: any): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object' && 'in' in (value as any)) {
        return (value as any).in.includes(item[key]);
      }
      return item[key] === value;
    });
  };

  const prismaMock = {
    practice: {
      findMany: vi.fn(async (args?: any) => {
        const where = args?.where;
        return practicesStore.filter((item) => normalizeWhere(where, item));
      }),
      findFirst: vi.fn(async (args?: any) => {
        const where = args?.where;
        return practicesStore.find((item) => normalizeWhere(where, item)) ?? null;
      }),
      findUnique: vi.fn(async (args?: any) => {
        const id = args?.where?.id;
        return practicesStore.find((item) => item.id === id) ?? null;
      }),
      create: vi.fn(async (args: any) => {
        const record = {
          id: `practice-${practicesStore.length + 1}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...args.data,
        };
        practicesStore.unshift(record);
        return record;
      }),
      update: vi.fn(async (args: any) => {
        const idx = practicesStore.findIndex((item) => item.id === args.where.id);
        if (idx < 0) throw new Error('Practice not found');
        practicesStore[idx] = { ...practicesStore[idx], ...args.data, updatedAt: new Date().toISOString() };
        return practicesStore[idx];
      }),
      delete: vi.fn(async (args: any) => {
        const idx = practicesStore.findIndex((item) => item.id === args.where.id);
        if (idx >= 0) practicesStore.splice(idx, 1);
        return { id: args.where.id };
      }),
    },
    content: {
      findMany: vi.fn(async (args?: any) => {
        const where = args?.where;
        return contentStore.filter((item) => normalizeWhere(where, item));
      }),
      findFirst: vi.fn(async (args?: any) => {
        const where = args?.where;
        return contentStore.find((item) => normalizeWhere(where, item)) ?? null;
      }),
      findUnique: vi.fn(async (args?: any) => {
        const id = args?.where?.id;
        return contentStore.find((item) => item.id === id) ?? null;
      }),
      create: vi.fn(async (args: any) => {
        const record = {
          id: `content-${contentStore.length + 1}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...args.data,
        };
        contentStore.unshift(record);
        return record;
      }),
      update: vi.fn(async (args: any) => {
        const idx = contentStore.findIndex((item) => item.id === args.where.id);
        if (idx < 0) throw new Error('Content not found');
        contentStore[idx] = { ...contentStore[idx], ...args.data, updatedAt: new Date().toISOString() };
        return contentStore[idx];
      }),
      delete: vi.fn(async (args: any) => {
        const idx = contentStore.findIndex((item) => item.id === args.where.id);
        if (idx >= 0) contentStore.splice(idx, 1);
        return { id: args.where.id };
      }),
    },
  };

  const resetStores = () => {
    practicesStore.splice(0, practicesStore.length);
    contentStore.splice(0, contentStore.length);
  };

  return { prismaMock, resetStores };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaMock),
}));

import practicesRoutes from '../src/routes/practices';
import publicContentRoutes from '../src/routes/publicContent';
import { createPracticeContentRoutes } from '../src/routes/admin/practiceContentRoutes';

const requireAdmin = (_req: any, _res: any, next: any) => next();

const contentValidationSchema = Joi.object({
  title: Joi.string().required(),
  type: Joi.string().required(),
  category: Joi.string().required(),
  approach: Joi.string().required(),
  content: Joi.string().allow(''),
  description: Joi.string().required(),
  thumbnailUrl: Joi.string().uri().allow('', null).optional(),
  youtubeUrl: Joi.string().allow('', null).optional(),
  duration: Joi.number().allow(null).optional(),
  difficulty: Joi.string().allow('', null).optional(),
  tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  isPublished: Joi.boolean().optional(),
  contentType: Joi.string().allow('', null).optional(),
  intensityLevel: Joi.string().valid('low', 'medium', 'high', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED').allow('', null).optional(),
  focusAreas: Joi.array().items(Joi.string()).optional(),
  immediateRelief: Joi.boolean().optional(),
  crisisEligible: Joi.boolean().optional(),
  timeOfDay: Joi.array().items(Joi.string()).optional(),
  environment: Joi.array().items(Joi.string()).optional(),
  culturalContext: Joi.string().allow('', null).optional(),
  hasSubtitles: Joi.boolean().optional(),
  transcript: Joi.string().allow('', null).optional(),
});

const practiceValidationSchema = Joi.object({
  title: Joi.string().required(),
  type: Joi.string().required(),
  duration: Joi.number().required(),
  difficulty: Joi.string().allow('', null).optional(),
  level: Joi.string().allow('', null).optional(),
  approach: Joi.string().required(),
  format: Joi.string().required(),
  description: Joi.string().required(),
  audioUrl: Joi.string().uri().allow('', null).optional(),
  videoUrl: Joi.string().uri().allow('', null).optional(),
  youtubeUrl: Joi.string().allow('', null).optional(),
  thumbnailUrl: Joi.string().uri().allow('', null).optional(),
  tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  isPublished: Joi.boolean().optional(),
  category: Joi.string().allow('', null).optional(),
  intensityLevel: Joi.string().valid('low', 'medium', 'high', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED').allow('', null).optional(),
  focusAreas: Joi.array().items(Joi.string()).optional(),
  immediateRelief: Joi.boolean().optional(),
  crisisEligible: Joi.boolean().optional(),
  requiredEquipment: Joi.array().items(Joi.string()).optional(),
  environment: Joi.array().items(Joi.string()).optional(),
  timeOfDay: Joi.array().items(Joi.string()).optional(),
  sensoryEngagement: Joi.array().items(Joi.string()).optional(),
  steps: Joi.array().items(Joi.object({ step: Joi.number().required(), instruction: Joi.string().required(), duration: Joi.number().optional() })).optional(),
  contraindications: Joi.array().items(Joi.string()).optional(),
});

const app = express();
app.use(express.json());
app.use(
  '/api/admin',
  createPracticeContentRoutes({
    requireAdmin,
    prisma: prismaMock,
    practiceValidationSchema,
    contentValidationSchema,
    youtubeThumbFromId: (id?: string | null) => (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null),
  })
);
app.use('/api/practices', practicesRoutes);
app.use('/api/public-content', publicContentRoutes);
app.use('/api/public/content', publicContentRoutes);

describe('Admin content/practice add + user sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStores();
  });

  it('creates a practice from admin payload and exposes it on public practices', async () => {
    const createRes = await request(app)
      .post('/api/admin/practices')
      .send({
        title: 'Grounding Breath',
        type: 'breathing',
        level: 'Beginner',
        duration: 10,
        approach: 'All',
        format: 'Audio',
        description: 'A calming 10-minute breathing routine',
        audioUrl: 'https://cdn.example.com/audio.mp3',
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        intensityLevel: 'medium',
        tags: ['breathing', 'focus'],
        isPublished: true,
        focusAreas: ['stress'],
        immediateRelief: true,
        crisisEligible: true,
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.difficulty).toBe('Beginner');
    expect(createRes.body.data.intensityLevel).toBe('INTERMEDIATE');

    const publicRes = await request(app).get('/api/practices');
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.success).toBe(true);
    expect(publicRes.body.data.some((item: any) => item.title === 'Grounding Breath')).toBe(true);
  });

  it('creates published content and returns it from both public-content endpoints', async () => {
    const createRes = await request(app)
      .post('/api/admin/content')
      .send({
        title: 'Evening Reset Journal',
        type: 'article',
        category: 'Mindfulness',
        approach: 'all',
        content: 'Write three things you felt today and one kind action for tomorrow.',
        description: 'A short nightly journaling prompt.',
        thumbnailUrl: 'https://cdn.example.com/journal.jpg',
        tags: ['journal', 'reflection'],
        isPublished: true,
        intensityLevel: 'high',
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.intensityLevel).toBe('ADVANCED');

    const publicPrimary = await request(app).get('/api/public-content');
    expect(publicPrimary.status).toBe(200);
    expect(publicPrimary.body.success).toBe(true);
    expect(publicPrimary.body.data.some((item: any) => item.title === 'Evening Reset Journal')).toBe(true);

    const publicAlias = await request(app).get('/api/public/content');
    expect(publicAlias.status).toBe(200);
    expect(publicAlias.body.success).toBe(true);
    expect(publicAlias.body.data.some((item: any) => item.title === 'Evening Reset Journal')).toBe(true);
  });
});
