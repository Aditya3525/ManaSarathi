import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  createSupportTicket,
  getUserTickets,
  getTicketById,
  acknowledgeTicket
} from '../controllers/supportController';

const router = express.Router();

// All support routes require authentication
router.use(authenticate);

// Support ticket routes
router.post('/tickets', asyncHandler(createSupportTicket as any));
router.get('/tickets', asyncHandler(getUserTickets as any));
router.get('/tickets/:id', asyncHandler(getTicketById as any));
router.put('/tickets/:id/acknowledge', asyncHandler(acknowledgeTicket as any));

export default router;
