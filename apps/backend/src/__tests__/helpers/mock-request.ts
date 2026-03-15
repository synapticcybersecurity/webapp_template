/**
 * Mock Express Request/Response/Next factories
 * Reusable across all middleware and controller tests
 */

import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

interface MockUser {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  emailVerified: boolean;
  session: { id: string; expiresAt: Date };
}

const DEFAULT_MOCK_USER: MockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  emailVerified: true,
  session: { id: 'session-id', expiresAt: new Date() },
};

export function createMockRequest(
  overrides: Partial<Request> & { user?: Partial<MockUser> } = {}
): Request {
  const { user, ...rest } = overrides;
  return {
    params: {},
    body: {},
    query: {},
    headers: {},
    user: user ? { ...DEFAULT_MOCK_USER, ...user } : undefined,
    ...rest,
  } as unknown as Request;
}

export function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

export function createMockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}
