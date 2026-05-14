import type { NextFunction, Request, Response } from 'express';

export const noStoreApiResponses = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  next();
};
