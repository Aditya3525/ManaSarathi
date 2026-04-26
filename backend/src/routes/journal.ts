import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  createJournalEntry,
  deleteJournalEntry,
  getJournalEntries,
  getJournalPrompt,
  getWeeklyReflection
} from '../controllers/journalController';

const router = express.Router();

router.use(authenticate as any);

router.post('/', createJournalEntry);
router.get('/', getJournalEntries);
router.get('/prompts', getJournalPrompt);
router.get('/reflection', getWeeklyReflection);
router.delete('/:id', deleteJournalEntry);

export default router;
