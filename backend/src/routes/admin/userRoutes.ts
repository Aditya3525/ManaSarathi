import express from 'express';

import {
  getUsers,
  getUserDetails,
  updateUserStatus,
  getUserActivity,
  deleteUser,
  resetUserPassword,
  getUserStats,
} from '../../controllers/admin/userManagementController';
import { requireAdmin } from './requireAdmin';

const router = express.Router();

router.get('/users/stats', requireAdmin, getUserStats);
router.get('/users', requireAdmin, getUsers);
router.get('/users/:id', requireAdmin, getUserDetails);
router.patch('/users/:id', requireAdmin, updateUserStatus);
router.get('/users/:id/activity', requireAdmin, getUserActivity);
router.delete('/users/:id', requireAdmin, deleteUser);
router.post('/users/:id/reset-password', requireAdmin, resetUserPassword);

export default router;
