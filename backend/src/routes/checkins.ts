import express from 'express';
import { authenticate } from '../middleware/auth';
import { createCheckin, getCheckinSummary } from '../controllers/checkinController';

const router = express.Router();

router.use(authenticate as any);

router.post('/', createCheckin);
router.get('/summary', getCheckinSummary);

export default router;
