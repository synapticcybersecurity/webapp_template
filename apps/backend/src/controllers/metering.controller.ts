/**
 * Metering Controller
 * Usage tracking and reporting endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@webapp/shared';
import * as meteringService from '../services/metering.service.js';
import { ForbiddenError, BadRequestError } from '../utils/errors.js';
import { prisma } from '../config/database.js';

function requireOrgId(req: Request): string {
  const orgId = req.params.orgId;
  if (!orgId) throw new BadRequestError('Organization ID is required');
  return orgId;
}

async function verifyOrgMember(userId: string, orgId: string): Promise<void> {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    select: { role: true },
  });

  if (!member) {
    throw new ForbiddenError('You are not a member of this organization');
  }
}

async function verifyOrgAdmin(userId: string, orgId: string): Promise<void> {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    select: { role: true },
  });

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new ForbiddenError('Only organization owners and admins can manage usage');
  }
}

/**
 * GET /api/metering/:orgId — Get usage summary for current billing period
 */
export async function getUsageSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgId = requireOrgId(req);
    await verifyOrgMember(req.user!.id, orgId);

    const summary = await meteringService.getUsageSummary(orgId);

    const response: ApiResponse = {
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/metering/:orgId/record — Record a usage event (internal/admin use)
 */
export async function recordUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = requireOrgId(req);
    await verifyOrgAdmin(req.user!.id, orgId);

    const { metric, quantity, metadata } = req.body;
    if (!metric || typeof metric !== 'string') {
      throw new BadRequestError('metric is required and must be a string');
    }
    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      throw new BadRequestError('quantity is required and must be a positive number');
    }

    await meteringService.recordUsage(orgId, metric, quantity, metadata);

    const response: ApiResponse = {
      success: true,
      data: { recorded: true },
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}
