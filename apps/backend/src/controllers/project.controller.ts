/**
 * Project Controller (Example Domain Model)
 *
 * Reference implementation for tenant-scoped CRUD. Every authorization
 * decision here goes through services/access-control.service.ts — no handler
 * queries organizationMember directly. Copy this shape for new domain models;
 * the previous version re-derived scoping inline in each handler and the five
 * copies had drifted apart.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import {
  assertOrgAccess,
  assertOrgRole,
  canAccessOrganization,
  ctxFromRequest,
  getAccessibleOrgIds,
  isSystemAdmin,
  type AccessContext,
} from '../services/access-control.service.js';
import {
  ApiResponse,
  PaginatedResponse,
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
} from '@webapp/shared';

/**
 * Whether the caller may see a project at all.
 *
 * Personal projects (no organizationId) belong to their creator alone —
 * organization scope says nothing about them. Org projects are visible to
 * anyone who can access the org.
 */
async function canReadProject(
  ctx: AccessContext,
  project: { createdBy: string; organizationId: string | null },
): Promise<boolean> {
  if (project.organizationId) {
    return canAccessOrganization(ctx, project.organizationId);
  }
  return project.createdBy === ctx.userId || isSystemAdmin(ctx);
}

export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');
    }
    const { name, description, organizationId } = parsed.data;
    const ctx = ctxFromRequest(req);

    if (organizationId) {
      await assertOrgAccess(ctx, organizationId);
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        organizationId: organizationId || null,
        createdBy: ctx.userId,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    const response: ApiResponse = {
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

/** List the caller's personal projects plus every project in reach. */
export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ctx = ctxFromRequest(req);
    const { page, limit, organizationId } = listProjectsQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const accessibleOrgIds = await getAccessibleOrgIds(ctx);

    let where: Record<string, unknown>;

    if (organizationId) {
      // Explicit org filter — authorize it rather than silently returning [].
      await assertOrgAccess(ctx, organizationId);
      where = { organizationId };
    } else if (accessibleOrgIds === null) {
      // Platform-wide admin: every org project, plus their own personal ones.
      where = {
        OR: [{ organizationId: { not: null } }, { createdBy: ctx.userId }],
      };
    } else {
      where = {
        OR: [
          { createdBy: ctx.userId, organizationId: null },
          { organizationId: { in: accessibleOrgIds } },
        ],
      };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    const response: ApiResponse<PaginatedResponse<unknown>> = {
      success: true,
      data: {
        items: projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const ctx = ctxFromRequest(req);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        tasks: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) throw new NotFoundError('Project not found');
    if (!(await canReadProject(ctx, project))) {
      throw new ForbiddenError('You do not have access to this project');
    }

    const response: ApiResponse = {
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/** Update: org projects need owner/admin; personal projects need the creator. */
export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');
    }
    const { name, description } = parsed.data;
    const ctx = ctxFromRequest(req);

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundError('Project not found');

    if (project.organizationId) {
      await assertOrgRole(ctx, project.organizationId, ['owner', 'admin']);
    } else if (project.createdBy !== ctx.userId && !isSystemAdmin(ctx)) {
      throw new ForbiddenError('You do not have permission to update this project');
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    const response: ApiResponse = {
      success: true,
      data: updatedProject,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/** Delete is owner-only for org projects — a stricter bar than update. */
export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const ctx = ctxFromRequest(req);

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundError('Project not found');

    if (project.organizationId) {
      await assertOrgRole(ctx, project.organizationId, ['owner']);
    } else if (project.createdBy !== ctx.userId && !isSystemAdmin(ctx)) {
      throw new ForbiddenError('You do not have permission to delete this project');
    }

    await prisma.project.delete({ where: { id } });

    const response: ApiResponse = {
      success: true,
      data: { message: 'Project deleted successfully' },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}
