import express from 'express';

import {
  getActivityLogs,
  getActivityStats,
  getActivityFilters,
  exportActivityLogs,
} from '../../controllers/admin/activityLogController';
import { requireAdmin } from './requireAdmin';

const router = express.Router();

router.get('/activity-logs', requireAdmin, getActivityLogs);
router.get('/activity-logs/stats', requireAdmin, getActivityStats);
router.get('/activity-logs/filters', requireAdmin, getActivityFilters);
router.get('/activity-logs/export', requireAdmin, exportActivityLogs);

export default router;
