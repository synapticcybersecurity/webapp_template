/**
 * Billing Service
 * Handles Stripe integration and subscription management
 */

import type Stripe from 'stripe';
import { prisma } from '../config/database.js';
import { stripe, PLANS, STRIPE_WEBHOOK_SECRET } from '../config/stripe.js';
import { logger } from '../utils/logger.js';
import { invalidateSubscriptionCache } from './subscription.service.js';
import { BadRequestError, NotFoundError, AppError } from '../utils/errors.js';
import { HttpStatus, ErrorCode } from '@webapp/shared';
import type { BillingPlan, BillingInterval, PlanUsage, Invoice } from '@webapp/shared';

function requireStripe(): Stripe {
  if (!stripe) {
    throw new AppError(
      'Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.',
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.BILLING_ERROR,
    );
  }
  return stripe;
}

/**
 * Get or create a Stripe customer for an organization
 */
export async function getOrCreateCustomer(organizationId: string): Promise<string> {
  const s = requireStripe();

  const existing = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  });

  if (existing) {
    return existing.stripeCustomerId;
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, slug: true },
  });

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  const customer = await s.customers.create({
    name: org.name,
    metadata: {
      organizationId,
      slug: org.slug,
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId,
      stripeCustomerId: customer.id,
      status: 'inactive',
      plan: 'free',
    },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout session for subscribing to a plan
 */
export async function createCheckoutSession(
  organizationId: string,
  plan: BillingPlan,
  interval: BillingInterval,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const s = requireStripe();

  const planDetails = PLANS[plan];
  if (!planDetails) {
    throw new BadRequestError(`Invalid plan: ${plan}`);
  }

  const priceId = planDetails.stripePriceIds[interval];
  if (!priceId) {
    throw new BadRequestError(`No ${interval} price configured for ${plan} plan`);
  }

  const customerId = await getOrCreateCustomer(organizationId);

  const session = await s.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { organizationId, plan, interval },
    subscription_data: {
      metadata: { organizationId, plan },
    },
  });

  if (!session.url) {
    throw new AppError(
      'Failed to create checkout session',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.STRIPE_ERROR,
    );
  }

  return session.url;
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession(
  organizationId: string,
  returnUrl: string,
): Promise<string> {
  const s = requireStripe();

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  });

  if (!subscription) {
    throw new NotFoundError('No billing account found for this organization');
  }

  const session = await s.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Get the subscription details for an organization
 */
export async function getSubscription(organizationId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  const plan = subscription?.plan || 'free';
  const planDetails = PLANS[plan] || PLANS.free;

  return { subscription, plan: planDetails };
}

/**
 * Get plan usage stats for an organization
 */
export async function getPlanUsage(organizationId: string): Promise<PlanUsage> {
  const [memberCount, projectCount] = await Promise.all([
    prisma.organizationMember.count({ where: { organizationId } }),
    prisma.project.count({ where: { organizationId } }),
  ]);

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { plan: true },
  });

  const plan = subscription?.plan || 'free';
  const limits = PLANS[plan]?.limits || PLANS['free']!.limits;

  return {
    members: { current: memberCount, limit: limits.members },
    projects: { current: projectCount, limit: limits.projects },
  };
}

/**
 * List invoices for an organization's Stripe customer
 */
export async function listInvoices(organizationId: string, limit = 10): Promise<Invoice[]> {
  const s = requireStripe();

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  });

  if (!subscription) {
    return [];
  }

  const invoices = await s.invoices.list({
    customer: subscription.stripeCustomerId,
    limit,
  });

  return invoices.data.map((inv) => ({
    id: inv.id,
    number: inv.number,
    status: inv.status,
    amountDue: inv.amount_due,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    created: inv.created,
    periodStart: inv.period_start,
    periodEnd: inv.period_end,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    invoicePdf: inv.invoice_pdf ?? null,
  }));
}

/**
 * Check if an organization can perform an action based on plan limits
 */
export async function checkPlanLimit(
  organizationId: string,
  resource: 'members' | 'projects',
): Promise<boolean> {
  const usage = await getPlanUsage(organizationId);
  const { current, limit } = usage[resource];
  return limit === -1 || current < limit;
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(payload: Buffer, signature: string): Promise<void> {
  const s = requireStripe();

  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw new BadRequestError('Invalid webhook signature');
  }

  logger.info(`Processing Stripe webhook: ${event.type}`);

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(sub);
      break;
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      logger.info(`Checkout session completed for customer ${session.customer}`, {
        sessionId: session.id,
        subscriptionId: session.subscription,
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      logger.warn(`Payment failed for customer ${invoice.customer}`, {
        invoiceId: invoice.id,
      });
      break;
    }
    default:
      logger.info(`Unhandled Stripe event type: ${event.type}`);
  }
}

/**
 * Sync a Stripe subscription to the database
 */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const plan = (sub.metadata.plan as BillingPlan) || 'pro';
  const firstItem = sub.items.data[0];
  const priceId = firstItem?.price?.id || null;
  const interval = firstItem?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly';
  const periodStart = firstItem?.current_period_start;
  const periodEnd = firstItem?.current_period_end;

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      status: sub.status,
      plan,
      billingInterval: interval,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    },
  });

  // The paywall reads a Redis-cached view of this row. Without invalidating
  // here, a cancellation or downgrade keeps serving the old answer for up to
  // the cache TTL — the org would retain access it no longer has.
  await invalidateSubscriptionCacheForCustomer(customerId);

  logger.info(`Synced subscription ${sub.id} for customer ${customerId}`, {
    plan,
    status: sub.status,
  });
}

/**
 * Handle subscription deletion (cancellation)
 */
export async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      status: 'canceled',
      plan: 'free',
      stripeSubscriptionId: null,
      stripePriceId: null,
      billingInterval: null,
      cancelAtPeriodEnd: false,
      canceledAt: new Date(),
    },
  });

  await invalidateSubscriptionCacheForCustomer(customerId);

  logger.info(`Subscription canceled for customer ${customerId}`);
}

/**
 * Drop the cached subscription state for whichever organization owns this
 * Stripe customer. The webhook only knows the customer id, so resolve it back
 * to the organization first.
 */
async function invalidateSubscriptionCacheForCustomer(customerId: string): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { organizationId: true },
  });
  if (subscription) {
    await invalidateSubscriptionCache(subscription.organizationId);
  }
}
