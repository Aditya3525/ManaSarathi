/**
 * Mood API Tests
 * Tests GET /api/mood, POST /api/mood, DELETE /api/mood/:id, GET /api/mood/stats
 */
import request from 'supertest';
import type { Express } from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Prisma mock ---
const moodEntries = [
    { id: 'mood1', userId: 'user1', mood: 'Good', notes: 'Feeling fine', createdAt: new Date('2026-02-15') },
    { id: 'mood2', userId: 'user1', mood: 'Great', notes: null, createdAt: new Date('2026-02-14') },
    { id: 'mood3', userId: 'user1', mood: 'Good', notes: null, createdAt: new Date('2026-02-13') },
];

const moodFindManyMock = vi.fn(() => Promise.resolve(moodEntries));
const moodCreateMock = vi.fn((args: any) =>
    Promise.resolve({ id: 'mood-new', ...args.data, createdAt: new Date() })
);
const moodFindFirstMock = vi.fn((args: any) => {
    const entry = moodEntries.find((e) => e.id === args.where.id && e.userId === args.where.userId);
    return Promise.resolve(entry || null);
});
const moodDeleteMock = vi.fn(() => Promise.resolve({ id: 'mood1' }));

const prismaMock = {
    moodEntry: {
        findMany: moodFindManyMock,
        create: moodCreateMock,
        findFirst: moodFindFirstMock,
        delete: moodDeleteMock,
        count: vi.fn(() => Promise.resolve(3)),
    },
    $queryRaw: vi.fn(() => Promise.resolve([{ ok: 1 }])),
};

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(() => prismaMock),
}));

vi.mock('../src/config/database', () => ({
    prisma: prismaMock,
    default: prismaMock,
}));

// Mock auth middleware to inject user
vi.mock('../src/middleware/auth', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { id: 'user1', email: 'test@test.com' };
        next();
    },
}));

// Mock LLM services (imported transitively)
vi.mock('../src/services/llmProvider', () => ({
    LLMService: vi.fn(() => ({
        generateResponse: vi.fn(() => Promise.resolve({ content: 'mock' })),
        getProviderStatus: vi.fn(() => Promise.resolve({})),
    })),
    llmService: {
        generateResponse: vi.fn(() => Promise.resolve({ content: 'mock' })),
        getProviderStatus: vi.fn(() => Promise.resolve({})),
    },
}));

let app: Express;

beforeAll(async () => {
    const module = await import('../src/server');
    app = module.default;
}, 20000);

beforeEach(() => {
    moodFindManyMock.mockClear();
    moodCreateMock.mockClear();
    moodFindFirstMock.mockClear();
    moodDeleteMock.mockClear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Mood API', () => {
    describe('GET /api/mood', () => {
        it('returns mood entries for authenticated user', async () => {
            const res = await request(app).get('/api/mood');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    describe('POST /api/mood', () => {
        it('creates a mood entry with valid data', async () => {
            const res = await request(app)
                .post('/api/mood')
                .send({ mood: 'Great', notes: 'Had a wonderful day' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });

        it('rejects mood entry with missing mood field', async () => {
            const res = await request(app)
                .post('/api/mood')
                .send({ notes: 'No mood provided' });

            // Should fail validation (400 or 422)
            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.status).toBeLessThan(500);
        });
    });

    describe('DELETE /api/mood/:id', () => {
        it('deletes a mood entry that belongs to the user', async () => {
            moodFindFirstMock.mockResolvedValueOnce(moodEntries[0]);

            const res = await request(app).delete('/api/mood/mood1');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 404 for non-existent mood entry', async () => {
            moodFindFirstMock.mockResolvedValueOnce(null);

            const res = await request(app).delete('/api/mood/nonexistent');

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/mood/stats', () => {
        it('returns mood statistics', async () => {
            const res = await request(app).get('/api/mood/stats');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.distribution).toBeDefined();
            expect(res.body.data.currentStreak).toBeDefined();
            expect(res.body.data.totalEntries).toBeDefined();
        });

        it('accepts custom days parameter', async () => {
            const res = await request(app).get('/api/mood/stats?days=7');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
