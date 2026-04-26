import express from 'express';

import { authenticate } from '../middleware/auth';
import { createSleepLog, getSleepHistory, getSleepStats } from '../controllers/sleepController';

const router = express.Router();

router.use(authenticate as any);

router.get('/stats', getSleepStats);
router.get('/', getSleepHistory);
router.post('/', createSleepLog);

export default router;
