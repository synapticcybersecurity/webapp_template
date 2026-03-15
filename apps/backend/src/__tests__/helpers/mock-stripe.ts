/**
 * Mock Stripe Client
 * Provides a mocked Stripe instance for unit tests
 */

import { vi } from 'vitest';

export function createMockStripe() {
  return {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
}

export type MockStripe = ReturnType<typeof createMockStripe>;
