/**
 * Test Setup
 * Runs before all tests
 */

import { beforeAll, vi } from 'vitest';

// Set test environment variables BEFORE any module loads
// These must be set at the top level so they're available during module initialization
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-only-min-32-chars';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.BETTER_AUTH_URL = 'http://localhost:3001';
process.env.EMAIL_TEST_MODE = 'true';

beforeAll(() => {
  // Mock console methods to reduce noise in test output
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
});
