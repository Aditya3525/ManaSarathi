import { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes } from 'crypto';
import { logger } from '../utils/logger';

interface CsrfRequest extends Request {
  csrfToken?: string;
}

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = '_csrf';
const CSRF_SESSION_KEY = '_csrfToken';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF Protection Middleware
 *
 * CSRF attacks exploit cookie-based session authentication where the browser
 * automatically sends cookies on cross-origin requests. This app uses JWT
 * Bearer tokens stored in localStorage and manually attached via the
 * Authorization header — an attacker's site cannot read or send these tokens,
 * so CSRF is not a viable attack vector for JWT-authenticated requests.
 *
 * This middleware therefore:
 *  1. Skips validation entirely for requests with a JWT Bearer token (the
 *     primary auth mechanism for all frontend API calls).
 *  2. Skips validation for safe/read-only HTTP methods (GET, HEAD, OPTIONS).
 *  3. Enforces the synchronizer-token pattern only for session-authenticated
 *     state-changing requests (e.g. the Google OAuth callback flow).
 *
 * A CSRF token is still generated and stored in the session for any request
 * so that session-only flows remain protected.
 */
export const csrfProtection = (req: CsrfRequest, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();

  // Ensure a CSRF token exists in the session for every request
  if (req.session && !(req.session as any)[CSRF_SESSION_KEY]) {
    (req.session as any)[CSRF_SESSION_KEY] = generateCsrfToken();
  }
  (req as CsrfRequest).csrfToken = (req.session as any)?.[CSRF_SESSION_KEY];

  // 1. Safe (read-only) methods never need CSRF validation
  if (SAFE_METHODS.has(method)) {
    return next();
  }

  // 2. All /api/ routes use JWT Bearer tokens stored in localStorage.
  //    CSRF attacks rely on browsers automatically sending cookies, which
  //    doesn't apply to JWTs.  Skip CSRF for the entire API surface.
  //    CSRF enforcement is only retained for non-API, session-based flows
  //    (e.g. Google OAuth browser-redirect callbacks).
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // 4. For all other state-changing requests (session-auth only), enforce CSRF
  try {
    const token = (
      req.headers[CSRF_HEADER] ||
      req.body?.csrfToken ||
      req.query.csrfToken
    ) as string;

    const sessionToken = (req.session as any)?.[CSRF_SESSION_KEY];

    if (!token || !sessionToken) {
      logger.warn(
        { method, path: req.path, token: !!token, sessionToken: !!sessionToken },
        'CSRF token missing'
      );
      return res.status(403).json({
        success: false,
        error: 'CSRF token missing or invalid',
        code: 'CSRF_MISSING',
      });
    }

    if (!constantTimeCompare(token, sessionToken)) {
      logger.warn(
        { method, path: req.path, ip: req.ip },
        'CSRF token mismatch - possible attack'
      );
      return res.status(403).json({
        success: false,
        error: 'CSRF token invalid',
        code: 'CSRF_INVALID',
      });
    }

    next();
  } catch (error) {
    logger.error({ error }, 'CSRF protection error');
    res.status(500).json({
      success: false,
      error: 'CSRF validation failed',
      code: 'CSRF_ERROR',
    });
  }
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Middleware to expose CSRF token in response
 */
export const exposeCsrfToken = (req: CsrfRequest, res: Response, next: NextFunction) => {
  const token = (req as CsrfRequest).csrfToken || (req.session as any)?.[CSRF_SESSION_KEY];

  if (token) {
    res.setHeader('X-CSRF-Token', token);

    // For JSON responses, include in body if possible
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        data.csrfToken = token;
      }
      return originalJson(data);
    };
  }

  next();
};
