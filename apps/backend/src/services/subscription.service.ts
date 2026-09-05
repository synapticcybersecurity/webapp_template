/**
 * Subscription state — the single source of truth for "is this org paid up?".
 *
 * Reads the Subscription row (kept current by the Stripe webhook) and falls
 * back to the organization's free-trial window. Cached in Redis for five
 * minutes; the webhook invalidates per-org on every state change, so the cache
 * cannot serve a stale "active" after a cancellation for longer than it takes
 * Stripe to call us back.
 *
 * `isActive` is true when EITHER a live Subscription exists OR the free trial
 * has not expired. Both halves matter: a brand-new tenant has no Subscription
 * row at all and must still be able to use the product.
 */

import { prisma } from '../config/database.js';
import { getRedisClient, isRedisConnected } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const CACHE_PREFIX = 'subscription:';
const CACHE_TTL_SECONDS = 300;

/** Statuses that still entitle the org to service. */
const LIVE_STATUSES = ['active', 'trialing', 'past_due'] as const;

export interface OrgSubscriptionInfo {
  /** Plan key, 'trial' during the free trial, or null once expired. */
  plan: string | null;
  /** Stripe status, 'trialing' for a free trial, 'expired' once lapsed. */
  status: string | null;
  /** Whether the org passes requireActiveSubscription. */
  isActive: boolean;
  /** End of the current paid period; null on trial or after expiry. */
  periodEnd: string | null;
  /** End of the free trial; null once a paid subscription exists. */
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

const EXPIRED: OrgSubscriptionInfo = {
  plan: null,
  status: 'expired',
  isActive: false,
  periodEnd: null,
  trialEndsAt: null,
  cancelAtPeriodEnd: false,
};

function cacheKey(orgId: string): string {
  return `${CACHE_PREFIX}${orgId}`;
}

/**
 * Look up subscription state for an organization.
 *
 * Redis is treated as strictly optional: the template runs without it, and a
 * cache read or write failing must never deny access to a paying customer.
 * Every Redis interaction is therefore best-effort, and the database is
 * consulted whenever the cache does not produce a usable answer.
 */
export async function getOrgSubscriptionInfo(orgId: string): Promise<OrgSubscriptionInfo> {
  const redis = getRedisClient();
  const cacheUsable = redis && isRedisConnected();

  if (cacheUsable) {
    try {
      const cached = await redis.get(cacheKey(orgId));
      if (cached) return JSON.parse(cached) as OrgSubscriptionInfo;
    } catch (error) {
      logger.warn('Subscription cache read failed; falling through to database', { error });
    }
  }

  const subscription = await prisma.subscription.findFirst({
    where: { organizationId: orgId, status: { in: [...LIVE_STATUSES] } },
    orderBy: { createdAt: 'desc' },
  });

  let info: OrgSubscriptionInfo;

  if (subscription) {
    info = {
      plan: subscription.plan,
      status: subscription.status,
      isActive: true,
      periodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      trialEndsAt: null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  } else {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { trialEndsAt: true },
    });

    const trialEndsAt = org?.trialEndsAt ?? null;
    const inTrial = trialEndsAt !== null && trialEndsAt.getTime() > Date.now();

    info = inTrial
      ? {
          plan: 'trial',
          status: 'trialing',
          isActive: true,
          periodEnd: null,
          trialEndsAt: trialEndsAt.toISOString(),
          cancelAtPeriodEnd: false,
        }
      : { ...EXPIRED, trialEndsAt: trialEndsAt?.toISOString() ?? null };
  }

  if (cacheUsable) {
    try {
      await redis.setEx(cacheKey(orgId), CACHE_TTL_SECONDS, JSON.stringify(info));
    } catch (error) {
      logger.warn('Subscription cache write failed', { error });
    }
  }

  return info;
}

/**
 * Drop an org's cached subscription state.
 *
 * Call from every Stripe webhook that changes subscription state — without it
 * a cancelled org keeps its access for up to the cache TTL.
 */
export async function invalidateSubscriptionCache(orgId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !isRedisConnected()) return;
  try {
    await redis.del(cacheKey(orgId));
    logger.info(`Invalidated subscription cache for organization ${orgId}`);
  } catch (error) {
    logger.warn('Subscription cache invalidation failed', { error, orgId });
  }
}
