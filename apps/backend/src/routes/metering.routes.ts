/**
 * Metering Routes
 * Usage tracking and reporting endpoints
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as meteringController from '../controllers/metering.controller.js';

const router = Router();

// Get usage summary for current billing period
router.get('/:orgId', requireAuth, meteringController.getUsageSummary);

// Record a usage event (admin only)
router.post('/:orgId/record', requireAuth, meteringController.recordUsage);

export default router;
