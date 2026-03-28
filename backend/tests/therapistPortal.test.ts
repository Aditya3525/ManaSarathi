import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  bcryptCompareMock,
  jwtSignMock,
  jwtVerifyMock,
  userFindUniqueMock,
  therapistFindFirstMock,
  therapistFindUniqueMock,
  therapistUpdateMock,
  therapistBookingFindFirstMock,
  therapistBookingFindUniqueMock,
  therapistBookingUpdateManyMock,
  therapistBookingFindManyMock,
  therapistBookingCountMock,
  therapistBookingGroupByMock,
  prismaMock,
} = vi.hoisted(() => {
  const bcryptCompareMock = vi.fn();
  const jwtSignMock = vi.fn();
  const jwtVerifyMock = vi.fn();

  const userFindUniqueMock = vi.fn();
  const therapistFindFirstMock = vi.fn();
  const therapistFindUniqueMock = vi.fn();
  const therapistUpdateMock = vi.fn();
  const therapistBookingFindFirstMock = vi.fn();
  const therapistBookingFindUniqueMock = vi.fn();
  const therapistBookingUpdateManyMock = vi.fn();
  const therapistBookingFindManyMock = vi.fn();
  const therapistBookingCountMock = vi.fn();
  const therapistBookingGroupByMock = vi.fn();

  const prismaMock = {
    user: {
      findUnique: userFindUniqueMock,
    },
    therapist: {
      findFirst: therapistFindFirstMock,
      findUnique: therapistFindUniqueMock,
      update: therapistUpdateMock,
    },
    therapistBooking: {
      findFirst: therapistBookingFindFirstMock,
      findUnique: therapistBookingFindUniqueMock,
      updateMany: therapistBookingUpdateManyMock,
      findMany: therapistBookingFindManyMock,
      count: therapistBookingCountMock,
      groupBy: therapistBookingGroupByMock,
    },
  };

  return {
    bcryptCompareMock,
    jwtSignMock,
    jwtVerifyMock,
    userFindUniqueMock,
    therapistFindFirstMock,
    therapistFindUniqueMock,
    therapistUpdateMock,
    therapistBookingFindFirstMock,
    therapistBookingFindUniqueMock,
    therapistBookingUpdateManyMock,
    therapistBookingFindManyMock,
    therapistBookingCountMock,
    therapistBookingGroupByMock,
    prismaMock,
  };
});

vi.mock('bcryptjs', () => ({
  default: {
    compare: bcryptCompareMock,
  },
  compare: bcryptCompareMock,
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: jwtSignMock,
    verify: jwtVerifyMock,
  },
  sign: jwtSignMock,
  verify: jwtVerifyMock,
}));

vi.mock('../src/config/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

import therapistPortalRoutes from '../src/routes/therapistPortal';

const app = express();
app.use(express.json());
app.use('/api/therapist-portal', therapistPortalRoutes);

describe('Therapist Portal API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    bcryptCompareMock.mockResolvedValue(true);
    jwtSignMock.mockReturnValue('therapist-jwt-token');
    jwtVerifyMock.mockImplementation((token: string) => {
      if (token === 'therapist-jwt-token') {
        return { userId: 'user1', therapistId: 'therapist-1' };
      }
      throw new Error('Invalid token');
    });

    userFindUniqueMock.mockResolvedValue({
      id: 'user1',
      email: 'therapist@example.com',
      name: 'Therapist User',
      password: 'hashed-password',
      profilePhoto: null,
    });

    therapistFindFirstMock.mockResolvedValue({
      id: 'therapist-1',
      userId: 'user1',
      isActive: true,
      name: 'Dr. Test',
      user: {
        id: 'user1',
        email: 'therapist@example.com',
        name: 'Therapist User',
      },
    });

    therapistFindUniqueMock.mockResolvedValue({
      id: 'therapist-1',
      userId: 'user1',
      isActive: true,
      name: 'Dr. Test',
      user: {
        id: 'user1',
        email: 'therapist@example.com',
        name: 'Therapist User',
        profilePhoto: null,
      },
    });

    therapistUpdateMock.mockResolvedValue({ id: 'therapist-1' });

    therapistBookingFindFirstMock.mockResolvedValue({
      id: 'booking-1',
      therapistId: 'therapist-1',
      status: 'PENDING',
    });

    therapistBookingUpdateManyMock.mockResolvedValue({ count: 1 });
    therapistBookingFindUniqueMock.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' });
    therapistBookingFindManyMock.mockResolvedValue([]);
    therapistBookingCountMock.mockResolvedValue(0);
    therapistBookingGroupByMock.mockResolvedValue([]);
  });

  it('logs in therapist and returns auth token', async () => {
    const response = await request(app)
      .post('/api/therapist-portal/login')
      .send({ email: 'therapist@example.com', password: 'secret123' });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('Therapist');
    expect(response.body.token).toBe('therapist-jwt-token');
  });

  it('returns 401 for session check without token', async () => {
    const response = await request(app).get('/api/therapist-portal/session');

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('No therapist session');
  });

  it('returns therapist profile when authenticated', async () => {
    const response = await request(app)
      .get('/api/therapist-portal/profile')
      .set('Authorization', 'Bearer therapist-jwt-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('returns 404 when therapist updates a booking they do not own', async () => {
    therapistBookingFindFirstMock.mockResolvedValueOnce(null);

    const response = await request(app)
      .put('/api/therapist-portal/bookings/booking-other/status')
      .set('Authorization', 'Bearer therapist-jwt-token')
      .send({ status: 'CONFIRMED' });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Booking not found');
  });
});
