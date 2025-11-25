/**
 * User Controller
 * Handles user management and profile operations
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { ApiResponse, PaginatedResponse, User } from '@webapp/shared';

/**
 * Get current user profile
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const response: ApiResponse<User> = {
      success: true,
      data: {
        ...user,
        banReason: null,
        banExpires: null,
      } as User,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Update current user profile
 */
export async function updateCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, image } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name !== undefined && { name }),
        ...(image !== undefined && { image }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response: ApiResponse<User> = {
      success: true,
      data: {
        ...user,
        banReason: null,
        banExpires: null,
      } as User,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * List all users (admin only)
 */
export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && (role === 'user' || role === 'admin')) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          emailVerified: true,
          banned: true,
          banReason: true,
          banExpires: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const response: ApiResponse<PaginatedResponse<User>> = {
      success: true,
      data: {
        items: users as User[],
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
 * Get user by ID (admin only)
 */
export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sessions: true,
            memberships: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const response: ApiResponse = {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Prevent changing own role
    if (id === req.user!.id) {
      throw new ForbiddenError('Cannot change your own role');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Ban user (admin only)
 */
export async function banUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { reason, expiresAt } = req.body;

    // Prevent banning self
    if (id === req.user!.id) {
      throw new ForbiddenError('Cannot ban yourself');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        banned: true,
        banReason: reason,
        banExpires: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        banned: true,
        banReason: true,
        banExpires: true,
      },
    });

    // Invalidate all user sessions
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    const response: ApiResponse = {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Unban user (admin only)
 */
export async function unbanUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        banned: true,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}
