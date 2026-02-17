import express from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logMoodSchema, getMoodHistorySchema } from '../api/validators/mood.validator';
import {
  getMoodEntries,
  createMoodEntry,
  deleteMoodEntry,
  getMoodStats,
} from '../controllers/moodController';

const router = express.Router();

// All mood routes require authentication
router.use(authenticate as any);

// GET /api/mood/stats — Mood statistics (must be before /:id to avoid conflict)
router.get('/stats', getMoodStats);

// GET /api/mood — List mood entries with optional filtering
router.get('/', validate(getMoodHistorySchema), getMoodEntries);

// POST /api/mood — Log a new mood entry
router.post('/', validate(logMoodSchema), createMoodEntry);

// DELETE /api/mood/:id — Delete a mood entry
router.delete('/:id', deleteMoodEntry);

export default router;
