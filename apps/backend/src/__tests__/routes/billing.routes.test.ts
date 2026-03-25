import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  $disconnect: vi.fn(),
  subscription: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  organization: { findUnique: vi.fn() },
  organizationMember: { findUnique: vi.fn(), count: vi.fn() },
  project: { count: vi.fn() },
  user: { findUnique: vi.fn() },
  session: { deleteMany: vi.fn() },
}));

// Mock all heavy dependencies before importing the app
vi.mock('../../config/auth.config.js', () => ({
  auth: {
    api: { getSession: vi.fn() },
    handler: vi.fn(),
  },
}));

vi.mock('../../config/database.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../config/stripe.js', () => ({
  stripe: null,
  STRIPE_WEBHOOK_SECRET: '',
  PLANS: {
    free: {
      id: 'free',
      name: 'Free',
      description: 'Free plan',
      features: ['3 members'],
      limits: { members: 3, projects: 5, storage: 100 },
      pricing: { monthly: 0, yearly: 0 },
      stripePriceIds: { monthly: null, yearly: null },
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      description: 'Pro plan',
      features: ['20 members'],
      limits: { members: 20, projects: -1, storage: 10240 },
      pricing: { monthly: 2900, yearly: 29000 },
      stripePriceIds: { monthly: 'price_1', yearly: 'price_2' },
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  requestLogger: vi.fn((_req: any, _res: any, next: any) => next()),
}));

vi.mock('better-auth/node', () => ({
  toNodeHandler: () => (_req: any, _res: any, next: any) => next(),
  fromNodeHeaders: (headers: any) => headers,
}));

vi.mock('csrf-csrf', () => ({
  doubleCsrf: () => ({
    doubleCsrfProtection: (_req: any, _res: any, next: any) => next(),
    generateCsrfToken: () => 'test-csrf-token',
  }),
}));

import supertest from 'supertest';
import app from '../../app.js';
import { auth } from '../../config/auth.config.js';

const request = supertest(app);

describe('Billing Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/billing/plans', () => {
    it('should return plans without authentication', async () => {
      const res = await request.get('/api/billing/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'free' }),
          expect.objectContaining({ id: 'pro' }),
        ])
      );
    });
  });

  describe('GET /api/billing/:orgId', () => {
    it('should return 401 when not authenticated', async () => {
      (auth.api.getSession as any).mockResolvedValue(null);

      const res = await request.get('/api/billing/org-1');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/billing/:orgId/checkout', () => {
    it('should return 401 when not authenticated', async () => {
      (auth.api.getSession as any).mockResolvedValue(null);

      const res = await request
        .post('/api/billing/org-1/checkout')
        .send({ plan: 'pro', interval: 'monthly' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/billing/:orgId/portal', () => {
    it('should return 401 when not authenticated', async () => {
      (auth.api.getSession as any).mockResolvedValue(null);

      const res = await request.post('/api/billing/org-1/portal');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/billing/webhook', () => {
    it('should return 400 without stripe-signature header', async () => {
      const res = await request
        .post('/api/billing/webhook')
        .set('Content-Type', 'application/json')
        .send('{}');

      expect(res.status).toBe(400);
    });
  });
});
