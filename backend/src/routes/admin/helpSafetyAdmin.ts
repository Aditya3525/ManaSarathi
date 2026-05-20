import { Router } from 'express';
import { requireAdmin } from './requireAdmin';
import {
  getAllTickets,
  respondToTicket,
  closeTicket,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  createCrisisResource,
  updateCrisisResource,
  deleteCrisisResource,
  createTherapist,
  updateTherapist,
  deleteTherapist,
  getAllBookings,
  processBooking
} from '../../controllers/admin/helpSafetyAdminController';

const router = Router();

// All routes require admin authentication
router.use(requireAdmin as any);

// ===== SUPPORT TICKETS =====
router.get('/support/tickets', getAllTickets);
router.post('/support/tickets/:id/respond', respondToTicket);
router.put('/support/tickets/:id/close', closeTicket);

// ===== FAQ MANAGEMENT =====
router.post('/faq', createFAQ);
router.put('/faq/:id', updateFAQ);
router.delete('/faq/:id', deleteFAQ);

// ===== CRISIS RESOURCES =====
router.post('/crisis/resources', createCrisisResource);
router.put('/crisis/resources/:id', updateCrisisResource);
router.delete('/crisis/resources/:id', deleteCrisisResource);

// ===== THERAPIST MANAGEMENT =====
router.post('/therapists', createTherapist);
router.put('/therapists/:id', updateTherapist);
router.delete('/therapists/:id', deleteTherapist);

// ===== THERAPIST BOOKINGS =====
router.get('/therapists/bookings', getAllBookings);
router.put('/therapists/bookings/:id/process', processBooking);

export default router;
