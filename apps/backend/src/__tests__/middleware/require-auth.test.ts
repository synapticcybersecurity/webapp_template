/**
 * requireAuth's contract beyond "is there a session": it must read ban state
 * and tenant scope from the database rather than from Better Auth's
 * cookie-cached session snapshot.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockPrisma = {
  session: { findUnique: vi.fn(), deleteMany: vi.fn() },
  user: { update: vi.fn() },
};
const mockGetSession = vi.fn();

vi.mock('../../config/database.js', () => ({ prisma: mockPrisma }));
vi.mock('../../config/auth.config.js', () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));
vi.mock('better-auth/node', () => ({ fromNodeHeaders: () => ({}) }));

const { requireAuth } = await import('../../middleware/auth.middleware.js');
const { UnauthorizedError, ForbiddenError } = await import('../../utils/errors.js');

const CACHED_SESSION = {
  user: {
    id: 'user-1',
    email: 'a@example.com',
    name: 'A',
    role: 'admin',
    emailVerified: true,
  },
  session: {
    id: 'sess-1',
    expiresAt: new Date(Date.now() + 86400000),
    // Deliberately stale: this is what a 5-minute cookie cache would report
    // after the scope was changed in the database.
    activeOrganizationId: 'org-STALE',
    impersonatedBy: null,
  },
};

const req = () => ({ headers: {} }) as unknown as Request;
const res = () => ({}) as Response;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(CACHED_SESSION);
});

describe('requireAuth', () => {
  it('rejects when there is no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const next = vi.fn() as NextFunction;

    await requireAuth(req(), res(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('rejects when the session row is gone even though the cookie is valid', async () => {
    // A revoked session must not keep working for the life of the cookie cache.
    mockPrisma.session.findUnique.mockResolvedValue(null);
    const next = vi.fn() as NextFunction;

    await requireAuth(req(), res(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('takes tenant scope from the database, not the cached session', async () => {
    // The regression this guards: the admin switches scope, the database is
    // updated, but the cookie still says the old tenant. Trusting the cookie
    // means the access-control layer filters by the wrong organization.
    mockPrisma.session.findUnique.mockResolvedValue({
      activeOrganizationId: 'org-FRESH',
      impersonatedBy: null,
      user: { banned: false, banReason: null, banExpires: null },
    });
    const request = req();
    const next = vi.fn() as NextFunction;

    await requireAuth(request, res(), next);

    expect(next).toHaveBeenCalledWith();
    expect(request.user?.session.activeOrganizationId).toBe('org-FRESH');
    expect(request.user?.session.activeOrganizationId).not.toBe('org-STALE');
  });

  it('surfaces impersonation state from the database', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({
      activeOrganizationId: null,
      impersonatedBy: 'admin-9',
      user: { banned: false, banReason: null, banExpires: null },
    });
    const request = req();

    await requireAuth(request, res(), vi.fn() as NextFunction);

    expect(request.user?.session.impersonatedBy).toBe('admin-9');
  });

  it('rejects a banned user and revokes their sessions', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({
      activeOrganizationId: null,
      impersonatedBy: null,
      user: { banned: true, banReason: 'abuse', banExpires: null },
    });
    const next = vi.fn() as NextFunction;

    await requireAuth(req(), res(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('reports pending approval distinctly from an abuse ban', async () => {
    // Users land banned as the approval gate; telling them they are "banned"
    // is both wrong and alarming.
    mockPrisma.session.findUnique.mockResolvedValue({
      activeOrganizationId: null,
      impersonatedBy: null,
      user: { banned: true, banReason: 'pending_approval', banExpires: null },
    });
    const next = vi.fn() as NextFunction;

    await requireAuth(req(), res(), next);

    const error = (next as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Error;
    expect(error.message).toMatch(/pending admin approval/i);
  });

  it('clears an expired temporary ban and lets the request through', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({
      activeOrganizationId: null,
      impersonatedBy: null,
      user: { banned: true, banReason: 'timeout', banExpires: new Date(Date.now() - 1000) },
    });
    const next = vi.fn() as NextFunction;

    await requireAuth(req(), res(), next);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { banned: false, banReason: null, banExpires: null },
    });
    expect(next).toHaveBeenCalledWith();
  });
});
