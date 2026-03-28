import express from 'express';

import {
  getAnalytics,
  getUserAnalytics,
  getContentAnalytics,
  getAssessmentAnalytics,
} from '../../controllers/admin/analyticsController';
import {
  getAIPerformanceAnalytics,
  getCrisisDetectionAnalytics,
  getSystemHealthAnalytics,
  getUserEngagementAnalytics,
  getWellnessImpactAnalytics,
  getComprehensiveAnalytics,
} from '../../controllers/admin/advancedAnalyticsController';
import { requireAdmin } from './requireAdmin';

const router = express.Router();

router.get('/analytics/comprehensive', requireAdmin, getComprehensiveAnalytics);
router.get('/analytics/ai-performance', requireAdmin, getAIPerformanceAnalytics);
router.get('/analytics/crisis-detection', requireAdmin, getCrisisDetectionAnalytics);
router.get('/analytics/system-health', requireAdmin, getSystemHealthAnalytics);
router.get('/analytics/user-engagement', requireAdmin, getUserEngagementAnalytics);
router.get('/analytics/wellness-impact', requireAdmin, getWellnessImpactAnalytics);
router.get('/analytics', requireAdmin, getAnalytics);
router.get('/analytics/users', requireAdmin, getUserAnalytics);
router.get('/analytics/content', requireAdmin, getContentAnalytics);
router.get('/analytics/assessments', requireAdmin, getAssessmentAnalytics);

export default router;
