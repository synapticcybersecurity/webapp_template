/**
 * Authentication Middleware
 * Protects routes and verifies user sessions
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
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session?.user || !session?.session) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if session is expired
    const sessionExpiresAt = new Date(session.session.expiresAt);
    if (sessionExpiresAt < new Date()) {
      throw new UnauthorizedError('Session expired');
    }

    // Attach user to request
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
      emailVerified: session.user.emailVerified,
      session: {
        id: session.session.id,
        expiresAt: sessionExpiresAt,
      },
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Required role: ${roles.join(' or ')}`
        )
      );
    }

    next();
  };
}

/**
 * Require admin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole('admin')(req, res, next);
}

/**
 * Require email verification
 */
export function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.emailVerified) {
    return next(new ForbiddenError('Email verification required'));
  }

  next();
}

/**
 * Optional authentication - attaches user if present but doesn't require it
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (session?.user && session?.session) {
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
    }

    next();
  } catch (error) {
    // Don't throw error for optional auth
    next();
  }
}
