import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/auth';
import { logger } from '../utils/logger';

interface DecodedToken {
  id: string;
  iat?: number;
  exp?: number;
}

const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh if < 5 mins remaining

/**
 * JWT Auto-Refresh Middleware
 * 
 * Automatically refreshes JWT tokens when they are close to expiration
 * without requiring user interaction. Adds new token to response headers.
 */
export const jwtAutoRefresh: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const secret = getJwtSecret();

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.payload || typeof decoded.payload === 'string') {
      return next();
    }

    const { exp, iat } = decoded.payload as DecodedToken;
    if (!exp || !iat) {
      return next();
    }

    const now = Date.now() / 1000;
    const expiresIn = (exp - now) * 1000;

    // Refresh if token expires in less than 5 minutes
    if (expiresIn < TOKEN_REFRESH_THRESHOLD_MS) {
      try {
        // Verify token is still valid before refreshing
        jwt.verify(token, secret);

        const userId = (decoded.payload as DecodedToken).id;
        const newToken = jwt.sign(
          { id: userId },
          secret,
          { expiresIn: '7d' }
        );

        res.setHeader('X-New-Token', newToken);
        (req as any).newToken = newToken;

        logger.debug(
          { userId, expiresIn: Math.round(expiresIn) },
          'JWT token auto-refreshed'
        );
      } catch (error) {
        logger.warn({ error }, 'Failed to refresh JWT token');
        // Continue with original token
      }
    }

    next();
  } catch (error) {
    logger.error({ error }, 'JWT auto-refresh middleware error');
    next();
  }
};

/**
 * Middleware to extract refreshed token from response if available
 */
export const exposeRefreshedToken = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).newToken) {
    res.json = ((json) => (data: any) => {
      const response = json.call(res, data);
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        data.newToken = (req as any).newToken;
      }
      return response;
    })(res.json);
  }
  next();
};
