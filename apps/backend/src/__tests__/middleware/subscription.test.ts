import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockPrisma = {
  organizationMember: { findFirst: vi.fn() },
};
const mockGetOrgSubscriptionInfo = vi.fn();

vi.mock('../../config/database.js', () => ({ prisma: mockPrisma }));
vi.mock('../../services/subscription.service.js', () => ({
  getOrgSubscriptionInfo: mockGetOrgSubscriptionInfo,
}));

const { requireActiveSubscription } = await import('../../middleware/subscription.middleware.js');

function makeRequest(userOverrides: Record<string, unknown> = {}): Request {
  return {
    user: {
      id: 'user-1',
      role: 'user',
      session: { id: 's1', activeOrganizationId: null, impersonatedBy: null },
      ...userOverrides,
    },
  } as unknown as Request;
}

function makeResponse() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: any };
}

const ORIGINAL_STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_configured';
});

afterEach(() => {
  if (ORIGINAL_STRIPE_KEY === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ORIGINAL_STRIPE_KEY;
});

describe('requireActiveSubscription', () => {
  it('is a no-op when billing is not configured', async () => {
    // The template must be usable without Stripe credentials; otherwise a
    // fresh clone paywalls itself on first run.
    delete process.env.STRIPE_SECRET_KEY;
    const next = vi.fn() as NextFunction;

    await requireActiveSubscription()(makeRequest(), makeResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(mockGetOrgSubscriptionInfo).not.toHaveBeenCalled();
  });

  it('lets platform admins through regardless of billing state', async () => {
    const next = vi.fn() as NextFunction;
    const req = makeRequest({ role: 'admin' });

    await requireActiveSubscription()(req, makeResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(mockGetOrgSubscriptionInfo).not.toHaveBeenCalled();
  });

  it('passes a user with no organization through to the access-control layer', async () => {
    // This gate is a paywall, not access control — a user with no org gets a
    // meaningful error downstream instead of a misleading billing prompt.
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
    const next = vi.fn() as NextFunction;

    await requireActiveSubscription()(makeRequest(), makeResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(mockGetOrgSubscriptionInfo).not.toHaveBeenCalled();
  });

  it('allows an organization with an active subscription', async () => {
    mockPrisma.organizationMember.findFirst.mockResolvedValue({ organizationId: 'org-a' });
    mockGetOrgSubscriptionInfo.mockResolvedValue({ isActive: true, trialEndsAt: null });
    const next = vi.fn() as NextFunction;

    await requireActiveSubscription()(makeRequest(), makeResponse(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks an expired organization with SUBSCRIPTION_REQUIRED', async () => {
    mockPrisma.organizationMember.findFirst.mockResolvedValue({ organizationId: 'org-a' });
    mockGetOrgSubscriptionInfo.mockResolvedValue({
      isActive: false,
      trialEndsAt: '2020-01-01T00:00:00.000Z',
    });
    const next = vi.fn() as NextFunction;
    const res = makeResponse();

    await requireActiveSubscription()(makeRequest(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    // The frontend interceptor keys on this exact code to route to billing
    // rather than treating it as a generic permission failure.
    expect(res.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
    expect(res.body.error.trialEndsAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('prefers the session active organization over membership order', async () => {
    mockGetOrgSubscriptionInfo.mockResolvedValue({ isActive: true, trialEndsAt: null });
    const req = makeRequest({
      session: { id: 's1', activeOrganizationId: 'org-scoped', impersonatedBy: null },
    });
    const next = vi.fn() as NextFunction;

    await requireActiveSubscription()(req, makeResponse(), next);

    expect(mockGetOrgSubscriptionInfo).toHaveBeenCalledWith('org-scoped');
    expect(mockPrisma.organizationMember.findFirst).not.toHaveBeenCalled();
  });

  it('forwards unexpected errors instead of failing open', async () => {
    // A lookup failure must not silently grant access.
    mockPrisma.organizationMember.findFirst.mockRejectedValue(new Error('db down'));
    const next = vi.fn() as NextFunction;

    await requireActiveSubscription()(makeRequest(), makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
