import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted so these are available when vi.mock factories run
const { mockPrisma, mockStripe } = vi.hoisted(() => {
  const mockFn = () => vi.fn();
  return {
    mockPrisma: {
      subscription: { findUnique: mockFn(), create: mockFn(), updateMany: mockFn() },
      organization: { findUnique: mockFn() },
      organizationMember: { findUnique: mockFn(), count: mockFn() },
      project: { count: mockFn() },
    },
    mockStripe: {
      customers: { create: mockFn() },
      checkout: { sessions: { create: mockFn() } },
      billingPortal: { sessions: { create: mockFn() } },
      webhooks: { constructEvent: mockFn() },
    },
  };
});

vi.mock('../../config/database.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../config/stripe.js', () => ({
  stripe: mockStripe,
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  PLANS: {
    free: {
      id: 'free',
      name: 'Free',
      limits: { members: 3, projects: 5, storage: 100 },
      pricing: { monthly: 0, yearly: 0 },
      stripePriceIds: { monthly: null, yearly: null },
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      limits: { members: 20, projects: -1, storage: 10240 },
      pricing: { monthly: 2900, yearly: 29000 },
      stripePriceIds: { monthly: 'price_pro_monthly', yearly: 'price_pro_yearly' },
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      limits: { members: -1, projects: -1, storage: -1 },
      pricing: { monthly: 9900, yearly: 99000 },
      stripePriceIds: { monthly: 'price_ent_monthly', yearly: 'price_ent_yearly' },
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  getPlanUsage,
  checkPlanLimit,
  handleWebhookEvent,
  syncSubscription,
  handleSubscriptionDeleted,
} from '../../services/billing.service.js';

describe('Billing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // getOrCreateCustomer
  // =========================================================================
  describe('getOrCreateCustomer', () => {
    it('should return existing customer ID if subscription exists', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_existing',
      });

      const result = await getOrCreateCustomer('org-1');
      expect(result).toBe('cus_existing');
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });

    it('should create a new Stripe customer if no subscription exists', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue({
        name: 'Test Org',
        slug: 'test-org',
      });
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });
      mockPrisma.subscription.create.mockResolvedValue({});

      const result = await getOrCreateCustomer('org-1');
      expect(result).toBe('cus_new');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        name: 'Test Org',
        metadata: { organizationId: 'org-1', slug: 'test-org' },
      });
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          stripeCustomerId: 'cus_new',
          status: 'inactive',
          plan: 'free',
        },
      });
    });

    it('should throw NotFoundError if organization does not exist', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(getOrCreateCustomer('org-missing')).rejects.toThrow('Organization not found');
    });
  });

  // =========================================================================
  // createCheckoutSession
  // =========================================================================
  describe('createCheckoutSession', () => {
    it('should create a checkout session with correct parameters', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session',
      });

      const result = await createCheckoutSession(
        'org-1',
        'pro',
        'monthly',
        'https://app.com/success',
        'https://app.com/cancel'
      );

      expect(result).toBe('https://checkout.stripe.com/session');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_1',
        mode: 'subscription',
        line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel',
        metadata: { organizationId: 'org-1', plan: 'pro', interval: 'monthly' },
        subscription_data: { metadata: { organizationId: 'org-1', plan: 'pro' } },
      });
    });

    it('should throw BadRequestError for invalid plan', async () => {
      await expect(
        createCheckoutSession('org-1', 'invalid' as any, 'monthly', '', '')
      ).rejects.toThrow('Invalid plan');
    });

    it('should throw BadRequestError if no price ID configured', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });
      // Free plan has null price IDs
      await expect(
        createCheckoutSession('org-1', 'free' as any, 'monthly', '', '')
      ).rejects.toThrow('No monthly price configured');
    });

    it('should throw if checkout session has no URL', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({ url: null });

      await expect(createCheckoutSession('org-1', 'pro', 'monthly', '', '')).rejects.toThrow(
        'Failed to create checkout session'
      );
    });

    it('should use yearly price when interval is yearly', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session',
      });

      await createCheckoutSession('org-1', 'pro', 'yearly', '', '');

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_pro_yearly', quantity: 1 }],
        })
      );
    });
  });

  // =========================================================================
  // createPortalSession
  // =========================================================================
  describe('createPortalSession', () => {
    it('should create a portal session', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      });

      const result = await createPortalSession('org-1', 'https://app.com/billing');
      expect(result).toBe('https://billing.stripe.com/portal');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_1',
        return_url: 'https://app.com/billing',
      });
    });

    it('should throw NotFoundError if no subscription exists', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(createPortalSession('org-1', 'https://app.com/billing')).rejects.toThrow(
        'No billing account found'
      );
    });
  });

  // =========================================================================
  // getSubscription
  // =========================================================================
  describe('getSubscription', () => {
    it('should return subscription and plan details', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        plan: 'pro',
        status: 'active',
      });

      const result = await getSubscription('org-1');
      expect(result.subscription).toEqual({ plan: 'pro', status: 'active' });
      expect(result.plan.id).toBe('pro');
    });

    it('should default to free plan if no subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await getSubscription('org-1');
      expect(result.subscription).toBeNull();
      expect(result.plan.id).toBe('free');
    });
  });

  // =========================================================================
  // getPlanUsage
  // =========================================================================
  describe('getPlanUsage', () => {
    it('should return member and project counts with limits', async () => {
      mockPrisma.organizationMember.count.mockResolvedValue(2);
      mockPrisma.project.count.mockResolvedValue(3);
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });

      const result = await getPlanUsage('org-1');
      expect(result).toEqual({
        members: { current: 2, limit: 3 },
        projects: { current: 3, limit: 5 },
      });
    });

    it('should use unlimited limits for enterprise plan', async () => {
      mockPrisma.organizationMember.count.mockResolvedValue(50);
      mockPrisma.project.count.mockResolvedValue(100);
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'enterprise' });

      const result = await getPlanUsage('org-1');
      expect(result.members.limit).toBe(-1);
      expect(result.projects.limit).toBe(-1);
    });

    it('should default to free plan limits if no subscription', async () => {
      mockPrisma.organizationMember.count.mockResolvedValue(1);
      mockPrisma.project.count.mockResolvedValue(1);
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await getPlanUsage('org-1');
      expect(result.members.limit).toBe(3);
      expect(result.projects.limit).toBe(5);
    });
  });

  // =========================================================================
  // checkPlanLimit
  // =========================================================================
  describe('checkPlanLimit', () => {
    it('should return true when under limit', async () => {
      mockPrisma.organizationMember.count.mockResolvedValue(1);
      mockPrisma.project.count.mockResolvedValue(1);
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });

      const result = await checkPlanLimit('org-1', 'members');
      expect(result).toBe(true);
    });

    it('should return false when at limit', async () => {
      mockPrisma.organizationMember.count.mockResolvedValue(3);
      mockPrisma.project.count.mockResolvedValue(1);
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });

      const result = await checkPlanLimit('org-1', 'members');
      expect(result).toBe(false);
    });

    it('should always return true for unlimited plans (-1)', async () => {
      mockPrisma.organizationMember.count.mockResolvedValue(999);
      mockPrisma.project.count.mockResolvedValue(999);
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'enterprise' });

      const result = await checkPlanLimit('org-1', 'members');
      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // handleWebhookEvent
  // =========================================================================
  describe('handleWebhookEvent', () => {
    it('should throw BadRequestError for invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(handleWebhookEvent(Buffer.from('{}'), 'invalid-sig')).rejects.toThrow(
        'Invalid webhook signature'
      );
    });

    it('should process customer.subscription.created event', async () => {
      const mockSub = {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        metadata: { plan: 'pro' },
        items: {
          data: [
            {
              price: { id: 'price_pro_monthly', recurring: { interval: 'month' } },
              current_period_start: 1700000000,
              current_period_end: 1702592000,
            },
          ],
        },
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
      };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.created',
        data: { object: mockSub },
      });
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });

      await handleWebhookEvent(Buffer.from('{}'), 'valid-sig');
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_1' },
        data: expect.objectContaining({
          stripeSubscriptionId: 'sub_1',
          status: 'active',
          plan: 'pro',
          billingInterval: 'monthly',
        }),
      });
    });

    it('should process customer.subscription.updated event', async () => {
      const mockSub = {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        metadata: { plan: 'enterprise' },
        items: {
          data: [
            {
              price: { id: 'price_ent_yearly', recurring: { interval: 'year' } },
              current_period_start: 1700000000,
              current_period_end: 1731536000,
            },
          ],
        },
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
      };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: mockSub },
      });
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });

      await handleWebhookEvent(Buffer.from('{}'), 'valid-sig');
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_1' },
        data: expect.objectContaining({
          plan: 'enterprise',
          billingInterval: 'yearly',
        }),
      });
    });

    it('should process customer.subscription.deleted event', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: { id: 'sub_1', customer: 'cus_1' },
        },
      });
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });

      await handleWebhookEvent(Buffer.from('{}'), 'valid-sig');
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_1' },
        data: expect.objectContaining({
          status: 'canceled',
          plan: 'free',
          stripeSubscriptionId: null,
        }),
      });
    });

    it('should process checkout.session.completed event', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_1',
            customer: 'cus_1',
            subscription: 'sub_1',
          },
        },
      });

      await handleWebhookEvent(Buffer.from('{}'), 'valid-sig');
      // Should not throw — just logs
    });

    it('should process invoice.payment_failed event', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: { id: 'inv_1', customer: 'cus_1' },
        },
      });

      await handleWebhookEvent(Buffer.from('{}'), 'valid-sig');
      // Should not throw — just logs warning
    });

    it('should handle unrecognized event types gracefully', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'some.unknown.event',
        data: { object: {} },
      });

      await handleWebhookEvent(Buffer.from('{}'), 'valid-sig');
      // Should not throw
    });
  });

  // =========================================================================
  // syncSubscription
  // =========================================================================
  describe('syncSubscription', () => {
    it('should sync subscription data to database', async () => {
      const sub = {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        metadata: { plan: 'pro' },
        items: {
          data: [
            {
              price: { id: 'price_pro_monthly', recurring: { interval: 'month' } },
              current_period_start: 1700000000,
              current_period_end: 1702592000,
            },
          ],
        },
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
      };

      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });

      await syncSubscription(sub as any);

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_1' },
        data: {
          stripeSubscriptionId: 'sub_1',
          stripePriceId: 'price_pro_monthly',
          status: 'active',
          plan: 'pro',
          billingInterval: 'monthly',
          currentPeriodStart: new Date(1700000000 * 1000),
          currentPeriodEnd: new Date(1702592000 * 1000),
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialStart: null,
          trialEnd: null,
        },
      });
    });

    it('should handle customer as object (not string)', async () => {
      const sub = {
        id: 'sub_2',
        customer: { id: 'cus_2' },
        status: 'active',
        metadata: {},
        items: { data: [] },
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
      };

      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
      await syncSubscription(sub as any);

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: 'cus_2' },
        })
      );
    });

    it('should default plan to pro when metadata.plan is missing', async () => {
      const sub = {
        id: 'sub_3',
        customer: 'cus_3',
        status: 'active',
        metadata: {},
        items: { data: [] },
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
      };

      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
      await syncSubscription(sub as any);

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plan: 'pro' }),
        })
      );
    });
  });

  // =========================================================================
  // handleSubscriptionDeleted
  // =========================================================================
  describe('handleSubscriptionDeleted', () => {
    it('should reset subscription to free plan', async () => {
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });

      await handleSubscriptionDeleted({
        id: 'sub_1',
        customer: 'cus_1',
      } as any);

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_1' },
        data: {
          status: 'canceled',
          plan: 'free',
          stripeSubscriptionId: null,
          stripePriceId: null,
          billingInterval: null,
          cancelAtPeriodEnd: false,
          canceledAt: expect.any(Date),
        },
      });
    });

    it('should handle customer as object', async () => {
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });

      await handleSubscriptionDeleted({
        id: 'sub_2',
        customer: { id: 'cus_2' },
      } as any);

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: 'cus_2' },
        })
      );
    });
  });
});
