/**
 * User Routes
 * Only custom endpoints not handled by better-auth (admin approval workflow)
 */

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();

// =============================================================================
// Admin Approval Routes (custom business logic, not in better-auth)
// =============================================================================

// List users pending admin approval
router.get('/pending', requireAuth, requireAdmin, userController.listPendingApprovals);

// Get count of pending approvals
router.get('/pending/count', requireAuth, requireAdmin, userController.getPendingCount);

// Approve pending user
router.post('/:id/approve', requireAuth, requireAdmin, userController.approveUser);

// Reject pending user
router.post('/:id/reject', requireAuth, requireAdmin, userController.rejectUser);

export default router;
