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
          /** Tenant the request is scoped to; null means unscoped. */
          activeOrganizationId: string | null;
          /** Admin user id when this session is an impersonation, else null. */
          impersonatedBy: string | null;
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

    // Read the live session row, and the user's ban state through it, in one
    // query.
    //
    // Both halves must come from the database, not from the object Better Auth
    // just returned. `session.cookieCache` serves a signed snapshot of the
    // session for up to five minutes, so a cached session reports whatever
    // scope and ban state were true when the cookie was minted. For the ban
    // check that means a banned user keeps working for the rest of the window;
    // for activeOrganizationId it means an admin who switches tenant scope
    // keeps reading the previous tenant's data, silently, until the cache
    // expires. Neither is acceptable for a security boundary, and this costs
    // no more than the ban lookup it replaces.
    const sessionRecord = await prisma.session.findUnique({
      where: { id: session.session.id },
      select: {
        activeOrganizationId: true,
        impersonatedBy: true,
        user: { select: { banned: true, banReason: true, banExpires: true } },
      },
    });

    if (!sessionRecord?.user) {
      // The session was revoked (or the user deleted) since the cookie was
      // minted — treat it as unauthenticated rather than trusting the cache.
      throw new UnauthorizedError('Session is no longer valid');
    }

    const user = sessionRecord.user;

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
        // From the database row above, deliberately — see the comment there.
        activeOrganizationId: sessionRecord.activeOrganizationId,
        impersonatedBy: sessionRecord.impersonatedBy,
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
