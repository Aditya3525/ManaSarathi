import express from 'express';

import {
  bulkUpdateAssessmentStatus,
  bulkDeleteAssessments,
  bulkUpdatePracticeStatus,
  bulkDeletePractices,
  bulkUpdateContentStatus,
  bulkDeleteContent,
  bulkUpdateAssessmentTags,
  bulkUpdatePracticeApproach,
  bulkUpdateContentType,
} from '../../controllers/admin/bulkOperationsController';
import { requireAdmin } from './requireAdmin';

const router = express.Router();

router.post('/bulk/assessments/publish', requireAdmin, bulkUpdateAssessmentStatus);
router.delete('/bulk/assessments', requireAdmin, bulkDeleteAssessments);
router.post('/bulk/assessments/tags', requireAdmin, bulkUpdateAssessmentTags);
router.post('/bulk/practices/publish', requireAdmin, bulkUpdatePracticeStatus);
router.delete('/bulk/practices', requireAdmin, bulkDeletePractices);
router.post('/bulk/practices/approach', requireAdmin, bulkUpdatePracticeApproach);
router.post('/bulk/content/publish', requireAdmin, bulkUpdateContentStatus);
router.delete('/bulk/content', requireAdmin, bulkDeleteContent);
router.post('/bulk/content/type', requireAdmin, bulkUpdateContentType);

export default router;
