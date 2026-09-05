/**
 * Subscription paywall.
 *
 * Blocks tenant routes when the caller's organization has neither an active
 * subscription nor a live free trial.
 *
 * Bypasses, in order:
 *   1. Billing not configured (no STRIPE_SECRET_KEY) — no-op, so the template
 *      is usable out of the box and in dev without Stripe credentials.
 *   2. Platform admins — always pass, including while scoped into a tenant,
 *      so support access does not depend on the customer's billing state.
 *   3. Caller has no organization — pass. This gate is a paywall, not access
 *      control; a user with no org is the access-control layer's problem and
 *      will be refused there with a meaningful error.
 *
 * Responds 403 with `code: 'SUBSCRIPTION_REQUIRED'`, which the frontend API
 * client keys on to redirect to billing rather than treating it as a generic
 * permission failure.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { getOrgSubscriptionInfo } from '../services/subscription.service.js';
import { ctxFromRequest, isSystemAdmin } from '../services/access-control.service.js';

const UPGRADE_PATH = '/billing';

/** Read at call time, not module load, so tests can toggle it. */
function billingEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * The org whose billing state governs this request.
 *
 * Prefers the session's active org. Falls back to the user's most recent
 * membership, which is what a single-org user always hits since nothing ever
 * sets an active org for them.
 */
async function resolveOrgId(req: Request): Promise<string | null> {
  const active = req.user?.session.activeOrganizationId;
  if (active) return active;

  if (!req.user?.id) return null;
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

export function requireActiveSubscription() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!billingEnabled()) return next();
      if (req.user && isSystemAdmin(ctxFromRequest(req))) return next();

      const orgId = await resolveOrgId(req);
      if (!orgId) return next();

      const info = await getOrgSubscriptionInfo(orgId);
      if (info.isActive) return next();

      res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'An active subscription is required to access this feature.',
          upgradePath: UPGRADE_PATH,
          trialEndsAt: info.trialEndsAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
