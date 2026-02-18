import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// ─── Helper: extract therapist JWT from Authorization header (or session fallback) ───
function extractTherapistToken(req: any): string | null {
    // 1. Authorization header (cross-domain compatible)
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    // 2. Session fallback (same-origin / dev)
    return (req.session as any)?.therapistToken || null;
}

// ─── Middleware: requireTherapist ─────────────────────────────────────────────
export const requireTherapist = async (req: any, res: any, next: any) => {
    try {
        const token = extractTherapistToken(req);
        if (!token) {
            return res.status(401).json({ error: 'Therapist authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

        const therapist = await prisma.therapist.findFirst({
            where: { userId: decoded.userId },
            include: { user: { select: { id: true, email: true, name: true } } }
        });

        if (!therapist || !therapist.isActive) {
            return res.status(401).json({ error: 'Therapist account not found or inactive' });
        }

        req.therapist = therapist;
        req.user = therapist.user;
        next();
    } catch (error) {
        console.error('Therapist auth middleware error:', error);
        res.status(401).json({ error: 'Therapist authentication required' });
    }
};

// ─── POST /login ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        if (!user.password) {
            return res.status(401).json({ error: 'Invalid credentials — no password set on this account' });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check that user is linked to a Therapist record
        const therapist = await prisma.therapist.findFirst({
            where: { userId: user.id }
        });

        if (!therapist) {
            return res.status(403).json({ error: 'No therapist profile linked to this account' });
        }

        if (!therapist.isActive) {
            return res.status(403).json({ error: 'Your therapist account is currently inactive. Contact administrator.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, therapistId: therapist.id, email: user.email },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        // Return JWT token in response body (cross-domain compatible)
        console.log('Therapist login success:', user.email);
        const { password: _, ...userData } = user as any;
        res.json({
            ...userData,
            role: 'Therapist',
            therapistId: therapist.id,
            therapistName: therapist.name,
            token  // <-- client stores this and sends via Authorization header
        });
    } catch (error) {
        console.error('Therapist login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /logout ────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    // Token-based auth: client just discards the token.
    // Destroy session too if present (dev / same-origin fallback).
    if (req.session) {
        req.session.destroy(() => {});
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
});

// ─── GET /session ────────────────────────────────────────────────────────────
router.get('/session', async (req, res) => {
    try {
        const token = extractTherapistToken(req);
        if (!token) {
            return res.status(401).json({ error: 'No therapist session' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

        const therapist = await prisma.therapist.findFirst({
            where: { userId: decoded.userId },
            include: {
                user: { select: { id: true, email: true, name: true, profilePhoto: true } },
                _count: { select: { bookings: true } }
            }
        });

        if (!therapist) {
            return res.status(401).json({ error: 'Invalid therapist session' });
        }

        res.json({
            id: therapist.user?.id,
            email: therapist.user?.email,
            name: therapist.user?.name,
            role: 'Therapist',
            therapistId: therapist.id,
            therapistName: therapist.name,
            profilePhoto: therapist.user?.profilePhoto
        });
    } catch (error) {
        console.error('Therapist session check error:', error);
        res.status(401).json({ error: 'Invalid therapist session' });
    }
});

// ─── GET /profile ────────────────────────────────────────────────────────────
router.get('/profile', requireTherapist, async (req: any, res) => {
    try {
        const therapist = await prisma.therapist.findUnique({
            where: { id: req.therapist.id },
            include: {
                user: { select: { id: true, email: true, name: true, profilePhoto: true } }
            }
        });

        if (!therapist) {
            return res.status(404).json({ error: 'Therapist not found' });
        }

        res.json({ success: true, data: therapist });
    } catch (error) {
        console.error('Get therapist profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// ─── PUT /profile ────────────────────────────────────────────────────────────
router.put('/profile', requireTherapist, async (req: any, res) => {
    try {
        const {
            name, credential, title, bio, specialtiesJson,
            email, phone, website, street, city, state, zipCode, country,
            acceptsInsurance, insurances, sessionFee, offersSliding,
            availabilityJson, profileImageUrl, yearsExperience, languages
        } = req.body;

        const updated = await prisma.therapist.update({
            where: { id: req.therapist.id },
            data: {
                ...(name !== undefined && { name }),
                ...(credential !== undefined && { credential }),
                ...(title !== undefined && { title }),
                ...(bio !== undefined && { bio }),
                ...(specialtiesJson !== undefined && { specialtiesJson }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(website !== undefined && { website }),
                ...(street !== undefined && { street }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
                ...(zipCode !== undefined && { zipCode }),
                ...(country !== undefined && { country }),
                ...(acceptsInsurance !== undefined && { acceptsInsurance }),
                ...(insurances !== undefined && { insurances }),
                ...(sessionFee !== undefined && { sessionFee }),
                ...(offersSliding !== undefined && { offersSliding }),
                ...(availabilityJson !== undefined && { availabilityJson }),
                ...(profileImageUrl !== undefined && { profileImageUrl }),
                ...(yearsExperience !== undefined && { yearsExperience }),
                ...(languages !== undefined && { languages }),
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update therapist profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ─── GET /bookings ───────────────────────────────────────────────────────────
router.get('/bookings', requireTherapist, async (req: any, res) => {
    try {
        const { status } = req.query;

        const where: any = { therapistId: req.therapist.id };
        if (status && ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status as string)) {
            where.status = status;
        }

        const bookings = await prisma.therapistBooking.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, email: true, profilePhoto: true } }
            }
        });

        res.json({ success: true, data: bookings });
    } catch (error) {
        console.error('Get therapist bookings error:', error);
        res.status(500).json({ error: 'Failed to get bookings' });
    }
});

// ─── PUT /bookings/:id/status ────────────────────────────────────────────────
router.put('/bookings/:id/status', requireTherapist, async (req: any, res) => {
    try {
        const { id } = req.params;
        const { status, therapistNotes } = req.body;

        if (!['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be CONFIRMED, CANCELLED, or COMPLETED' });
        }

        // Verify the booking belongs to this therapist
        const booking = await prisma.therapistBooking.findFirst({
            where: { id, therapistId: req.therapist.id }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const updated = await prisma.therapistBooking.update({
            where: { id },
            data: {
                status,
                ...(therapistNotes !== undefined && { therapistNotes }),
                processedBy: req.therapist.name,
                processedAt: new Date()
            },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// ─── GET /stats ──────────────────────────────────────────────────────────────
router.get('/stats', requireTherapist, async (req: any, res) => {
    try {
        const therapistId = req.therapist.id;

        const [pending, confirmed, completed, total] = await Promise.all([
            prisma.therapistBooking.count({ where: { therapistId, status: 'PENDING' } }),
            prisma.therapistBooking.count({ where: { therapistId, status: 'CONFIRMED' } }),
            prisma.therapistBooking.count({ where: { therapistId, status: 'COMPLETED' } }),
            prisma.therapistBooking.count({ where: { therapistId } }),
        ]);

        // Unique clients
        const uniqueClients = await prisma.therapistBooking.groupBy({
            by: ['userId'],
            where: { therapistId }
        });

        res.json({
            success: true,
            data: {
                pending,
                confirmed,
                completed,
                total,
                uniqueClients: uniqueClients.length
            }
        });
    } catch (error) {
        console.error('Get therapist stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;
