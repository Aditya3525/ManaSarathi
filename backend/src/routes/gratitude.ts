import express from 'express';

import { authenticate } from '../middleware/auth';
import {
  createGratitudeEntry,
  getGratitudeEntries,
} from '../controllers/gratitudeController';

const router = express.Router();

router.use(authenticate as any);

router.get('/', getGratitudeEntries);
router.post('/', createGratitudeEntry);

export default router;
