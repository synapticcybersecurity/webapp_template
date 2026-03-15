import { describe, it, expect, vi } from 'vitest';

// Mock all heavy dependencies before importing the app
vi.mock('../../config/auth.config.js', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

vi.mock('../../config/database.js', () => ({
  prisma: {
    $disconnect: vi.fn(),
    subscription: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    organizationMember: { findUnique: vi.fn(), count: vi.fn() },
    project: { count: vi.fn() },
  },
}));

vi.mock('../../config/stripe.js', () => ({
  stripe: null,
  STRIPE_WEBHOOK_SECRET: '',
  PLANS: {},
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  requestLogger: vi.fn((_req: any, _res: any, next: any) => next()),
}));

vi.mock('better-auth/node', () => ({
  toNodeHandler: () => (_req: any, _res: any, next: any) => next(),
}));

import supertest from 'supertest';
import app from '../../app.js';

const request = supertest(app);

describe('Health Routes', () => {
  it('GET /health should return status ok', async () => {
    const res = await request.get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      })
    );
  });

  it('GET / should return API info', async () => {
    const res = await request.get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        name: 'Webapp Template API',
        version: '1.0.0',
        status: 'running',
      })
    );
  });
});
