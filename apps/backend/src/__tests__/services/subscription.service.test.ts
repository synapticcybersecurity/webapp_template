import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockPrisma = {
  subscription: { findFirst: vi.fn() },
  organization: { findUnique: vi.fn() },
};
const mockRedis = {
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
};
let redisAvailable = true;

vi.mock('../../config/database.js', () => ({ prisma: mockPrisma }));
vi.mock('../../config/redis.js', () => ({
  getRedisClient: () => (redisAvailable ? mockRedis : null),
  isRedisConnected: () => redisAvailable,
}));

const { getOrgSubscriptionInfo, invalidateSubscriptionCache } =
  await import('../../services/subscription.service.js');

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  redisAvailable = true;
  mockRedis.get.mockResolvedValue(null);
});

describe('getOrgSubscriptionInfo', () => {
  it('reports an active paid subscription', async () => {
    const periodEnd = new Date(Date.now() + 30 * DAY);
    mockPrisma.subscription.findFirst.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });

    const info = await getOrgSubscriptionInfo('org-a');

    expect(info.isActive).toBe(true);
    expect(info.plan).toBe('pro');
    expect(info.periodEnd).toBe(periodEnd.toISOString());
  });

  it('treats past_due as still entitled', async () => {
    // Dunning is a billing problem, not an access problem — cutting a
    // customer off the moment a card fails is worse than a few days grace.
    mockPrisma.subscription.findFirst.mockResolvedValue({
      plan: 'pro',
      status: 'past_due',
      currentPeriodEnd: new Date(Date.now() + DAY),
      cancelAtPeriodEnd: false,
    });

    await expect(getOrgSubscriptionInfo('org-a')).resolves.toMatchObject({
      isActive: true,
      status: 'past_due',
    });
  });

  it('falls back to a live free trial when there is no subscription', async () => {
    const trialEndsAt = new Date(Date.now() + 7 * DAY);
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    mockPrisma.organization.findUnique.mockResolvedValue({ trialEndsAt });

    const info = await getOrgSubscriptionInfo('org-a');

    expect(info).toMatchObject({ isActive: true, plan: 'trial', status: 'trialing' });
    expect(info.trialEndsAt).toBe(trialEndsAt.toISOString());
  });

  it('reports expired once the trial has passed', async () => {
    const trialEndsAt = new Date(Date.now() - DAY);
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    mockPrisma.organization.findUnique.mockResolvedValue({ trialEndsAt });

    await expect(getOrgSubscriptionInfo('org-a')).resolves.toMatchObject({
      isActive: false,
      status: 'expired',
      plan: null,
    });
  });

  it('reports expired when there is no subscription and no trial', async () => {
    // Null trialEndsAt means "no trial", never "unlimited trial".
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    mockPrisma.organization.findUnique.mockResolvedValue({ trialEndsAt: null });

    await expect(getOrgSubscriptionInfo('org-a')).resolves.toMatchObject({ isActive: false });
  });

  it('serves a cache hit without touching the database', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ isActive: true, plan: 'pro' }));

    await expect(getOrgSubscriptionInfo('org-a')).resolves.toMatchObject({ isActive: true });
    expect(mockPrisma.subscription.findFirst).not.toHaveBeenCalled();
  });

  it('writes through to the cache on a miss', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    mockPrisma.organization.findUnique.mockResolvedValue({ trialEndsAt: null });

    await getOrgSubscriptionInfo('org-a');

    expect(mockRedis.setEx).toHaveBeenCalledWith('subscription:org-a', 300, expect.any(String));
  });

  it('works with Redis unavailable', async () => {
    // Redis is optional in this template; losing it must degrade to a
    // database read, never to a denial.
    redisAvailable = false;
    mockPrisma.subscription.findFirst.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + DAY),
      cancelAtPeriodEnd: false,
    });

    await expect(getOrgSubscriptionInfo('org-a')).resolves.toMatchObject({ isActive: true });
  });

  it('falls through to the database when a cache read throws', async () => {
    mockRedis.get.mockRejectedValue(new Error('redis exploded'));
    mockPrisma.subscription.findFirst.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + DAY),
      cancelAtPeriodEnd: false,
    });

    await expect(getOrgSubscriptionInfo('org-a')).resolves.toMatchObject({ isActive: true });
  });

  it('does not fail the request when a cache write throws', async () => {
    mockRedis.setEx.mockRejectedValue(new Error('redis full'));
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    mockPrisma.organization.findUnique.mockResolvedValue({ trialEndsAt: null });

    await expect(getOrgSubscriptionInfo('org-a')).resolves.toMatchObject({ isActive: false });
  });
});

describe('invalidateSubscriptionCache', () => {
  it('deletes the cached entry', async () => {
    await invalidateSubscriptionCache('org-a');
    expect(mockRedis.del).toHaveBeenCalledWith('subscription:org-a');
  });

  it('is a no-op when Redis is unavailable', async () => {
    redisAvailable = false;
    await expect(invalidateSubscriptionCache('org-a')).resolves.toBeUndefined();
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it('swallows a Redis failure rather than breaking the webhook', async () => {
    mockRedis.del.mockRejectedValue(new Error('redis down'));
    await expect(invalidateSubscriptionCache('org-a')).resolves.toBeUndefined();
  });
});
