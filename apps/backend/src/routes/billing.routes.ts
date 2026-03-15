/**
 * Billing Routes
 * Stripe subscription management endpoints
 */

import { Router, raw } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as billingController from '../controllers/billing.controller.js';

const router = Router();

// =============================================================================
// Public Routes
// =============================================================================

// List available plans (no auth required)
router.get('/plans', billingController.listPlans);

// Stripe webhook (no auth — verified by Stripe signature)
// Must use raw body parser for signature verification
router.post('/webhook', raw({ type: 'application/json' }), billingController.handleWebhook);

// =============================================================================
// Protected Routes (require authentication)
// =============================================================================

// Get billing overview for an organization
router.get('/:orgId', requireAuth, billingController.getBillingOverview);

// Create checkout session
router.post('/:orgId/checkout', requireAuth, billingController.createCheckout);

// Create customer portal session
router.post('/:orgId/portal', requireAuth, billingController.createPortal);

export default router;
