import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BookingStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { getJwtSecret } from '../config/auth';

const router = express.Router();
const JWT_SECRET = getJwtSecret();
const prismaAny = prisma as any;

type TherapistJwtClaims = {
    userId?: unknown;
    therapistId?: unknown;
};

function getTherapistNoteModel() {
    return prismaAny.therapistNote;
}

function readTherapistClaims(token: string): { userId: string; therapistId: string } | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as TherapistJwtClaims;
        const userId = typeof decoded.userId === 'string' ? decoded.userId : null;
        const therapistId = typeof decoded.therapistId === 'string' ? decoded.therapistId : null;

        if (!userId || !therapistId) {
            return null;
        }

        return { userId, therapistId };
    } catch {
        return null;
    }
}

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

        const claims = readTherapistClaims(token);
        if (!claims) {
            return res.status(401).json({ error: 'Therapist authentication required' });
        }

        const therapist = await prisma.therapist.findFirst({
            where: {
                id: claims.therapistId,
                userId: claims.userId
            },
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
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return JWT token in response body (cross-domain compatible)
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

        const claims = readTherapistClaims(token);
        if (!claims) {
            return res.status(401).json({ error: 'Invalid therapist session' });
        }

        const therapist = await prisma.therapist.findFirst({
            where: {
                id: claims.therapistId,
                userId: claims.userId
            },
            include: {
                user: { select: { id: true, email: true, name: true, profilePhoto: true } },
                _count: { select: { bookings: true } }
            }
        });

        if (!therapist || !therapist.isActive) {
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
        const nextStatus = status as BookingStatus;

        const normalizedNotes = typeof therapistNotes === 'string' ? therapistNotes.trim() : '';
        if (status === 'CANCELLED' && normalizedNotes.length < 3) {
            return res.status(400).json({ error: 'Please provide a brief reason when declining a booking.' });
        }

        // Verify the booking belongs to this therapist
        const booking = await prisma.therapistBooking.findFirst({
            where: { id, therapistId: req.therapist.id }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const allowedFromStatuses: BookingStatus[] =
            nextStatus === 'COMPLETED'
                ? ['CONFIRMED']
                : ['PENDING'];

        const updateResult = await prisma.therapistBooking.updateMany({
            where: {
                id,
                therapistId: req.therapist.id,
                status: { in: allowedFromStatuses }
            },
            data: {
                status: nextStatus,
                ...(therapistNotes !== undefined && { therapistNotes: normalizedNotes || null }),
                processedBy: req.therapist.name,
                processedAt: new Date()
            }
        });

        if (updateResult.count === 0) {
            const latest = await prisma.therapistBooking.findFirst({
                where: { id, therapistId: req.therapist.id },
                select: { status: true }
            });

            return res.status(409).json({
                error: `Booking status was already updated to ${latest?.status ?? 'an unknown state'}. Please refresh.`
            });
        }

        const updated = await prisma.therapistBooking.findUnique({
            where: { id },
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

// ─── GET /clients ───────────────────────────────────────────────────────────
router.get('/clients', requireTherapist, async (req: any, res) => {
    try {
        const therapistId = req.therapist.id;

        const bookings = await prisma.therapistBooking.findMany({
            where: { therapistId },
            select: {
                userId: true,
                status: true,
                preferredDate: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePhoto: true,
                        approach: true,
                        createdAt: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const clientMap = new Map<string, any>();
        for (const booking of bookings) {
            if (!booking.user) continue;
            const userId = booking.userId;
            if (!clientMap.has(userId)) {
                clientMap.set(userId, {
                    ...booking.user,
                    bookingCount: 0,
                    lastBooking: booking.createdAt,
                    lastStatus: booking.status,
                    completedSessions: 0,
                });
            }

            const client = clientMap.get(userId)!;
            client.bookingCount += 1;
            if (booking.status === 'COMPLETED') {
                client.completedSessions += 1;
            }

            if (new Date(booking.createdAt) > new Date(client.lastBooking)) {
                client.lastBooking = booking.createdAt;
                client.lastStatus = booking.status;
            }
        }

        res.json({
            success: true,
            data: Array.from(clientMap.values()),
        });
    } catch (error) {
        console.error('Get therapist clients error:', error);
        res.status(500).json({ error: 'Failed to get clients' });
    }
});

// ─── GET /clients/:userId/summary ──────────────────────────────────────────
router.get('/clients/:userId/summary', requireTherapist, async (req: any, res) => {
    try {
        const therapistId = req.therapist.id;
        const { userId } = req.params;

        const hasRelationship = await prisma.therapistBooking.findFirst({
            where: { therapistId, userId },
            select: { id: true }
        });

        if (!hasRelationship) {
            return res.status(403).json({ error: 'No client relationship found' });
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [
            user,
            assessments,
            moodEntries,
            conversations,
            conversationCount,
            bookings,
            microCheckins,
            goals,
            dashboardInsight,
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profilePhoto: true,
                    approach: true,
                    createdAt: true,
                }
            }),
            prisma.assessmentResult.findMany({
                where: { userId },
                take: 10,
                orderBy: { completedAt: 'desc' },
                select: {
                    id: true,
                    assessmentType: true,
                    score: true,
                    maxScore: true,
                    completedAt: true,
                }
            }),
            prisma.moodEntry.findMany({
                where: { userId, createdAt: { gte: thirtyDaysAgo } },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    mood: true,
                    intensity: true,
                    notes: true,
                    createdAt: true,
                }
            }),
            prisma.conversation.findMany({
                where: { userId },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    updatedAt: true,
                    _count: { select: { messages: true } },
                }
            }),
            prisma.conversation.count({ where: { userId } }),
            prisma.therapistBooking.findMany({
                where: { therapistId, userId },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    status: true,
                    preferredDate: true,
                    preferredTime: true,
                    therapistNotes: true,
                    createdAt: true,
                }
            }),
            prisma.microCheckin.findMany({
                where: { userId },
                take: 20,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    responses: true,
                    mood: true,
                    createdAt: true,
                }
            }),
            prisma.conversationGoal.findMany({
                where: { userId },
                take: 20,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    updatedAt: true,
                    createdAt: true,
                }
            }),
            prisma.dashboardInsights.findUnique({
                where: { userId },
                select: {
                    id: true,
                    aiSummary: true,
                    insightsData: true,
                    generatedAt: true,
                }
            }),
        ]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const latestMoodIntensity = moodEntries[0]?.intensity ?? 5;
        const oldestMoodIntensity = moodEntries[moodEntries.length - 1]?.intensity ?? 5;
        const moodTrendDelta = latestMoodIntensity - oldestMoodIntensity;

        const parseRecord = (value: unknown): Record<string, unknown> => {
            if (!value) {
                return {};
            }

            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        return parsed as Record<string, unknown>;
                    }
                } catch {
                    return {};
                }
            }

            if (typeof value === 'object' && !Array.isArray(value)) {
                return value as Record<string, unknown>;
            }

            return {};
        };

        const toNullableNumber = (value: unknown): number | null => {
            if (value === null || value === undefined || value === '') {
                return null;
            }
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : null;
        };

        const toIso = (value?: Date | null) => {
            if (!value) return null;
            return value.toISOString();
        };

        const moodCounts: Record<string, number> = {};
        moodEntries.forEach((entry) => {
            if (entry.mood) {
                moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
            }
        });

        const topMoods = Object.entries(moodCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([mood, count]) => ({
                mood,
                count,
                percentage: moodEntries.length > 0 ? Math.round((count / moodEntries.length) * 100) : 0,
            }));

        const now = new Date();

        const bookingsWithDate = bookings
            .map((booking) => {
                const scheduledDate = booking.preferredDate ?? booking.createdAt;
                return {
                    ...booking,
                    scheduledDate,
                };
            })
            .filter((booking) => booking.scheduledDate instanceof Date && !Number.isNaN(booking.scheduledDate.getTime()));

        const completedSessions = bookingsWithDate.filter((booking) => booking.status === 'COMPLETED').length;
        const cancelledSessions = bookingsWithDate.filter((booking) => booking.status === 'CANCELLED').length;
        const noShowSessions = 0;
        const completionRate =
            bookingsWithDate.length > 0
                ? Math.round((completedSessions / bookingsWithDate.length) * 100)
                : 0;

        const lastSessionAt = bookingsWithDate
            .filter((booking) => booking.status !== 'PENDING' && booking.scheduledDate <= now)
            .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime())[0]?.scheduledDate;

        const nextSessionAt = bookingsWithDate
            .filter((booking) => booking.status === 'CONFIRMED' && booking.scheduledDate >= now)
            .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0]?.scheduledDate;

        const checkIns = microCheckins.map((entry) => {
            const responses = parseRecord(entry.responses);

            const noteCandidate =
                responses.notes ??
                responses.note ??
                responses.wentWell ??
                responses.grateful ??
                null;

            return {
                id: entry.id,
                moodScore: toNullableNumber(
                    responses.moodScore ??
                    responses.mood ??
                    responses.overallMood ??
                    responses.overallDay
                ),
                stressScore: toNullableNumber(
                    responses.stressScore ??
                    responses.stress ??
                    responses.anxietyLevel
                ),
                sleepHours: toNullableNumber(
                    responses.sleepHours ??
                    responses.sleep ??
                    responses.sleepDuration
                ),
                energyLevel:
                    responses.energyLevel !== undefined && responses.energyLevel !== null
                        ? String(responses.energyLevel)
                        : responses.energy !== undefined && responses.energy !== null
                            ? String(responses.energy)
                            : null,
                notes: typeof noteCandidate === 'string' ? noteCandidate : null,
                createdAt: entry.createdAt.toISOString(),
            };
        });

        const normalizedGoals = goals.map((goal) => ({
            id: goal.id,
            title: goal.title,
            description: goal.description,
            status: goal.status,
            targetDate: goal.updatedAt ? goal.updatedAt.toISOString() : null,
            createdAt: goal.createdAt.toISOString(),
        }));

        const insights: Array<{
            id: string;
            type: string;
            severity: string | null;
            title: string;
            message: string;
            recommendations: Record<string, unknown> | null;
            metadata: Record<string, unknown> | null;
            createdAt: string;
        }> = [];

        const latestAssessment = assessments[0];
        if (latestAssessment) {
            const scorePercent =
                latestAssessment.maxScore && latestAssessment.maxScore > 0
                    ? Math.round((latestAssessment.score / latestAssessment.maxScore) * 100)
                    : null;

            const severity = scorePercent !== null && scorePercent >= 75
                ? 'high'
                : scorePercent !== null && scorePercent >= 50
                    ? 'medium'
                    : 'low';

            insights.push({
                id: `assessment-${latestAssessment.id}`,
                type: 'ASSESSMENT',
                severity,
                title: `${latestAssessment.assessmentType} update`,
                message:
                    scorePercent !== null
                        ? `Latest ${latestAssessment.assessmentType} score is ${scorePercent}% of max.`
                        : `Latest ${latestAssessment.assessmentType} assessment was completed.`,
                recommendations: null,
                metadata: {
                    score: latestAssessment.score,
                    maxScore: latestAssessment.maxScore,
                    completedAt: toIso(latestAssessment.completedAt),
                },
                createdAt: latestAssessment.completedAt.toISOString(),
            });
        }

        if (moodEntries.length > 0) {
            const severity = moodTrendDelta < 0 ? 'high' : moodTrendDelta === 0 ? 'medium' : 'low';
            insights.push({
                id: `mood-trend-${userId}`,
                type: 'MOOD_TREND',
                severity,
                title: 'Mood trend signal',
                message:
                    moodTrendDelta > 0
                        ? 'Recent mood intensity trend appears to be improving.'
                        : moodTrendDelta < 0
                            ? 'Recent mood intensity trend appears to be declining and may need follow-up.'
                            : 'Mood trend is stable over recent entries.',
                recommendations:
                    moodTrendDelta < 0
                        ? { action: 'Consider reviewing coping plan and scheduling a follow-up check-in.' }
                        : null,
                metadata: {
                    latestMoodIntensity,
                    oldestMoodIntensity,
                    entriesLast30d: moodEntries.length,
                },
                createdAt: moodEntries[0].createdAt.toISOString(),
            });
        }

        if (dashboardInsight?.aiSummary) {
            insights.push({
                id: `dashboard-insight-${dashboardInsight.id}`,
                type: 'AI_SUMMARY',
                severity: null,
                title: 'AI summary',
                message: dashboardInsight.aiSummary,
                recommendations: null,
                metadata: parseRecord(dashboardInsight.insightsData),
                createdAt: dashboardInsight.generatedAt.toISOString(),
            });
        }

        const normalizedBookings = bookingsWithDate.map((booking) => ({
            id: booking.id,
            scheduledAt: booking.scheduledDate.toISOString(),
            status: booking.status,
            sessionType: booking.preferredTime ? 'Scheduled Session' : 'Therapy Session',
            durationMinutes: 50,
            notes: booking.therapistNotes,
        }));

        res.json({
            success: true,
            data: {
                client: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    profilePhoto: user.profilePhoto,
                    approach: user.approach,
                    level: null,
                    createdAt: user.createdAt.toISOString(),
                },
                stats: {
                    totalBookings: bookingsWithDate.length,
                    completedSessions,
                    noShowSessions,
                    cancelledSessions,
                    completionRate,
                    lastSessionAt: toIso(lastSessionAt),
                    nextSessionAt: toIso(nextSessionAt),
                },
                bookings: normalizedBookings,
                checkIns,
                goals: normalizedGoals,
                insights,

                // Legacy keys retained for compatibility with older frontend consumers.
                user,
                assessments,
                moodSummary: {
                    entries: moodEntries.slice(0, 14),
                    totalLast30d: moodEntries.length,
                    trend: moodTrendDelta > 0 ? 'improving' : moodTrendDelta < 0 ? 'declining' : 'stable',
                    topMoods,
                },
                conversations: {
                    recent: conversations,
                    totalCount: conversationCount,
                },
                bookingHistory: bookings,
            }
        });
    } catch (error) {
        console.error('Get client summary error:', error);
        res.status(500).json({ error: 'Failed to get client summary' });
    }
});

// ─── POST /clients/:userId/notes ───────────────────────────────────────────
router.post('/clients/:userId/notes', requireTherapist, async (req: any, res) => {
    try {
        const therapistNoteModel = getTherapistNoteModel();
        if (!therapistNoteModel) {
            return res.status(503).json({
                error: 'Therapist notes are temporarily unavailable. Restart backend to refresh Prisma client.'
            });
        }

        const therapistId = req.therapist.id;
        const { userId } = req.params;
        const { format, subjective, objective, assessment, plan, narrative, bookingId, tags } = req.body;

        const hasRelationship = await prisma.therapistBooking.findFirst({
            where: { therapistId, userId },
            select: { id: true }
        });

        if (!hasRelationship) {
            return res.status(403).json({ error: 'No client relationship found' });
        }

        const normalizedBookingId =
            typeof bookingId === 'string' && bookingId.trim().length > 0
                ? bookingId.trim()
                : null;

        if (normalizedBookingId) {
            const linkedBooking = await prisma.therapistBooking.findFirst({
                where: {
                    id: normalizedBookingId,
                    therapistId,
                    userId,
                },
                select: { id: true }
            });

            if (!linkedBooking) {
                return res.status(400).json({
                    error: 'Invalid linked booking ID for this client. Leave it empty to save an unlinked note.'
                });
            }
        }

        const note = await therapistNoteModel.create({
            data: {
                therapistId,
                userId,
                bookingId: normalizedBookingId,
                format: format || 'SOAP',
                subjective,
                objective,
                assessment,
                plan,
                narrative,
                tags: tags ? JSON.stringify(tags) : null,
            }
        });

        res.status(201).json({ success: true, data: note });
    } catch (error) {
        console.error('Create therapist note error:', error);

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2003'
        ) {
            return res.status(400).json({
                error: 'Invalid linked booking ID for this client. Leave it empty to save an unlinked note.'
            });
        }

        res.status(500).json({ error: 'Failed to create note' });
    }
});

// ─── GET /clients/:userId/notes ────────────────────────────────────────────
router.get('/clients/:userId/notes', requireTherapist, async (req: any, res) => {
    try {
        const therapistNoteModel = getTherapistNoteModel();
        if (!therapistNoteModel) {
            return res.status(503).json({
                error: 'Therapist notes are temporarily unavailable. Restart backend to refresh Prisma client.'
            });
        }

        const therapistId = req.therapist.id;
        const { userId } = req.params;

        const hasRelationship = await prisma.therapistBooking.findFirst({
            where: { therapistId, userId },
            select: { id: true }
        });

        if (!hasRelationship) {
            return res.status(403).json({ error: 'No client relationship found' });
        }

        const notes = await therapistNoteModel.findMany({
            where: { therapistId, userId },
            orderBy: { createdAt: 'desc' },
            include: {
                booking: {
                    select: {
                        preferredDate: true,
                        preferredTime: true,
                        status: true,
                    }
                }
            }
        });

        res.json({ success: true, data: notes });
    } catch (error) {
        console.error('Get therapist notes error:', error);
        res.status(500).json({ error: 'Failed to get notes' });
    }
});

// ─── PUT /notes/:noteId ────────────────────────────────────────────────────
router.put('/notes/:noteId', requireTherapist, async (req: any, res) => {
    try {
        const therapistNoteModel = getTherapistNoteModel();
        if (!therapistNoteModel) {
            return res.status(503).json({
                error: 'Therapist notes are temporarily unavailable. Restart backend to refresh Prisma client.'
            });
        }

        const therapistId = req.therapist.id;
        const { noteId } = req.params;
        const { subjective, objective, assessment, plan, narrative, tags } = req.body;

        const note = await therapistNoteModel.findFirst({
            where: { id: noteId, therapistId },
            select: { id: true }
        });

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const updated = await therapistNoteModel.update({
            where: { id: noteId },
            data: {
                ...(subjective !== undefined && { subjective }),
                ...(objective !== undefined && { objective }),
                ...(assessment !== undefined && { assessment }),
                ...(plan !== undefined && { plan }),
                ...(narrative !== undefined && { narrative }),
                ...(tags !== undefined && { tags: JSON.stringify(tags) }),
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update therapist note error:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// ─── GET /crisis-alerts ────────────────────────────────────────────────────
router.get('/crisis-alerts', requireTherapist, async (req: any, res) => {
    try {
        const therapistId = req.therapist.id;

        const clientUserIds = await prisma.therapistBooking.findMany({
            where: { therapistId, status: { in: ['CONFIRMED', 'COMPLETED'] } },
            select: { userId: true },
            distinct: ['userId'],
        });

        const userIds = clientUserIds.map((booking) => booking.userId);
        if (userIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const crisisEvents = await prisma.crisisEvent.findMany({
            where: {
                userId: { in: userIds },
                detectedAt: { gte: sevenDaysAgo },
            },
            orderBy: { detectedAt: 'desc' },
            take: 20,
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        res.json({ success: true, data: crisisEvents });
    } catch (error) {
        console.error('Get crisis alerts error:', error);
        res.status(500).json({ error: 'Failed to get crisis alerts' });
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
