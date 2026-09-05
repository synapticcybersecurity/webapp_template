/**
 * Project Routes (Example Domain)
 * Demonstrates CRUD API patterns
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireActiveSubscription } from '../middleware/subscription.middleware.js';
import * as projectController from '../controllers/project.controller.js';

const router = Router();

// Projects are the example tenant-scoped domain, so they also demonstrate the
// paywall. requireActiveSubscription is a no-op when Stripe is unconfigured and
// always passes platform admins, so this does not get in the way of local
// development — copy this pairing (requireAuth + requireActiveSubscription) for
// real billable resources.
const requireEntitlement = [requireAuth, requireActiveSubscription()];

// Create project
router.post('/', requireEntitlement, projectController.createProject);

// List projects (with optional organization filter)
router.get('/', requireEntitlement, projectController.listProjects);

// Get project by ID
router.get('/:id', requireEntitlement, projectController.getProject);

// Update project
router.patch('/:id', requireEntitlement, projectController.updateProject);

// Delete project
router.delete('/:id', requireEntitlement, projectController.deleteProject);

export default router;
