/**
 * Authentication Middleware
 * Protects custom routes using better-auth session validation
 */

import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.config.js';
import { prisma } from '../config/database.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { UserRole } from '@webapp/shared';

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: UserRole;
        emailVerified: boolean;
        banned: boolean;
        banReason: string | null;
        banExpires: Date | null;
        session: {
          id: string;
          expiresAt: Date;
        };
      };
    }
  }
}

/**
 * Require authentication - user must be logged in
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user || !session?.session) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user is banned by querying current state from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { banned: true, banReason: true, banExpires: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.banned) {
      // Check if ban has expired (support temporary bans)
      if (user.banExpires && new Date(user.banExpires) < new Date()) {
        // Ban has expired — clear it
        await prisma.user.update({
          where: { id: session.user.id },
          data: { banned: false, banReason: null, banExpires: null },
        });
      } else {
        // Revoke all sessions for banned user
        await prisma.session.deleteMany({
          where: { userId: session.user.id },
        });

        const reason =
          user.banReason === 'pending_approval'
            ? 'Your account is pending admin approval'
            : 'Your account has been banned';
        throw new ForbiddenError(reason);
      }
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
      emailVerified: session.user.emailVerified,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      session: {
        id: session.session.id,
        expiresAt: new Date(session.session.expiresAt),
      },
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require admin role
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
}
