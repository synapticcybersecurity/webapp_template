/**
 * Billing Middleware
 * Plan-based feature gating for API routes
 */

import { Request, Response, NextFunction } from 'express';
import { checkPlanLimit } from '../services/billing.service.js';
import { AppError } from '../utils/errors.js';
import { HttpStatus, ErrorCode } from '@webapp/shared';

/**
 * Middleware factory that checks if the organization has capacity for a resource.
 * Expects `orgId` or `organizationId` in req.params or req.body.
 */
export function requirePlanLimit(resource: 'members' | 'projects') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.orgId || req.params.organizationId || req.body?.organizationId;
      if (!orgId) {
        return next();
      }

      const allowed = await checkPlanLimit(orgId, resource);
      if (!allowed) {
        throw new AppError(
          `You have reached the ${resource} limit for your current plan. Please upgrade to add more.`,
          HttpStatus.FORBIDDEN,
          ErrorCode.PLAN_LIMIT_EXCEEDED
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
