/**
 * Access control is the tenant isolation boundary — these tests are the thing
 * standing between a scoping refactor and a cross-tenant data leak, so they
 * cover the sentinel semantics explicitly rather than just the happy path.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request } from 'express';

const mockPrisma = {
  organizationMember: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock('../../config/database.js', () => ({ prisma: mockPrisma }));

const {
  getAccessibleOrgIds,
  orgScopeWhere,
  canAccessOrganization,
  assertOrgAccess,
  getOrgRole,
  assertOrgRole,
  isSystemAdmin,
  ctxFromRequest,
} = await import('../../services/access-control.service.js');
const { ForbiddenError } = await import('../../utils/errors.js');

const member = { userId: 'user-1', role: 'user', activeOrganizationId: null };
const admin = { userId: 'admin-1', role: 'admin', activeOrganizationId: null };
const scopedAdmin = { userId: 'admin-1', role: 'admin', activeOrganizationId: 'org-a' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAccessibleOrgIds', () => {
  it('returns every organization a member belongs to', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'org-a' },
      { organizationId: 'org-b' },
    ]);

    await expect(getAccessibleOrgIds(member)).resolves.toEqual(['org-a', 'org-b']);
  });

  it('returns an empty array — not null — for a user with no memberships', async () => {
    // This distinction is the whole point of the sentinel. An empty array must
    // still be applied as a filter and match nothing; null would mean
    // "platform-wide" and expose every tenant.
    mockPrisma.organizationMember.findMany.mockResolvedValue([]);

    const result = await getAccessibleOrgIds(member);
    expect(result).toEqual([]);
    expect(result).not.toBeNull();
  });

  it('returns the null sentinel for an unscoped platform admin', async () => {
    await expect(getAccessibleOrgIds(admin)).resolves.toBeNull();
    expect(mockPrisma.organizationMember.findMany).not.toHaveBeenCalled();
  });

  it('narrows a platform admin to their active organization', async () => {
    await expect(getAccessibleOrgIds(scopedAdmin)).resolves.toEqual(['org-a']);
  });

  it('ignores activeOrganizationId for non-admins', async () => {
    // A non-admin must never widen their own scope by setting an active org
    // for a tenant they do not belong to.
    mockPrisma.organizationMember.findMany.mockResolvedValue([{ organizationId: 'org-b' }]);

    const result = await getAccessibleOrgIds({
      userId: 'user-1',
      role: 'user',
      activeOrganizationId: 'org-a-not-mine',
    });

    expect(result).toEqual(['org-b']);
  });
});

describe('orgScopeWhere', () => {
  it('produces an in-clause for a scoped user', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([{ organizationId: 'org-a' }]);

    await expect(orgScopeWhere(member)).resolves.toEqual({
      organizationId: { in: ['org-a'] },
    });
  });

  it('produces an empty in-clause for a user with no memberships', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([]);

    // Prisma matches zero rows for `{ in: [] }`, which is the correct
    // "sees nothing" behavior.
    await expect(orgScopeWhere(member)).resolves.toEqual({ organizationId: { in: [] } });
  });

  it('produces an empty object for a platform-wide admin', async () => {
    // Spreadable into any where clause without widening it — this is why the
    // null sentinel never reaches a query builder.
    await expect(orgScopeWhere(admin)).resolves.toEqual({});
  });
});

describe('canAccessOrganization', () => {
  it('allows an org the user belongs to', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([{ organizationId: 'org-a' }]);
    await expect(canAccessOrganization(member, 'org-a')).resolves.toBe(true);
  });

  it('denies an org the user does not belong to', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([{ organizationId: 'org-a' }]);
    await expect(canAccessOrganization(member, 'org-b')).resolves.toBe(false);
  });

  it('allows any org for an unscoped platform admin', async () => {
    await expect(canAccessOrganization(admin, 'any-org')).resolves.toBe(true);
  });

  it('denies an org outside a scoped admin’s active scope', async () => {
    await expect(canAccessOrganization(scopedAdmin, 'org-b')).resolves.toBe(false);
  });
});

describe('assertOrgAccess', () => {
  it('throws ForbiddenError when access is denied', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([]);
    await expect(assertOrgAccess(member, 'org-a')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('resolves silently when access is allowed', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([{ organizationId: 'org-a' }]);
    await expect(assertOrgAccess(member, 'org-a')).resolves.toBeUndefined();
  });
});

describe('getOrgRole', () => {
  it('returns the membership role', async () => {
    mockPrisma.organizationMember.findUnique.mockResolvedValue({ role: 'admin' });
    await expect(getOrgRole(member, 'org-a')).resolves.toBe('admin');
  });

  it('returns null when there is no membership', async () => {
    mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
    await expect(getOrgRole(member, 'org-a')).resolves.toBeNull();
  });

  it('grants platform admins owner within any org', async () => {
    await expect(getOrgRole(admin, 'org-a')).resolves.toBe('owner');
    expect(mockPrisma.organizationMember.findUnique).not.toHaveBeenCalled();
  });
});

describe('assertOrgRole', () => {
  it('allows a permitted role', async () => {
    mockPrisma.organizationMember.findUnique.mockResolvedValue({ role: 'owner' });
    await expect(assertOrgRole(member, 'org-a', ['owner'])).resolves.toBeUndefined();
  });

  it('rejects an insufficient role', async () => {
    mockPrisma.organizationMember.findUnique.mockResolvedValue({ role: 'member' });
    await expect(assertOrgRole(member, 'org-a', ['owner', 'admin'])).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('rejects a non-member', async () => {
    mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
    await expect(assertOrgRole(member, 'org-a', ['member'])).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('isSystemAdmin', () => {
  it('distinguishes platform admin from organization role', () => {
    expect(isSystemAdmin(admin)).toBe(true);
    // 'admin' here would be an *organization* role, which is not a platform role.
    expect(isSystemAdmin({ userId: 'u', role: 'user', activeOrganizationId: null })).toBe(false);
    expect(isSystemAdmin({ userId: 'u', role: null, activeOrganizationId: null })).toBe(false);
  });
});

describe('ctxFromRequest', () => {
  it('lifts an authenticated request', () => {
    const req = {
      user: {
        id: 'user-1',
        role: 'user',
        session: { id: 's1', activeOrganizationId: 'org-a' },
      },
    } as unknown as Request;

    expect(ctxFromRequest(req)).toEqual({
      userId: 'user-1',
      role: 'user',
      activeOrganizationId: 'org-a',
    });
  });

  it('throws rather than returning an empty scope when requireAuth is missing', () => {
    // Silently returning a guest context would turn a routing bug into empty
    // result sets, which is much harder to notice than an exception.
    expect(() => ctxFromRequest({} as Request)).toThrow(/requireAuth/);
  });
});
