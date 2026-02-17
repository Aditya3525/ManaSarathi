import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: User;
}

interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.substring(7);
    // Use the same fallback as generateToken() in authController so tokens can always be verified
    const secret = process.env.JWT_SECRET || 'dev-fallback-secret';

    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid token - user not found.' });
      return;
    }
    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ success: false, error: 'Invalid token.' });
  }
};

export { AuthRequest };
