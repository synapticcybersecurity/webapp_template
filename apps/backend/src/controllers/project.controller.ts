/**
 * Project Controller (Example Domain Model)
 * Demonstrates CRUD operations and organization relationships
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import {
  ApiResponse,
  PaginatedResponse,
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
} from '@webapp/shared';

/**
 * Create project
 */
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
    const userId = req.user!.id;

    // If organizationId provided, verify membership
    if (organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenError('You are not a member of this organization');
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        organizationId: organizationId || null,
        createdBy: userId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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

/**
 * List projects (user's personal + organization projects)
 */
export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = listProjectsQuerySchema.parse(req.query);
    const { page, limit, organizationId } = query;
    const skip = (page - 1) * limit;

    // Get user's organizations
    const userOrgIds = await prisma.organizationMember
      .findMany({
        where: { userId },
        select: { organizationId: true },
      })
      .then((memberships: { organizationId: string }[]) =>
        memberships.map((m: { organizationId: string }) => m.organizationId),
      );

    const where: Record<string, unknown> = {
      OR: [
        { createdBy: userId, organizationId: null }, // Personal projects
        { organizationId: { in: userOrgIds } }, // Organization projects
      ],
    };

    if (organizationId) {
      // Verify user has access to this organization
      if (!userOrgIds.includes(organizationId)) {
        throw new ForbiddenError('You do not have access to this organization');
      }
      where.organizationId = organizationId;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: { tasks: true },
          },
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

/**
 * Get project by ID
 */
export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check access: creator or organization member
    let hasAccess = project.createdBy === userId;

    if (project.organizationId && !hasAccess) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId,
          },
        },
      });
      hasAccess = !!membership;
    }

    if (!hasAccess) {
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

/**
 * Update project
 */
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
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check access
    let hasAccess = project.createdBy === userId;

    if (project.organizationId && !hasAccess) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId,
          },
        },
      });
      hasAccess = membership?.role === 'owner' || membership?.role === 'admin';
    }

    if (!hasAccess) {
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

/**
 * Delete project
 */
export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Only creator or org owner can delete
    let canDelete = project.createdBy === userId;

    if (project.organizationId && !canDelete) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId,
          },
        },
      });
      canDelete = membership?.role === 'owner';
    }

    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete this project');
    }

    await prisma.project.delete({
      where: { id },
    });

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
