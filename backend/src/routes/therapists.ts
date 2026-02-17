import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getTherapists,
  getTherapistById,
  searchTherapists,
  requestBooking,
  getUserBookings,
  cancelBooking
} from '../controllers/therapistController';

const router = express.Router();

// Public therapist directory routes
router.get('/', getTherapists);
router.get('/search', searchTherapists);

// Protected booking routes (MUST be before /:id to avoid matching 'booking'/'bookings' as an id)
router.post('/booking', authenticate, requestBooking);
router.get('/bookings', authenticate, getUserBookings);
router.delete('/bookings/:id', authenticate, cancelBooking);

// Parameterized route last
router.get('/:id', getTherapistById);

export default router;
