import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRequest, createMockResponse, createMockNext } from '../helpers/mock-request.js';

vi.mock('../../config/database.js', () => ({
  prisma: {
    organizationMember: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../config/stripe.js', () => ({
  PLANS: {
    free: { id: 'free', name: 'Free', limits: { members: 3, projects: 5, storage: 100 } },
    pro: { id: 'pro', name: 'Pro', limits: { members: 20, projects: -1, storage: 10240 } },
  },
}));

vi.mock('../../services/billing.service.js', () => ({
  getSubscription: vi.fn(),
  getPlanUsage: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  handleWebhookEvent: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  listPlans,
  getBillingOverview,
  createCheckout,
  createPortal,
  handleWebhook,
} from '../../controllers/billing.controller.js';
import * as billingService from '../../services/billing.service.js';
import { prisma } from '../../config/database.js';

describe('Billing Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPlans', () => {
    it('should return all plans', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await listPlans(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'free' }),
            expect.objectContaining({ id: 'pro' }),
          ]),
        }),
      );
    });
  });

  describe('getBillingOverview', () => {
    it('should return billing overview for org admin', async () => {
      const req = createMockRequest({
        params: { orgId: 'org-1' },
        user: { id: 'user-1', role: 'user' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      (prisma.organizationMember.findUnique as any).mockResolvedValue({
        role: 'owner',
      });
      (billingService.getSubscription as any).mockResolvedValue({
        subscription: { plan: 'free', status: 'inactive' },
        plan: { id: 'free', name: 'Free' },
      });
      (billingService.getPlanUsage as any).mockResolvedValue({
        members: { current: 1, limit: 3 },
        projects: { current: 2, limit: 5 },
      });

      await getBillingOverview(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            subscription: expect.any(Object),
            plan: expect.any(Object),
            usage: expect.any(Object),
          }),
        }),
      );
    });

    it('should reject non-admin/non-owner members', async () => {
      const req = createMockRequest({
        params: { orgId: 'org-1' },
        user: { id: 'user-1', role: 'user' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      (prisma.organizationMember.findUnique as any).mockResolvedValue({
        role: 'member',
      });

      await getBillingOverview(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
        }),
      );
    });

    it('should reject non-members', async () => {
      const req = createMockRequest({
        params: { orgId: 'org-1' },
        user: { id: 'user-1', role: 'user' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      (prisma.organizationMember.findUnique as any).mockResolvedValue(null);

      await getBillingOverview(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
        }),
      );
    });
  });

  describe('createCheckout', () => {
    it('should create a checkout session and return URL', async () => {
      const req = createMockRequest({
        params: { orgId: 'org-1' },
        body: { plan: 'pro', interval: 'monthly' },
        user: { id: 'user-1', role: 'user' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      (prisma.organizationMember.findUnique as any).mockResolvedValue({
        role: 'owner',
      });
      (billingService.createCheckoutSession as any).mockResolvedValue(
        'https://checkout.stripe.com/session',
      );

      await createCheckout(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { url: 'https://checkout.stripe.com/session' },
        }),
      );
    });

    it('should reject invalid plan in body', async () => {
      const req = createMockRequest({
        params: { orgId: 'org-1' },
        body: { plan: 'invalid', interval: 'monthly' },
        user: { id: 'user-1', role: 'user' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      (prisma.organizationMember.findUnique as any).mockResolvedValue({
        role: 'owner',
      });

      await createCheckout(req, res, next);

      // ZodError gets passed to next
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should require orgId parameter', async () => {
      const req = createMockRequest({
        params: {},
        body: { plan: 'pro', interval: 'monthly' },
        user: { id: 'user-1', role: 'user' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await createCheckout(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Organization ID is required' }),
      );
    });
  });

  describe('createPortal', () => {
    it('should create a portal session and return URL', async () => {
      const req = createMockRequest({
        params: { orgId: 'org-1' },
        user: { id: 'user-1', role: 'user' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      (prisma.organizationMember.findUnique as any).mockResolvedValue({
        role: 'admin',
      });
      (billingService.createPortalSession as any).mockResolvedValue(
        'https://billing.stripe.com/portal',
      );

      await createPortal(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { url: 'https://billing.stripe.com/portal' },
        }),
      );
    });
  });

  describe('handleWebhook', () => {
    it('should process webhook with valid signature', async () => {
      const req = createMockRequest({
        headers: { 'stripe-signature': 'valid-sig' },
        body: Buffer.from('{}'),
      });
      const res = createMockResponse();
      const next = createMockNext();

      (billingService.handleWebhookEvent as any).mockResolvedValue(undefined);

      await handleWebhook(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should return 400 if stripe-signature header is missing', async () => {
      const req = createMockRequest({
        headers: {},
        body: Buffer.from('{}'),
      });
      const res = createMockResponse();
      const next = createMockNext();

      await handleWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Missing stripe-signature header' }),
      );
    });
  });
});
