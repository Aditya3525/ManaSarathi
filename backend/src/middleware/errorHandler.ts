import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { createRequestLogger } from '../utils/logger';
import {
  AppError,
  InternalServerError,
  ValidationError,
  isOperationalError,
  createErrorResponse,
} from '../shared/errors/AppError';

type NormalizedError = {
  statusCode: number;
  message: string;
  code: string;
};

const isPrismaDatabaseUnavailableError = (err: any): boolean => {
  if (!err) {
    return false;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const code = typeof err?.code === 'string' ? err.code : '';
  const name = typeof err?.name === 'string' ? err.name : '';
  const message = typeof err?.message === 'string' ? err.message : '';

  if (code === 'P1001' || code === 'P1002' || code === 'P1008') {
    return true;
  }

  if (name === 'PrismaClientInitializationError') {
    return true;
  }

  return /can't reach database server|database server at .* timed out/i.test(message);
};

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const normalizeError = (err: any): NormalizedError => {
  if (isPrismaDatabaseUnavailableError(err)) {
    return {
      statusCode: 503,
      message: 'Database is temporarily unavailable. Please try again in a minute.',
      code: 'DATABASE_UNAVAILABLE',
    };
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      code: err.constructor.name,
    };
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((error) => {
      const path = error.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(error.message);
    });
    return {
      statusCode: 422,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
    };
  }

  const statusCode = err?.statusCode ?? 500;
  const code = typeof err?.code === 'string' ? err.code : err?.name ?? 'INTERNAL_ERROR';
  let message = err?.message ?? 'Internal Server Error';

  if (err?.code === 'P2002') {
    return { statusCode: 409, message: 'Duplicate field value entered', code: 'P2002' };
  }
  if (err?.code === 'P2025') {
    return { statusCode: 404, message: 'Record not found', code: 'P2025' };
  }
  if (err?.code === 'P2014') {
    return { statusCode: 400, message: 'Invalid ID', code: 'P2014' };
  }
  if (err?.code === 'P2003') {
    return { statusCode: 400, message: 'Invalid input data', code: 'P2003' };
  }
  if (err?.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token', code: 'AUTH_INVALID_TOKEN' };
  }
  if (err?.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token expired', code: 'AUTH_TOKEN_EXPIRED' };
  }
  if (err?.name === 'ValidationError') {
    const validationMessage = Object.values(err.errors).map((val: any) => val.message).join(', ');
    return { statusCode: 400, message: validationMessage, code: 'VALIDATION_ERROR' };
  }

  return { statusCode, message, code };
};

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId);

  log.error({ err }, 'Unhandled application error');

  const { statusCode, message, code } = normalizeError(err);

  // Special handling for ValidationError to include field-specific errors
  if (err instanceof ValidationError) {
    res.status(statusCode).json({
      success: false,
      error: message,
      errors: err.errors,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: err?.stack })
    });
    return;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err?.stack })
  });
};
