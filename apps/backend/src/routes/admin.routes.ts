/**
 * Platform-admin routes.
 *
 * Everything here is gated by requireAuth + requireAdmin. The session
 * active-org endpoints let an admin scope themselves to a single tenant for
 * support work; see services/access-control.service.ts for how that scope is
 * then applied to queries.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { NotFoundError } from '../utils/errors.js';
import { logAdminAction } from '../services/audit-log.service.js';
import { ApiResponse } from '@webapp/shared';

const router = Router();

router.use(requireAuth, requireAdmin);

const setActiveOrgSchema = z.object({ organizationId: z.string().min(1) });

/**
 * List organizations, for the scope switcher. Deliberately admin-only: it is
 * the one place a cross-tenant list of every organization is returned.
 */
router.get('/organizations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const organizations = await prisma.organization.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
      take: 50,
    });

    const response: ApiResponse = {
      success: true,
      data: { organizations },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * Scope this admin session to one organization.
 *
 * Writes Session.activeOrganizationId directly rather than going through Better
 * Auth's setActiveOrganization, which requires a membership row — the whole
 * point here is that a platform admin scopes into tenants they are not a member
 * of. Audit-logged for exactly that reason.
 */
router.post('/session/active-org', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = setActiveOrgSchema.parse(req.body);

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });
    if (!organization) throw new NotFoundError('Organization not found');

    await prisma.session.update({
      where: { id: req.user!.session.id },
      data: { activeOrganizationId: organizationId },
    });

    void logAdminAction(
      req.user!.id,
      'session_active_org_set',
      'organization',
      organizationId,
      { name: organization.name },
      req.ip,
    );

    const response: ApiResponse = {
      success: true,
      data: { activeOrganizationId: organizationId, organization },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/** Clear the scope; the admin returns to a platform-wide view. */
router.delete('/session/active-org', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const previous = req.user!.session.activeOrganizationId;

    await prisma.session.update({
      where: { id: req.user!.session.id },
      data: { activeOrganizationId: null },
    });

    void logAdminAction(
      req.user!.id,
      'session_active_org_cleared',
      'organization',
      previous,
      undefined,
      req.ip,
    );

    const response: ApiResponse = {
      success: true,
      data: { activeOrganizationId: null },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
