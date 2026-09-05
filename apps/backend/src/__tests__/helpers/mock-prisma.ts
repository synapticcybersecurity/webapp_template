/**
 * Mock Prisma Client
 * Provides a fully mocked PrismaClient for unit tests
 */

import { vi } from 'vitest';

export function createMockPrisma() {
  return {
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    organizationDomain: {
      findUnique: vi.fn(),
    },
    session: {
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
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
