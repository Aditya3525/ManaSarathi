import jwt from 'jsonwebtoken';

import prisma from '../../config/database';
import { getJwtSecret } from '../../config/auth';

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@example.com,admin@mentalwellbeing.ai')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const JWT_SECRET = getJwtSecret();

// Shared admin authentication middleware used by admin route modules.
export const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    // Try Authorization header first (cross-domain), then fall back to session
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : (req.session as any)?.adminToken;

    if (!token) {
      return res.status(401).json({ error: 'Admin authentication required', details: 'No token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const admin = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!admin || !ADMIN_EMAILS.includes(admin.email)) {
      return res.status(401).json({ error: 'Admin authentication required', details: 'Invalid admin credentials' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'Admin authentication required',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
