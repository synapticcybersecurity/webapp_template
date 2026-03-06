/**
 * Authentication Middleware
 * Protects custom routes using better-auth session validation
 */

import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/auth.config.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { UserRole } from '@webapp/shared';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: UserRole;
        emailVerified: boolean;
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
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session?.user || !session?.session) {
      throw new UnauthorizedError('Authentication required');
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
      emailVerified: session.user.emailVerified,
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
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
}
