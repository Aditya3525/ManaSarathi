import express from 'express';

import {
  completeHabit,
  createHabit,
  deleteHabit,
  listHabits,
  updateHabit,
} from '../controllers/habitController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate as any);

router.get('/', listHabits);
router.post('/', createHabit);
router.patch('/:id', updateHabit);
router.post('/:id/complete', completeHabit);
router.delete('/:id', deleteHabit);

export default router;
