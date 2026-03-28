import express from 'express';

import {
  listAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  duplicateAssessment,
  previewAssessment,
  getCategories,
} from '../../controllers/admin/assessmentAdminController';
import { validate } from '../../middleware/validate';
import {
  createAssessmentSchema,
  updateAssessmentSchema,
} from '../../api/validators/adminAssessment.validator';
import { requireAdmin } from './requireAdmin';

const router = express.Router();

router.get('/assessments', requireAdmin, listAssessments);
router.get('/assessments/categories', requireAdmin, getCategories);
router.get('/assessments/:id', requireAdmin, getAssessment);
router.post('/assessments', requireAdmin, validate(createAssessmentSchema), createAssessment);
router.put('/assessments/:id', requireAdmin, validate(updateAssessmentSchema), updateAssessment);
router.delete('/assessments/:id', requireAdmin, deleteAssessment);
router.post('/assessments/:id/duplicate', requireAdmin, duplicateAssessment);
router.post('/assessments/:id/preview', requireAdmin, previewAssessment);

export default router;
