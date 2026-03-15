/**
 * Mock Prisma Client
 * Provides a fully mocked PrismaClient for unit tests
 */

import { vi } from 'vitest';

export function createMockPrisma() {
  return {
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
