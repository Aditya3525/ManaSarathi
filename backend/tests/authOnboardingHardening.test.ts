import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../src/config/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

import { register, login } from '../src/controllers/authController';
import { completeOnboarding } from '../src/controllers/userController';

const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  return res;
};

describe('Auth and Onboarding Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('register creates local users as verified and returns token for immediate login', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'u1',
      email: 'new.user@example.com',
      name: 'New User',
      firstName: 'New',
      password: 'hashed-password',
      isEmailVerified: true,
    });

    const req: any = {
      body: {
        name: 'New User',
        email: 'new.user@example.com',
        password: 'Strong@123',
      },
    };
    const res = createMockResponse();

    await register(req, res);

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    const createPayload = prismaMock.user.create.mock.calls[0][0];
    expect(createPayload.data.isEmailVerified).toBe(true);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({
            email: 'new.user@example.com',
            isEmailVerified: true,
          }),
        }),
      })
    );
  });

  it('login no longer blocks based on email verification state', async () => {
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('Strong@123', 10);

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u2',
      email: 'pending@example.com',
      password: hashedPassword,
      isEmailVerified: false,
    });

    const req: any = {
      body: { email: 'pending@example.com', password: 'Strong@123' },
    };
    const res = createMockResponse();

    await login(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({
            email: 'pending@example.com',
          }),
        }),
      })
    );
  });

  it('login returns generic invalid-credentials response for user lookup failures', async () => {
    const expectedPayload = {
      success: false,
      error: 'Invalid email or password.',
      suggestion: 'check_credentials',
      message: 'Please check your credentials and try again.',
    };

    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const unknownReq: any = {
      body: { email: 'missing@example.com', password: 'Strong@123' },
    };
    const unknownRes = createMockResponse();

    await login(unknownReq, unknownRes);

    expect(unknownRes.status).toHaveBeenCalledWith(401);
    expect(unknownRes.json).toHaveBeenCalledWith(expectedPayload);

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u4',
      email: 'oauth-only@example.com',
      password: null,
      isEmailVerified: true,
    });

    const passwordlessReq: any = {
      body: { email: 'oauth-only@example.com', password: 'Strong@123' },
    };
    const passwordlessRes = createMockResponse();

    await login(passwordlessReq, passwordlessRes);

    expect(passwordlessRes.status).toHaveBeenCalledWith(401);
    expect(passwordlessRes.json).toHaveBeenCalledWith(expectedPayload);

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('Strong@123', 10);

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u5',
      email: 'valid@example.com',
      password: hashedPassword,
      isEmailVerified: true,
    });

    const wrongPasswordReq: any = {
      body: { email: 'valid@example.com', password: 'Wrong@123' },
    };
    const wrongPasswordRes = createMockResponse();

    await login(wrongPasswordReq, wrongPasswordRes);

    expect(wrongPasswordRes.status).toHaveBeenCalledWith(401);
    expect(wrongPasswordRes.json).toHaveBeenCalledWith(expectedPayload);
  });

  it('completeOnboarding rejects payloads missing firstName', async () => {
    const req: any = {
      user: { id: 'u3' },
      body: {
        approach: 'hybrid',
        lastName: 'Three',
        region: 'India',
        dataConsent: true,
      },
    };
    const res = createMockResponse();

    await completeOnboarding(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('completeOnboarding persists consent flags from onboarding payload', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u3',
      password: 'existing-password-hash',
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 'u3',
      name: 'User Three',
      firstName: 'User',
      lastName: 'Three',
      email: 'user3@example.com',
      isOnboarded: true,
      approach: 'hybrid',
      birthday: null,
      gender: null,
      region: 'India',
      language: 'en',
      emergencyContact: null,
      emergencyPhone: null,
      dataConsent: true,
      clinicianSharing: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req: any = {
      user: { id: 'u3' },
      body: {
        approach: 'hybrid',
        firstName: 'User',
        lastName: 'Three',
        region: 'India',
        dataConsent: true,
        clinicianSharing: true,
      },
    };
    const res = createMockResponse();

    await completeOnboarding(req, res);

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    const updatePayload = prismaMock.user.update.mock.calls[0][0];
    expect(updatePayload.data.dataConsent).toBe(true);
    expect(updatePayload.data.clinicianSharing).toBe(true);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });
});
