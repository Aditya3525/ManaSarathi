/**
 * Dashboard Insights API Tests
 * Tests the AI insights edge case: users without assessments should see placeholder,
 * not stale cached data.
 */
import request from 'supertest';
import type { Express } from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Prisma mock ---
const findUniqueMock = vi.fn(() => Promise.resolve(null));
const findManyMock = vi.fn(() => Promise.resolve([]));
const deleteMany = vi.fn(() => Promise.resolve({ count: 0 }));
const upsertMock = vi.fn(() => Promise.resolve({}));
const countMock = vi.fn(() => Promise.resolve(0));
const findUniqueUserMock = vi.fn(() =>
    Promise.resolve({ id: 'user1', firstName: 'Test', name: 'Test User' })
);

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(() => ({
        dashboardInsights: {
            findUnique: findUniqueMock,
            deleteMany: deleteMany,
            upsert: upsertMock,
        },
        assessmentResult: {
            findMany: findManyMock,
            count: countMock,
        },
        chatbotConversation: {
            findMany: vi.fn(() => Promise.resolve([])),
            count: countMock,
        },
        user: {
            findUnique: findUniqueUserMock,
        },
        assessmentInsight: {
            findUnique: vi.fn(() => Promise.resolve(null)),
        },
        progressTracking: {
            findMany: vi.fn(() => Promise.resolve([])),
        },
        moodEntry: {
            findMany: vi.fn(() => Promise.resolve([])),
            count: vi.fn(() => Promise.resolve(0)),
        },
        userPlanModule: {
            findMany: vi.fn(() => Promise.resolve([])),
            count: vi.fn(() => Promise.resolve(0)),
        },
        $queryRaw: vi.fn(() => Promise.resolve([{ ok: 1 }])),
    })),
}));

vi.mock('../src/config/database', () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    return { prisma, default: prisma };
});

vi.mock('../src/middleware/auth', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { id: 'user1', email: 'test@test.com' };
        next();
    },
}));

vi.mock('../src/services/llmProvider', () => ({
    LLMService: vi.fn(() => ({
        generateResponse: vi.fn(() => Promise.resolve({ content: 'mock insight' })),
        getProviderStatus: vi.fn(() => Promise.resolve({})),
    })),
    llmService: {
        generateResponse: vi.fn(() => Promise.resolve({ content: 'mock insight' })),
        getProviderStatus: vi.fn(() => Promise.resolve({})),
    },
}));

let app: Express;

beforeAll(async () => {
    const module = await import('../src/server');
    app = module.default;
}, 20000);

beforeEach(() => {
    findUniqueMock.mockClear();
    findManyMock.mockClear();
    deleteMany.mockClear();
    countMock.mockClear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Dashboard Insights API', () => {
    describe('GET /api/dashboard/insights', () => {
        it('returns placeholder message when user has no assessments', async () => {
            // No cached insights
            findUniqueMock.mockResolvedValue(null);
            // No assessments
            findManyMock.mockResolvedValue([]);

            const res = await request(app).get('/api/dashboard/insights');

            expect(res.status).toBe(200);
            expect(res.body.aiSummary).toBeDefined();
            // Should contain the placeholder message for new users
            expect(res.body.aiSummary).toContain('assessment');
        });

        it('does not return stale cached insights with empty data', async () => {
            // Simulate stale cache with empty data arrays
            findUniqueMock.mockResolvedValue({
                userId: 'user1',
                insightsData: JSON.stringify({
                    assessments: { scores: [], insights: [], lastDate: null },
                    chatbot: { summaries: [], emotionalStates: [], keyTopics: [], lastDate: null },
                    aiSummary: 'This is stale insight content',
                    generatedAt: new Date('2026-01-01'),
                }),
                expiresAt: new Date('2099-12-31'), // not yet expired
                assessmentCount: 0,
                chatCount: 0,
            });

            // No assessments available
            findManyMock.mockResolvedValue([]);

            const res = await request(app).get('/api/dashboard/insights');

            expect(res.status).toBe(200);
            // Should NOT contain the stale insight content
            expect(res.body.aiSummary).not.toBe('This is stale insight content');
        });
    });
});
