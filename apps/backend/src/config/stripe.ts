/**
 * Stripe Configuration
 * Stripe client initialization and plan definitions
 */

import Stripe from 'stripe';
import { logger } from '../utils/logger.js';
import type { PlanDetails } from '@webapp/shared';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  logger.warn('STRIPE_SECRET_KEY not set — billing features will be unavailable');
}

export const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Plan definitions — update pricing and Stripe Price IDs to match your Stripe dashboard
 */
export const PLANS: Record<string, PlanDetails> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'For individuals and small teams getting started',
    features: ['Up to 3 team members', 'Up to 5 projects', '100 MB storage', 'Community support'],
    limits: { members: 3, projects: 5, storage: 100 },
    pricing: { monthly: 0, yearly: 0 },
    stripePriceIds: { monthly: null, yearly: null },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams that need more power',
    features: [
      'Up to 20 team members',
      'Unlimited projects',
      '10 GB storage',
      'Priority support',
      'Advanced analytics',
    ],
    limits: { members: 20, projects: -1, storage: 10240 },
    pricing: { monthly: 2900, yearly: 29000 }, // $29/mo, $290/yr
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with advanced needs',
    features: [
      'Unlimited team members',
      'Unlimited projects',
      'Unlimited storage',
      'Dedicated support',
      'Advanced analytics',
      'Custom integrations',
      'SSO / SAML',
      'SLA guarantee',
    ],
    limits: { members: -1, projects: -1, storage: -1 },
    pricing: { monthly: 9900, yearly: 99000 }, // $99/mo, $990/yr
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
    },
  },
};
