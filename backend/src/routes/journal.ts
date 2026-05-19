import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  createJournalEntry,
  deleteJournalEntry,
  updateJournalEntry,
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
router.put('/:id', updateJournalEntry);
router.delete('/:id', deleteJournalEntry);

export default router;
