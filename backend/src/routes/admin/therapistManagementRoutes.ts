import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';

import { logActivity } from '../../controllers/admin/activityLogController';

type RoutesOptions = {
  requireAdmin: any;
  prisma: any;
};

// Normalize availability from legacy { day, times: ['9:00 AM - 5:00 PM'] } format
// to the expected { day, startTime, endTime } format
function normalizeAvailability(slots: any[]): { day: string; startTime: string; endTime: string }[] {
  if (!Array.isArray(slots)) return [];
  const result: { day: string; startTime: string; endTime: string }[] = [];
  for (const slot of slots) {
    if (slot.startTime && slot.endTime) {
      // Already in correct format
      result.push({ day: slot.day, startTime: slot.startTime, endTime: slot.endTime });
    } else if (slot.times && Array.isArray(slot.times)) {
      // Legacy format: { day: 'Monday', times: ['9:00 AM - 5:00 PM'] }
      for (const timeRange of slot.times) {
        const parts = timeRange.split(' - ');
        if (parts.length === 2) {
          result.push({
            day: slot.day,
            startTime: convertTo24h(parts[0].trim()),
            endTime: convertTo24h(parts[1].trim())
          });
        }
      }
    }
  }
  return result;
}

function convertTo24h(time12: string): string {
  // If already in 24h format like "09:00", return as-is
  if (/^\d{1,2}:\d{2}$/.test(time12) && !time12.includes('AM') && !time12.includes('PM')) {
    return time12;
  }
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Therapist validation schema
const therapistValidationSchema = Joi.object({
  name: Joi.string().required().max(100),
  credential: Joi.string().required().valid('PSYCHOLOGIST', 'PSYCHIATRIST', 'LCSW', 'LMFT', 'LPC', 'LMHC'),
  title: Joi.string().required().max(150),
  bio: Joi.string().required().max(2000),
  specialties: Joi.array().items(Joi.string()).min(1).required(),
  email: Joi.string().email().allow('', null).optional(),
  phone: Joi.string().max(20).allow('', null).optional(),
  website: Joi.string().uri().allow('', null).optional(),
  street: Joi.string().max(200).allow('', null).optional(),
  city: Joi.string().max(100).allow('', null).optional(),
  state: Joi.string().max(50).allow('', null).optional(),
  zipCode: Joi.string().max(20).allow('', null).optional(),
  country: Joi.string().max(50).default('US'),
  acceptsInsurance: Joi.boolean().default(false),
  insurances: Joi.array().items(Joi.string()).optional(),
  sessionFee: Joi.number().min(0).allow(null).optional(),
  offersSliding: Joi.boolean().default(false),
  availability: Joi.array().items(Joi.object({
    day: Joi.string().required(),
    startTime: Joi.string().required(),
    endTime: Joi.string().required()
  })).optional(),
  profileImageUrl: Joi.string().uri().allow('', null).optional(),
  yearsExperience: Joi.number().integer().min(0).allow(null).optional(),
  languages: Joi.string().max(200).allow('', null).optional(),
  isActive: Joi.boolean().default(true),
  isVerified: Joi.boolean().default(false),
  // Portal account fields (optional — if provided, a User account is created/linked)
  portalEmail: Joi.string().email().allow('', null).optional(),
  portalPassword: Joi.string().min(6).max(128).allow('', null).optional(),
  enablePortal: Joi.boolean().optional()
});

export const createTherapistManagementRoutes = ({ requireAdmin, prisma }: RoutesOptions): express.Router => {
  const router = express.Router();

  // Get all therapists (admin - includes inactive/unverified)
  router.get('/therapists', requireAdmin, async (req, res) => {
    try {
      const {
        search,
        specialty,
        credential,
        isActive,
        isVerified,
        city,
        state,
        limit = '50',
        offset = '0',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { bio: { contains: search as string } },
          { city: { contains: search as string } },
          { title: { contains: search as string } }
        ];
      }
      if (specialty) {
        where.specialtiesJson = { contains: specialty as string };
      }
      if (credential) {
        where.credential = credential as string;
      }
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }
      if (isVerified !== undefined) {
        where.isVerified = isVerified === 'true';
      }
      if (city) {
        where.city = { contains: city as string };
      }
      if (state) {
        where.state = state as string;
      }

      const [therapists, total] = await Promise.all([
        prisma.therapist.findMany({
          where,
          orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string)
        }),
        prisma.therapist.count({ where })
      ]);

      // Parse JSON fields and strip raw JSON columns
      const therapistsWithParsed = therapists.map((t: any) => {
        const { insurances: _raw, specialtiesJson: _sj, availabilityJson: _aj, ...rest } = t;
        return {
          ...rest,
          specialties: JSON.parse(t.specialtiesJson || '[]'),
          availability: normalizeAvailability(JSON.parse(t.availabilityJson || '[]')),
          insurancesList: t.insurances ? JSON.parse(t.insurances) : [],
          portalLinked: !!t.userId
        };
      });

      res.json({
        success: true,
        data: therapistsWithParsed,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      console.error('Error fetching therapists:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch therapists' });
    }
  });

  // Get single therapist by ID (admin)
  router.get('/therapists/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const therapist = await prisma.therapist.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, name: true } },
          bookings: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!therapist) {
        return res.status(404).json({ success: false, error: 'Therapist not found' });
      }

      const { insurances: _raw, specialtiesJson: _sj, availabilityJson: _aj, ...therapistRest } = therapist;
      const therapistData = {
        ...therapistRest,
        specialties: JSON.parse(therapist.specialtiesJson || '[]'),
        availability: normalizeAvailability(JSON.parse(therapist.availabilityJson || '[]')),
        insurancesList: therapist.insurances ? JSON.parse(therapist.insurances) : [],
        portalLinked: !!therapist.userId,
        portalEmail: therapist.user?.email || null
      };

      res.json({ success: true, data: therapistData });
    } catch (error) {
      console.error('Error fetching therapist:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch therapist' });
    }
  });

  // Create new therapist
  router.post('/therapists', requireAdmin, async (req, res) => {
    try {
      const { error, value } = therapistValidationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map((d: any) => d.message)
        });
      }

      const { specialties, insurances, availability, portalEmail, portalPassword, enablePortal, ...rest } = value;

      // Portal account creation / linking
      let userId: string | null = null;

      if (enablePortal && portalEmail) {
        const normalizedEmail = portalEmail.toLowerCase().trim();

        // Check if a User already exists with this email
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (existingUser) {
          // Check if this user is already linked to another therapist
          const alreadyLinked = await prisma.therapist.findFirst({ where: { userId: existingUser.id } });
          if (alreadyLinked) {
            return res.status(400).json({
              success: false,
              error: `This email is already linked to therapist "${alreadyLinked.name}". A user can only be linked to one therapist.`
            });
          }
          // Update password if a new one was provided
          if (portalPassword) {
            const hashedPassword = await bcrypt.hash(portalPassword, 10);
            await prisma.user.update({ where: { id: existingUser.id }, data: { password: hashedPassword } });
          }
          userId = existingUser.id;
        } else {
          // Create a new User account
          if (!portalPassword) {
            return res.status(400).json({
              success: false,
              error: 'Password is required when creating a new portal account'
            });
          }
          const hashedPassword = await bcrypt.hash(portalPassword, 10);
          const newUser = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: rest.name,
              password: hashedPassword,
              isOnboarded: true
            }
          });
          userId = newUser.id;
        }
      }

      const therapist = await prisma.therapist.create({
        data: {
          ...rest,
          specialtiesJson: JSON.stringify(specialties || []),
          insurances: insurances ? JSON.stringify(insurances) : null,
          availabilityJson: JSON.stringify(availability || []),
          ...(userId && { userId })
        }
      });

      // Log activity
      const adminEmail = (req.session as any)?.adminId ? 'admin' : 'unknown';
      await logActivity(adminEmail, 'CREATE', 'THERAPIST', therapist.id, therapist.name, { created: therapist, portalLinked: !!userId }, req);

      res.status(201).json({
        success: true,
        data: {
          ...(() => {
            const { insurances: _r, specialtiesJson: _s, availabilityJson: _a, ...clean } = therapist;
            return clean;
          })(),
          specialties: specialties || [],
          availability: availability || [],
          insurancesList: insurances || [],
          portalLinked: !!userId,
          portalEmail: portalEmail || null
        }
      });
    } catch (error) {
      console.error('Error creating therapist:', error);
      res.status(500).json({ success: false, error: 'Failed to create therapist' });
    }
  });

  // Update therapist
  router.put('/therapists/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await prisma.therapist.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Therapist not found' });
      }

      const { error, value } = therapistValidationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map((d: any) => d.message)
        });
      }

      const { specialties, insurances, availability, portalEmail, portalPassword, enablePortal, ...rest } = value;

      // Portal account management
      let userId: string | null | undefined = undefined; // undefined = don't change

      if (enablePortal === false) {
        // Admin explicitly disabled portal — unlink user
        userId = null;
      } else if (enablePortal && portalEmail) {
        const normalizedEmail = portalEmail.toLowerCase().trim();

        let existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (existingUser) {
          // Check if this user is already linked to a DIFFERENT therapist
          const alreadyLinked = await prisma.therapist.findFirst({
            where: { userId: existingUser.id, id: { not: id } }
          });
          if (alreadyLinked) {
            return res.status(400).json({
              success: false,
              error: `This email is already linked to therapist "${alreadyLinked.name}".`
            });
          }
          if (portalPassword) {
            const hashedPassword = await bcrypt.hash(portalPassword, 10);
            await prisma.user.update({ where: { id: existingUser.id }, data: { password: hashedPassword } });
          }
          userId = existingUser.id;
        } else {
          if (!portalPassword) {
            return res.status(400).json({
              success: false,
              error: 'Password is required when creating a new portal account'
            });
          }
          const hashedPassword = await bcrypt.hash(portalPassword, 10);
          const newUser = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: rest.name || existing.name,
              password: hashedPassword,
              isOnboarded: true
            }
          });
          userId = newUser.id;
        }
      }

      const therapist = await prisma.therapist.update({
        where: { id },
        data: {
          ...rest,
          specialtiesJson: JSON.stringify(specialties || []),
          insurances: insurances ? JSON.stringify(insurances) : null,
          availabilityJson: JSON.stringify(availability || []),
          ...(userId !== undefined && { userId })
        }
      });

      // Log activity
      const adminEmail = (req.session as any)?.adminId ? 'admin' : 'unknown';
      await logActivity(adminEmail, 'UPDATE', 'THERAPIST', therapist.id, therapist.name, { before: existing, after: therapist }, req);

      res.json({
        success: true,
        data: {
          ...(() => {
            const { insurances: _r, specialtiesJson: _s, availabilityJson: _a, ...clean } = therapist;
            return clean;
          })(),
          specialties: specialties || [],
          availability: availability || [],
          insurancesList: insurances || [],
          portalLinked: !!therapist.userId,
          portalEmail: portalEmail || null
        }
      });
    } catch (error) {
      console.error('Error updating therapist:', error);
      res.status(500).json({ success: false, error: 'Failed to update therapist' });
    }
  });

  // Delete therapist
  router.delete('/therapists/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await prisma.therapist.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Therapist not found' });
      }

      // Check for active bookings
      const activeBookings = await prisma.therapistBooking.count({
        where: {
          therapistId: id,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      if (activeBookings > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete therapist with ${activeBookings} active booking(s). Please cancel or complete them first.`
        });
      }

      await prisma.therapist.delete({ where: { id } });

      // Log activity
      const adminEmail = (req.session as any)?.adminId ? 'admin' : 'unknown';
      await logActivity(adminEmail, 'DELETE', 'THERAPIST', id, existing?.name || '', { deleted: existing }, req);

      res.json({ success: true, message: 'Therapist deleted successfully' });
    } catch (error) {
      console.error('Error deleting therapist:', error);
      res.status(500).json({ success: false, error: 'Failed to delete therapist' });
    }
  });

  // Toggle therapist active status
  router.patch('/therapists/:id/status', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, isVerified } = req.body;

      const existing = await prisma.therapist.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Therapist not found' });
      }

      const updateData: any = {};
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
      if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;

      const therapist = await prisma.therapist.update({
        where: { id },
        data: updateData
      });

      // Log activity
      const adminEmail = (req.session as any)?.adminId ? 'admin' : 'unknown';
      await logActivity(adminEmail, 'UPDATE', 'THERAPIST', id, therapist.name, { before: existing, after: therapist }, req);

      res.json({
        success: true,
        data: {
          ...(() => {
            const { insurances: _r, specialtiesJson: _s, availabilityJson: _a, ...clean } = therapist;
            return clean;
          })(),
          specialties: JSON.parse(therapist.specialtiesJson || '[]'),
          availability: JSON.parse(therapist.availabilityJson || '[]'),
          insurancesList: therapist.insurances ? JSON.parse(therapist.insurances) : []
        }
      });
    } catch (error) {
      console.error('Error updating therapist status:', error);
      res.status(500).json({ success: false, error: 'Failed to update therapist status' });
    }
  });

  // Get therapist statistics
  router.get('/therapists-stats', requireAdmin, async (req, res) => {
    try {
      const [total, active, verified, byCredential, bySpecialty] = await Promise.all([
        prisma.therapist.count(),
        prisma.therapist.count({ where: { isActive: true } }),
        prisma.therapist.count({ where: { isVerified: true } }),
        prisma.therapist.groupBy({
          by: ['credential'],
          _count: true
        }),
        prisma.therapist.findMany({
          select: { specialtiesJson: true }
        })
      ]);

      // Count specialties
      const specialtyCounts: Record<string, number> = {};
      bySpecialty.forEach((t: any) => {
        const specs = JSON.parse(t.specialtiesJson || '[]') as string[];
        specs.forEach((s) => {
          specialtyCounts[s] = (specialtyCounts[s] || 0) + 1;
        });
      });

      res.json({
        success: true,
        data: {
          total,
          active,
          verified,
          inactive: total - active,
          unverified: total - verified,
          byCredential: byCredential.map((c: any) => ({ credential: c.credential, count: c._count })),
          bySpecialty: Object.entries(specialtyCounts).map(([specialty, count]) => ({ specialty, count }))
        }
      });
    } catch (error) {
      console.error('Error fetching therapist stats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch therapist statistics' });
    }
  });

  return router;
};
