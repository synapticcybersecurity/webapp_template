/**
 * Audit logging for privileged and security-relevant actions.
 *
 * Writes are best-effort: a failure to record must never break the action
 * being recorded, so every function swallows its errors after logging them.
 * That is a deliberate trade — losing an audit row is bad, but failing a
 * user's password reset because the audit table is full is worse.
 */

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * An authentication-flow event (sign-in, sign-up, ban, impersonation).
 * `userId` is the subject of the event.
 */
export async function logAuthEvent(
  action: string,
  userId?: string | null,
  details?: Record<string, unknown>,
  ipAddress?: string | null,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType: 'auth',
        userId: userId ?? null,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (error) {
    logger.error('Failed to write auth audit log', { error, action });
  }
}

/**
 * A privileged administrative action. `actorId` is the admin performing it;
 * `entityId` is what they acted on — keeping those distinct is the whole point
 * of the trail.
 */
export async function logAdminAction(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>,
  ipAddress?: string | null,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action,
        entityType,
        entityId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (error) {
    logger.error('Failed to write admin audit log', { error, action, entityType });
  }
}
