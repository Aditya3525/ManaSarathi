import express from 'express';

import { authenticate } from '../middleware/auth';
import {
  getIntentionHistory,
  getIntentionPresets,
  getTodayIntention,
  reflectOnIntention,
  setTodayIntention,
} from '../controllers/intentionController';

const router = express.Router();

router.use(authenticate as any);

router.get('/presets', getIntentionPresets);
router.get('/today', getTodayIntention);
router.get('/', getIntentionHistory);
router.post('/', setTodayIntention);
router.patch('/:id/reflect', reflectOnIntention);

export default router;
