/**
 * User Routes
 * Endpoints for user management and profiles
 */

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  updateProfileSchema,
  updateUserRoleSchema,
  banUserSchema,
} from '@webapp/shared';
import * as userController from '../controllers/user.controller.js';

const router = Router();

// =============================================================================
// Current User Routes (authenticated users)
// =============================================================================

// Get current user profile
router.get('/me', requireAuth, userController.getCurrentUser);

// Update current user profile
router.patch(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  userController.updateCurrentUser
);

// =============================================================================
// Admin Routes (admin only)
// =============================================================================

// List all users with pagination and filtering
router.get('/', requireAuth, requireAdmin, userController.listUsers);

// Get user by ID
router.get('/:id', requireAuth, requireAdmin, userController.getUserById);

// Update user role
router.patch(
  '/:id/role',
  requireAuth,
  requireAdmin,
  validateBody(updateUserRoleSchema),
  userController.updateUserRole
);

// Ban user
router.post(
  '/:id/ban',
  requireAuth,
  requireAdmin,
  validateBody(banUserSchema),
  userController.banUser
);

// Unban user
router.post('/:id/unban', requireAuth, requireAdmin, userController.unbanUser);

export default router;
