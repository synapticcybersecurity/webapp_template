/**
 * Billing and Subscription Types
 * Shared between frontend and backend
 */

export type BillingPlan = 'free' | 'pro' | 'enterprise';

export type BillingInterval = 'monthly' | 'yearly';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'inactive';

export interface Subscription {
  id: string;
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: SubscriptionStatus;
  plan: BillingPlan;
  billingInterval: BillingInterval | null;
  currentPeriodStart: Date | string | null;
  currentPeriodEnd: Date | string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | string | null;
  trialStart: Date | string | null;
  trialEnd: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PlanDetails {
  id: BillingPlan;
  name: string;
  description: string;
  features: string[];
  limits: PlanLimits;
  pricing: {
    monthly: number; // cents
    yearly: number; // cents
  };
  stripePriceIds: {
    monthly: string | null;
    yearly: string | null;
  };
}

export interface PlanLimits {
  members: number; // -1 for unlimited
  projects: number; // -1 for unlimited
  storage: number; // MB, -1 for unlimited
}

// Request/Response types
export interface CreateCheckoutRequest {
  plan: BillingPlan;
  interval: BillingInterval;
}

export interface BillingOverview {
  subscription: Subscription | null;
  plan: PlanDetails;
  usage: PlanUsage;
}

export interface PlanUsage {
  members: { current: number; limit: number };
  projects: { current: number; limit: number };
}
