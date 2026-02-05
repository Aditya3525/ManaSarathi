import request from 'supertest';
import type { Express } from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const queryRawMock = vi.fn<[], Promise<Array<Record<string, unknown>>>>(() => Promise.resolve([{ ok: 1 }]));
const getProviderStatusMock = vi.fn<[], Promise<Record<string, { available: boolean; name: string; cooldownActive: boolean; cooldownExpiresAt: string | null }>>>(() =>
  Promise.resolve({
    gemini: { available: true, name: 'Gemini', cooldownActive: false, cooldownExpiresAt: null }
  })
);

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $queryRaw: queryRawMock
  }))
}));

vi.mock('../src/services/llmProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/llmProvider')>();
  return {
    ...actual,
    llmService: {
      ...actual.llmService,
      getProviderStatus: getProviderStatusMock
    }
  };
});

let app: Express;

beforeAll(async () => {
  const module = await import('../src/server');
  app = module.default;
});

beforeEach(() => {
  queryRawMock.mockClear();
  getProviderStatusMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/health/ready', () => {
  it('returns ready when dependencies are healthy', async () => {
    queryRawMock.mockResolvedValueOnce([{ ok: 1 }]);
    getProviderStatusMock.mockResolvedValueOnce({
      gemini: { available: true, name: 'Gemini', cooldownActive: false, cooldownExpiresAt: null },
      ollama: { available: true, name: 'Ollama', cooldownActive: false, cooldownExpiresAt: null }
    });

    const response = await request(app).get('/api/health/ready');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
    expect(response.body.checks.database.status).toBe('pass');
    expect(response.body.checks.providers.gemini.available).toBe(true);
    expect(typeof response.body.requestId).toBe('string');
  });

  it('returns degraded when database check fails', async () => {
    queryRawMock.mockRejectedValueOnce(new Error('database offline'));
    getProviderStatusMock.mockResolvedValueOnce({
      gemini: { available: true, name: 'Gemini', cooldownActive: false, cooldownExpiresAt: null }
    });

    const response = await request(app).get('/api/health/ready');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.database.status).toBe('fail');
    expect(response.body.checks.database.error).toContain('database offline');
  });
});

