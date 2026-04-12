/**
 * User Controller
 * Handles custom admin approval workflow (not covered by better-auth)
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { ApiResponse } from '@webapp/shared';
import { sendAccountApprovedEmail, sendAccountRejectedEmail } from '../config/email.js';
import { logger } from '../utils/logger.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * List users pending admin approval
 */
export async function listPendingApprovals(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: {
        banned: true,
        banReason: 'pending_approval',
      },
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
    });

    const response: ApiResponse = {
      success: true,
      data: users,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Get count of pending approvals
 */
export async function getPendingCount(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const count = await prisma.user.count({
      where: {
        banned: true,
        banReason: 'pending_approval',
      },
    });

    const response: ApiResponse = {
      success: true,
      data: { count },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Approve a pending user registration
 */
export async function approveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { banned: true, banReason: true, email: true },
    });

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (!existing.banned || existing.banReason !== 'pending_approval') {
      throw new ForbiddenError('User is not pending approval');
    }

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

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'approve',
        entityType: 'user',
        entityId: id,
        details: { approved: true },
        ipAddress: req.ip,
      },
    });

    try {
      await sendAccountApprovedEmail(user.email, `${FRONTEND_URL}/login`);
    } catch (error) {
      logger.error(`Failed to send approval email to ${user.email}:`, error);
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
 * Reject a pending user registration
 */
export async function rejectUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { banned: true, banReason: true, email: true },
    });

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (!existing.banned || existing.banReason !== 'pending_approval') {
      throw new ForbiddenError('User is not pending approval');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        banReason: 'registration_rejected',
      },
      select: {
        id: true,
        email: true,
        name: true,
        banned: true,
        banReason: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'reject',
        entityType: 'user',
        entityId: id,
        details: { rejected: true, reason: reason || null },
        ipAddress: req.ip,
      },
    });

    try {
      await sendAccountRejectedEmail(user.email, reason);
    } catch (error) {
      logger.error(`Failed to send rejection email to ${user.email}:`, error);
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
