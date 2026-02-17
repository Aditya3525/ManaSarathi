import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { createRequestLogger } from '../utils/logger';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../shared/errors/AppError';
import { formatZodErrors } from '../utils/zodHelpers';

// Normalize availability from legacy { day, times } to { day, startTime, endTime }
function normalizeAvailability(slots: any[]): { day: string; startTime: string; endTime: string }[] {
  if (!Array.isArray(slots)) return [];
  const result: { day: string; startTime: string; endTime: string }[] = [];
  for (const slot of slots) {
    if (slot.startTime && slot.endTime) {
      result.push({ day: slot.day, startTime: slot.startTime, endTime: slot.endTime });
    } else if (slot.times && Array.isArray(slot.times)) {
      for (const timeRange of slot.times) {
        const parts = timeRange.split(' - ');
        if (parts.length === 2) {
          result.push({ day: slot.day, startTime: convertTo24h(parts[0].trim()), endTime: convertTo24h(parts[1].trim()) });
        }
      }
    }
  }
  return result;
}

function convertTo24h(time12: string): string {
  if (/^\d{1,2}:\d{2}$/.test(time12) && !time12.includes('AM') && !time12.includes('PM')) return time12;
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Validation schema
const bookingSchema = z.object({
  therapistId: z.string(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  message: z.string().max(1000).optional(),
  userPhone: z.string().optional()
});

/**
 * Get all active therapists
 * GET /api/therapists
 */
export const getTherapists = async (req: Request, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'therapist',
    action: 'getTherapists'
  });

  try {
    const {
      specialty,
      city,
      state,
      acceptsInsurance,
      limit = '20',
      offset = '0'
    } = req.query;

    const therapists = await prisma.therapist.findMany({
      where: {
        isActive: true,
        isVerified: true,
        ...(city && { city: city as string }),
        ...(state && { state: state as string }),
        ...(acceptsInsurance === 'true' && { acceptsInsurance: true }),
        ...(specialty && {
          specialtiesJson: {
            contains: specialty as string
          }
        })
      },
      orderBy: [
        { rating: 'desc' },
        { reviewCount: 'desc' }
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        name: true,
        credential: true,
        title: true,
        bio: true,
        specialtiesJson: true,
        email: true,
        phone: true,
        website: true,
        city: true,
        state: true,
        country: true,
        acceptsInsurance: true,
        insurances: true,
        sessionFee: true,
        offersSliding: true,
        availabilityJson: true,
        profileImageUrl: true,
        yearsExperience: true,
        languages: true,
        rating: true,
        reviewCount: true,
        isActive: true,
        isVerified: true
      }
    });

    // Parse JSON fields
    const therapistsWithParsed = therapists.map(t => {
      const insurancesList = t.insurances ? JSON.parse(t.insurances) : [];
      return {
        ...t,
        specialties: JSON.parse(t.specialtiesJson),
        availability: normalizeAvailability(JSON.parse(t.availabilityJson)),
        insurancesList,
        insuranceProviders: insurancesList.length > 0 ? insurancesList.join(', ') : null
      };
    });

    log.info({ count: therapists.length }, 'Fetched therapists');

    res.json({
      success: true,
      data: {
        therapists: therapistsWithParsed,
        total: therapists.length
      }
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch therapists');
    res.status(500).json({ success: false, error: 'Failed to fetch therapists' });
  }
};

/**
 * Get therapist by ID
 * GET /api/therapists/:id
 */
export const getTherapistById = async (req: Request, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'therapist',
    action: 'getTherapist'
  });

  try {
    const { id } = req.params;

    const therapist = await prisma.therapist.findFirst({
      where: {
        id,
        isActive: true,
        isVerified: true
      }
    });

    if (!therapist) {
      throw new NotFoundError('Therapist not found');
    }

    // Parse JSON fields
    const insurancesList = therapist.insurances ? JSON.parse(therapist.insurances) : [];
    const therapistData = {
      ...therapist,
      specialties: JSON.parse(therapist.specialtiesJson),
      availability: normalizeAvailability(JSON.parse(therapist.availabilityJson)),
      insurancesList,
      insuranceProviders: insurancesList.length > 0 ? insurancesList.join(', ') : null
    };

    log.info({ therapistId: id }, 'Fetched therapist details');

    res.json({
      success: true,
      data: { therapist: therapistData }
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch therapist');
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, error: error.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to fetch therapist' });
  }
};

/**
 * Search therapists
 * GET /api/therapists/search?q=query
 */
export const searchTherapists = async (req: Request, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'therapist',
    action: 'searchTherapists'
  });

  try {
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      res.json({
        success: true,
        data: { therapists: [] }
      });
      return;
    }

    const searchTerm = query.toLowerCase();

    const therapists = await prisma.therapist.findMany({
      where: {
        isActive: true,
        isVerified: true,
        OR: [
          { name: { contains: searchTerm } },
          { bio: { contains: searchTerm } },
          { specialtiesJson: { contains: searchTerm } },
          { city: { contains: searchTerm } }
        ]
      },
      orderBy: { rating: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        credential: true,
        title: true,
        bio: true,
        specialtiesJson: true,
        city: true,
        state: true,
        rating: true,
        reviewCount: true,
        acceptsInsurance: true,
        profileImageUrl: true
      }
    });

    const therapistsWithParsed = therapists.map(t => ({
      ...t,
      specialties: JSON.parse(t.specialtiesJson)
    }));

    log.info({ query, resultCount: therapists.length }, 'Therapist search completed');

    res.json({
      success: true,
      data: { therapists: therapistsWithParsed }
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to search therapists');
    res.status(500).json({ success: false, error: 'Failed to search therapists' });
  }
};

/**
 * Request therapist booking
 * POST /api/therapists/booking
 */
export const requestBooking = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'therapist',
    action: 'requestBooking',
    userId: req.user.id
  });

  try {
    const validation = bookingSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = formatZodErrors(validation.error);
      const firstError = Object.values(errors).flat()[0] || 'Invalid booking data';
      res.status(400).json({ success: false, error: firstError, errors });
      return;
    }

    const userId = req.user.id;
    const { therapistId, preferredDate, preferredTime, message, userPhone } = validation.data;

    // Validate date
    if (!preferredDate) {
      res.status(400).json({ success: false, error: 'Preferred date is required.' });
      return;
    }
    // Ensure the date string matches YYYY-MM-DD format
    const dateMatch = preferredDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      res.status(400).json({ success: false, error: 'Preferred date must be in YYYY-MM-DD format.' });
      return;
    }
    const dateObj = new Date(preferredDate + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      res.status(400).json({ success: false, error: 'Preferred date is invalid.' });
      return;
    }
    // Verify the parsed date matches the input (catches invalid dates like Feb 31)
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    if (
      year !== parseInt(dateMatch[1]) ||
      month !== parseInt(dateMatch[2]) ||
      day !== parseInt(dateMatch[3])
    ) {
      res.status(400).json({ success: false, error: 'Preferred date is invalid (date does not exist).' });
      return;
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (dateObj < now) {
      res.status(400).json({ success: false, error: 'Preferred date must be in the future.' });
      return;
    }

    if (!preferredTime) {
      res.status(400).json({ success: false, error: 'Preferred time is required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Verify therapist exists and is active
    const therapist = await prisma.therapist.findFirst({
      where: {
        id: therapistId,
        isActive: true
      }
    });
    if (!therapist) {
      res.status(404).json({ success: false, error: 'Therapist not found or not available' });
      return;
    }

    // Note: Availability check is skipped because bookings are requests
    // that require therapist confirmation. The therapist will review
    // and accept/reject based on their actual schedule.

    // Prevent double-booking for user or therapist at the same date/time
    const existing = await prisma.therapistBooking.findFirst({
      where: {
        OR: [
          { userId, preferredDate: dateObj, preferredTime, status: { in: ['PENDING', 'CONFIRMED'] } },
          { therapistId, preferredDate: dateObj, preferredTime, status: { in: ['PENDING', 'CONFIRMED'] } }
        ]
      }
    });
    if (existing) {
      res.status(400).json({ success: false, error: 'This slot is already booked. Please choose another time.' });
      return;
    }

    const booking = await prisma.therapistBooking.create({
      data: {
        userId,
        therapistId,
        preferredDate: dateObj,
        preferredTime,
        message: message || null,
        userEmail: user.email,
        userPhone: userPhone || null,
        status: 'PENDING'
      },
      include: {
        therapist: {
          select: {
            name: true,
            title: true,
            email: true
          }
        }
      }
    });

    log.info({ bookingId: booking.id, therapistId }, 'Booking request created');

    res.status(201).json({
      success: true,
      data: { booking },
      message: 'Booking request submitted successfully. The therapist will contact you soon.'
    });
  } catch (error: any) {
    log.error({ err: error }, 'Failed to create booking request');
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, error: error.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to submit booking request' });
  }
};

/**
 * Get user's booking requests
 * GET /api/therapists/bookings
 */
export const getUserBookings = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'therapist',
    action: 'getUserBookings',
    userId: req.user.id
  });

  try {
    const userId = req.user.id;

    const bookings = await prisma.therapistBooking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        therapist: {
          select: {
            name: true,
            credential: true,
            title: true,
            email: true,
            phone: true,
            city: true,
            state: true
          }
        }
      }
    });

    log.info({ count: bookings.length }, 'Fetched user bookings');

    res.json({
      success: true,
      data: { bookings }
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch bookings');
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
};

/**
 * Cancel booking request
 * DELETE /api/therapists/bookings/:id
 */
export const cancelBooking = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({
    controller: 'therapist',
    action: 'cancelBooking',
    userId: req.user.id
  });

  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await prisma.therapistBooking.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    if (booking.status === 'COMPLETED') {
      res.status(400).json({ success: false, error: 'Cannot cancel completed booking' });
      return;
    }

    await prisma.therapistBooking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    log.info({ bookingId: id }, 'Booking cancelled');

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error: any) {
    log.error({ err: error }, 'Failed to cancel booking');
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, error: error.message });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to cancel booking' });
  }
};
