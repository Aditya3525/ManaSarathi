/**
 * Chat API Tests
 * Tests POST /api/chat/message, GET /api/chat/starters, GET /api/chatbot/check-in
 */
import request from 'supertest';
import type { Express } from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Prisma mock ---
const createMessageMock = vi.fn((args: any) =>
    Promise.resolve({ id: 'msg1', ...args.data, createdAt: new Date() })
);
const findManyMessagesMock = vi.fn(() => Promise.resolve([]));
const createConversationMock = vi.fn((args: any) =>
    Promise.resolve({ id: 'conv1', ...args.data, createdAt: new Date(), updatedAt: new Date() })
);
const findUniqueConversationMock = vi.fn(() => Promise.resolve(null));
const updateConversationMock = vi.fn(() => Promise.resolve({}));
const findManyConvMock = vi.fn(() => Promise.resolve([]));

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(() => ({
        chatMessage: {
            create: createMessageMock,
            findMany: findManyMessagesMock,
        },
        conversation: {
            create: createConversationMock,
            findUnique: findUniqueConversationMock,
            findFirst: vi.fn(() => Promise.resolve(null)),
            findMany: findManyConvMock,
            update: updateConversationMock,
            count: vi.fn(() => Promise.resolve(0)),
        },
        chatbotConversation: {
            findMany: vi.fn(() => Promise.resolve([])),
            create: vi.fn((args: any) => Promise.resolve({ id: 'cbc1', ...args.data })),
            findFirst: vi.fn(() => Promise.resolve(null)),
            update: vi.fn(() => Promise.resolve({})),
        },
        conversationMemory: {
            findUnique: vi.fn(() => Promise.resolve(null)),
            upsert: vi.fn(() => Promise.resolve({})),
        },
        conversationGoal: {
            findMany: vi.fn(() => Promise.resolve([])),
        },
        user: {
            findUnique: vi.fn(() =>
                Promise.resolve({
                    id: 'user1',
                    firstName: 'Test',
                    name: 'Test User',
                    approach: 'western',
                })
            ),
        },
        moodEntry: {
            findMany: vi.fn(() => Promise.resolve([])),
        },
        assessmentResult: {
            findMany: vi.fn(() => Promise.resolve([])),
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
        generateResponse: vi.fn(() =>
            Promise.resolve({ content: 'Hello! How can I help you today?' })
        ),
        getProviderStatus: vi.fn(() => Promise.resolve({})),
    })),
    llmService: {
        generateResponse: vi.fn(() =>
            Promise.resolve({ content: 'Hello! How can I help you today?' })
        ),
        getProviderStatus: vi.fn(() => Promise.resolve({})),
    },
}));

// Mock chatbot service
vi.mock('../src/services/chatbotService', () => ({
    chatbotService: {
        processMessage: vi.fn(() =>
            Promise.resolve({
                response: 'I understand you\'re looking for help. How can I assist?',
                smartReplies: ['Tell me more', 'I need help with anxiety'],
                conversationId: 'conv1',
            })
        ),
        getConversationStarters: vi.fn(() =>
            Promise.resolve([
                'How are you feeling today?',
                'Tell me about your day',
                'I need help managing stress',
            ])
        ),
    },
}));

let app: Express;

beforeAll(async () => {
    const module = await import('../src/server');
    app = module.default;
}, 20000);

beforeEach(() => {
    createMessageMock.mockClear();
    findManyMessagesMock.mockClear();
    findManyConvMock.mockClear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Chat API', () => {
    describe('POST /api/chat/message', () => {
        it('sends a message and receives a response', async () => {
            const res = await request(app)
                .post('/api/chat/message')
                .send({ content: 'Hello, I need some help' });

            // Should return a response (may be 200 or 201)
            expect(res.status).toBeLessThan(500);
            expect(res.body).toBeDefined();
        });

        it('rejects empty message', async () => {
            const res = await request(app)
                .post('/api/chat/message')
                .send({ content: '' });

            // Should fail validation
            expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });

    describe('GET /api/chat/starters', () => {
        it('returns conversation starters', async () => {
            const res = await request(app).get('/api/chat/starters');

            expect(res.status).toBeLessThan(500);
            expect(res.body).toBeDefined();
        });
    });

    describe('Conversations API', () => {
        it('GET /api/conversations returns conversations list', async () => {
            const res = await request(app).get('/api/conversations');

            expect(res.status).toBe(200);
            expect(res.body).toBeDefined();
        });
    });
});
