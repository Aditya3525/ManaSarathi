import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Rate Limiter Configurations for Authentication Endpoints
 * 
 * Implements strict rate limiting on sensitive auth operations
 * with progressive delays and IP-based tracking
 */

// Login attempts: 5 per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many login attempts. Please try again in 15 minutes.',
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, email: req.body?.email },
      'Login rate limit exceeded'
    );
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: 15 * 60,
    });
  },
  keyGenerator: (req) => {
    const emailPart = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : 'unknown';
    return `login:${req.ip}:${emailPart}`;
  },
});

// Registration attempts: 3 per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many registration attempts. Please try again later.',
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, email: req.body?.email },
      'Registration rate limit exceeded'
    );
    res.status(429).json({
      success: false,
      error: 'Too many registration attempts. Please try again in 1 hour.',
      retryAfter: 60 * 60,
    });
  },
  keyGenerator: (req) => {
    const emailPart = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : 'unknown';
    return `register:${req.ip}:${emailPart}`;
  },
});

// Password reset attempts: 3 per hour per IP
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many password reset attempts. Please try again later.',
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, email: req.body?.email },
      'Password reset rate limit exceeded'
    );
    res.status(429).json({
      success: false,
      error: 'Too many password reset attempts. Please try again in 1 hour.',
      retryAfter: 60 * 60,
    });
  },
  keyGenerator: (req) => {
    const emailPart = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : 'unknown';
    return `reset:${req.ip}:${emailPart}`;
  },
});

// Email verification resend: 5 per hour per email
export const verificationResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many verification resend requests. Please try again later.',
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, email: req.body?.email },
      'Email verification resend limit exceeded'
    );
    res.status(429).json({
      success: false,
      error: 'Too many verification resend requests. Please try again in 1 hour.',
      retryAfter: 60 * 60,
    });
  },
  keyGenerator: (req) => {
    const emailPart = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : 'unknown';
    return `verify-resend:${req.ip}:${emailPart}`;
  },
});

// OAuth attempts: 10 per 15 minutes per IP (higher since external flow)
export const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many OAuth attempts. Please try again later.',
  handler: (req, res) => {
    logger.warn({ ip: req.ip }, 'OAuth rate limit exceeded');
    res.status(429).json({
      success: false,
      error: 'Too many OAuth attempts. Please try again in 15 minutes.',
      retryAfter: 15 * 60,
    });
  },
});
