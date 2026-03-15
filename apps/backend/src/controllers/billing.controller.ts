/**
 * Billing Controller
 * Handles subscription management and Stripe checkout
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse, createCheckoutSchema } from '@webapp/shared';
import * as billingService from '../services/billing.service.js';
import { ForbiddenError, BadRequestError } from '../utils/errors.js';
import { prisma } from '../config/database.js';
import { PLANS } from '../config/stripe.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function requireOrgId(req: Request): string {
  const orgId = req.params.orgId;
  if (!orgId) throw new BadRequestError('Organization ID is required');
  return orgId;
}

/**
 * Verify the current user is an owner or admin of the organization
 */
async function verifyOrgAdmin(userId: string, orgId: string): Promise<void> {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    select: { role: true },
  });

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new ForbiddenError('Only organization owners and admins can manage billing');
  }
}

/**
 * GET /api/billing/plans — List available plans
 */
export async function listPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const response: ApiResponse = {
      success: true,
      data: Object.values(PLANS),
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/billing/:orgId — Get billing overview for an organization
 */
export async function getBillingOverview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = requireOrgId(req);
    await verifyOrgAdmin(req.user!.id, orgId);

    const [{ subscription, plan }, usage] = await Promise.all([
      billingService.getSubscription(orgId),
      billingService.getPlanUsage(orgId),
    ]);

    const response: ApiResponse = {
      success: true,
      data: { subscription, plan, usage },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/billing/:orgId/checkout — Create a Stripe Checkout session
 */
export async function createCheckout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = requireOrgId(req);
    await verifyOrgAdmin(req.user!.id, orgId);

    const input = createCheckoutSchema.parse(req.body);

    const url = await billingService.createCheckoutSession(
      orgId,
      input.plan,
      input.interval,
      `${FRONTEND_URL}/organizations/${orgId}/billing?success=true`,
      `${FRONTEND_URL}/organizations/${orgId}/billing?canceled=true`
    );

    const response: ApiResponse = {
      success: true,
      data: { url },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/billing/:orgId/portal — Create a Stripe Customer Portal session
 */
export async function createPortal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = requireOrgId(req);
    await verifyOrgAdmin(req.user!.id, orgId);

    const url = await billingService.createPortalSession(
      orgId,
      `${FRONTEND_URL}/organizations/${orgId}/billing`
    );

    const response: ApiResponse = {
      success: true,
      data: { url },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/billing/webhook — Handle Stripe webhook events
 * Note: This route must receive raw body (not JSON-parsed)
 */
export async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    await billingService.handleWebhookEvent(req.body, signature);

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
