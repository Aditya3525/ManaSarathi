import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  supportTicketCreateMock,
  supportTicketFindManyMock,
  supportTicketFindFirstMock,
  supportTicketUpdateMock,
  userFindUniqueMock,
  prismaMock,
} = vi.hoisted(() => {
  const supportTicketCreateMock = vi.fn();
  const supportTicketFindManyMock = vi.fn();
  const supportTicketFindFirstMock = vi.fn();
  const supportTicketUpdateMock = vi.fn();
  const userFindUniqueMock = vi.fn();

  const prismaMock = {
    supportTicket: {
      create: supportTicketCreateMock,
      findMany: supportTicketFindManyMock,
      findFirst: supportTicketFindFirstMock,
      update: supportTicketUpdateMock,
    },
    user: {
      findUnique: userFindUniqueMock,
    },
  };

  return {
    supportTicketCreateMock,
    supportTicketFindManyMock,
    supportTicketFindFirstMock,
    supportTicketUpdateMock,
    userFindUniqueMock,
    prismaMock,
  };
});

vi.mock('../src/config/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

vi.mock('../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { id: 'user1', email: 'user@example.com' };
      next();
      return;
    }
    res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  },
}));

import supportRoutes from '../src/routes/support';
import { errorHandler } from '../src/middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/support', supportRoutes);
app.use(errorHandler);

describe('Support API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    userFindUniqueMock.mockResolvedValue({
      id: 'user1',
      email: 'user@example.com',
      name: 'Test User',
    });

    supportTicketCreateMock.mockResolvedValue({
      id: 'ticket-1',
      subject: 'Need support with profile',
      category: 'GENERAL',
      priority: 'MEDIUM',
      status: 'OPEN',
      createdAt: new Date(),
    });

    supportTicketFindManyMock.mockResolvedValue([
      {
        id: 'ticket-1',
        subject: 'Need support with profile',
        message: 'Unable to update profile information',
        category: 'GENERAL',
        priority: 'MEDIUM',
        status: 'OPEN',
        response: null,
        respondedBy: null,
        respondedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    supportTicketFindFirstMock.mockResolvedValue({
      id: 'ticket-1',
      userId: 'user1',
      status: 'OPEN',
    });

    supportTicketUpdateMock.mockResolvedValue({
      id: 'ticket-1',
      status: 'CLOSED',
      closedAt: new Date(),
    });
  });

  it('creates a support ticket for an authenticated user', async () => {
    const response = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', 'Bearer valid-token')
      .send({
        subject: 'Need support with profile',
        message: 'Unable to update profile information',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.ticket.id).toBe('ticket-1');
  });

  it('returns support tickets for the authenticated user', async () => {
    const response = await request(app)
      .get('/api/support/tickets')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.tickets)).toBe(true);
  });

  it('returns 404 when trying to access another user\'s ticket', async () => {
    supportTicketFindFirstMock.mockResolvedValueOnce(null);

    const response = await request(app)
      .get('/api/support/tickets/ticket-other')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('returns 401 when no auth token is provided', async () => {
    const response = await request(app).get('/api/support/tickets');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
