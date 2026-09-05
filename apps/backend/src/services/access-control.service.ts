/**
 * Tenant access control — the single place that answers "which organizations
 * is this request allowed to see?".
 *
 * Every tenant-scoped query must derive its filter from `getAccessibleOrgIds`
 * rather than hand-rolling a membership lookup. Before this existed each
 * controller re-implemented scoping inline and they disagreed with each other,
 * which is exactly how cross-tenant leaks happen.
 *
 * The return type deserves attention: `string[] | null`.
 *
 *   - `string[]` (possibly empty) — scope to exactly these org IDs. An empty
 *     array means the caller can see nothing, and MUST still be applied as a
 *     filter. Prisma's `{ in: [] }` correctly matches zero rows.
 *   - `null` — platform-wide, no filter. Only ever returned for a system admin
 *     who has not scoped themselves to one tenant.
 *
 * `null` is a deliberate sentinel, not "unknown". Passing it into a Prisma
 * `in` clause would throw rather than silently widen, but callers should never
 * get that far: use `orgScopeWhere` / `assertOrgAccess` below, which handle
 * the three cases explicitly, instead of branching on the raw value.
 */

import type { Request } from 'express';
import { prisma } from '../config/database.js';
import { ForbiddenError } from '../utils/errors.js';

export interface AccessContext {
  userId: string;
  role: string | null | undefined;
  /** Session-scoped tenant. Set by the org switcher; null means unscoped. */
  activeOrganizationId: string | null;
}

/** True when the caller is a platform administrator, not merely an org admin. */
export function isSystemAdmin(ctx: AccessContext): boolean {
  return ctx.role === 'admin';
}

/**
 * Organizations this request may touch.
 *
 * Admin with an active org  -> just that org (admins scope themselves to debug
 *                              a single tenant without seeing the others).
 * Admin with no active org  -> null, meaning platform-wide.
 * Everyone else             -> every org they hold a membership in, ignoring
 *                              activeOrganizationId entirely. A non-admin must
 *                              never widen their own scope by setting it, so
 *                              it is not consulted here at all.
 */
export async function getAccessibleOrgIds(ctx: AccessContext): Promise<string[] | null> {
  if (isSystemAdmin(ctx)) {
    return ctx.activeOrganizationId ? [ctx.activeOrganizationId] : null;
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: ctx.userId },
    select: { organizationId: true },
  });
  return memberships.map((m) => m.organizationId);
}

/**
 * Build the `organizationId` fragment of a Prisma `where` clause.
 *
 * Returns `{}` for platform-wide access so it can be spread unconditionally:
 *
 *   where: { ...(await orgScopeWhere(ctx)), status: 'active' }
 *
 * This is the reason `null` never reaches a query builder.
 */
export async function orgScopeWhere(ctx: AccessContext): Promise<Record<string, unknown>> {
  const orgIds = await getAccessibleOrgIds(ctx);
  if (orgIds === null) return {};
  return { organizationId: { in: orgIds } };
}

/** Whether the caller may act within one specific organization. */
export async function canAccessOrganization(
  ctx: AccessContext,
  organizationId: string,
): Promise<boolean> {
  const orgIds = await getAccessibleOrgIds(ctx);
  if (orgIds === null) return true;
  return orgIds.includes(organizationId);
}

/** Throwing form of `canAccessOrganization`, for use at the top of handlers. */
export async function assertOrgAccess(ctx: AccessContext, organizationId: string): Promise<void> {
  if (!(await canAccessOrganization(ctx, organizationId))) {
    throw new ForbiddenError('You do not have access to this organization');
  }
}

/**
 * The caller's role within one organization: 'owner' | 'admin' | 'member',
 * or null if they hold no membership.
 *
 * A platform admin gets 'owner' so that owner-gated actions work while they
 * are scoped into a tenant for support. That is a real privilege grant, and
 * the reason those routes are expected to write an audit log.
 */
export async function getOrgRole(
  ctx: AccessContext,
  organizationId: string,
): Promise<string | null> {
  if (isSystemAdmin(ctx)) return 'owner';

  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: ctx.userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

/** Assert the caller holds one of `roles` within the organization. */
export async function assertOrgRole(
  ctx: AccessContext,
  organizationId: string,
  roles: readonly string[],
): Promise<void> {
  const role = await getOrgRole(ctx, organizationId);
  if (!role || !roles.includes(role)) {
    throw new ForbiddenError(
      `This action requires one of the following organization roles: ${roles.join(', ')}`,
    );
  }
}

/**
 * Lift an authenticated request into an AccessContext.
 *
 * Throws rather than returning a guest context: reaching here without
 * `req.user` means the route forgot `requireAuth`, and defaulting to an empty
 * scope would hide that bug behind empty result sets instead of surfacing it.
 */
export function ctxFromRequest(req: Request): AccessContext {
  if (!req.user) {
    throw new Error(
      'ctxFromRequest called without an authenticated user — is requireAuth mounted on this route?',
    );
  }
  return {
    userId: req.user.id,
    role: req.user.role ?? null,
    activeOrganizationId: req.user.session.activeOrganizationId ?? null,
  };
}
