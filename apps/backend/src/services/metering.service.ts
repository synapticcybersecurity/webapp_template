/**
 * Metering Service
 * Tracks and queries usage-based consumption metrics per organization.
 *
 * Built-in metrics: "api_calls", "storage_bytes", "ai_tokens"
 * Add custom metrics by recording with any string key.
 */

import { prisma } from '../config/database.js';
import type { UsageMetric, UsageSummary } from '@webapp/shared';

/**
 * Record a usage event for a metric
 */
export async function recordUsage(
  organizationId: string,
  metric: string,
  quantity: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.usageRecord.create({
    data: {
      organizationId,
      metric,
      quantity,
      metadata: (metadata as object) ?? undefined,
    },
  });
}

/**
 * Record multiple usage events in a batch
 */
export async function recordUsageBatch(
  events: Array<{
    organizationId: string;
    metric: string;
    quantity: number;
    metadata?: Record<string, unknown>;
  }>,
): Promise<void> {
  await prisma.usageRecord.createMany({
    data: events.map((e) => ({
      organizationId: e.organizationId,
      metric: e.metric,
      quantity: e.quantity,
      metadata: (e.metadata as object) ?? undefined,
    })),
  });
}

/**
 * Get aggregated usage for a single metric in a date range
 */
export async function getMetricUsage(
  organizationId: string,
  metric: string,
  start: Date,
  end: Date,
): Promise<number> {
  const result = await prisma.usageRecord.aggregate({
    where: {
      organizationId,
      metric,
      timestamp: { gte: start, lte: end },
    },
    _sum: { quantity: true },
  });

  return result._sum.quantity ?? 0;
}

/**
 * Get a usage summary for all metrics in the current billing period
 */
export async function getUsageSummary(organizationId: string): Promise<UsageSummary> {
  // Determine billing period from subscription
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { currentPeriodStart: true, currentPeriodEnd: true },
  });

  const now = new Date();
  const start = subscription?.currentPeriodStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const end = subscription?.currentPeriodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get all distinct metrics for this org in the period
  const records = await prisma.usageRecord.groupBy({
    by: ['metric'],
    where: {
      organizationId,
      timestamp: { gte: start, lte: end },
    },
    _sum: { quantity: true },
  });

  const metrics: UsageMetric[] = records.map(
    (r: { metric: string; _sum: { quantity: number | null } }) => ({
      metric: r.metric,
      total: r._sum.quantity ?? 0,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    }),
  );

  return {
    organizationId,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics,
  };
}
