import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
vi.mock('../../utils/logger.js', () => ({ logger: mockLogger }));

const { validateEnv } = await import('../../config/env.js');

const STRONG_SECRET = 'a'.repeat(48);
const SNAPSHOT_KEYS = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'FRONTEND_URL',
  'CORS_ORIGIN',
  'PORT',
  'NODE_ENV',
  'LOG_LEVEL',
  'SESSION_COOKIE_SECURE',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  vi.clearAllMocks();
  snapshot = Object.fromEntries(SNAPSHOT_KEYS.map((k) => [k, process.env[k]]));
  for (const key of SNAPSHOT_KEYS) delete process.env[key];
  process.env.DATABASE_URL = 'postgresql://user:strongpass@db.internal:5432/app';
  process.env.BETTER_AUTH_SECRET = STRONG_SECRET;
});

afterEach(() => {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function warnings(): string[] {
  return mockLogger.warn.mock.calls.map((c) => String(c[0]));
}

describe('validateEnv', () => {
  it('throws when a required variable is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
  });

  it('applies defaults for optional variables', () => {
    validateEnv();
    expect(process.env.PORT).toBe('3001');
    expect(process.env.FRONTEND_URL).toBe('http://localhost:5173');
  });

  it('throws on a too-short auth secret', () => {
    process.env.BETTER_AUTH_SECRET = 'short';
    expect(() => validateEnv()).toThrow(/at least 32 characters/);
  });

  it('stays quiet in development even with template defaults', () => {
    // Dev must not be noisy — the whole point of the shipped defaults is that
    // `docker compose up` works without configuration.
    process.env.NODE_ENV = 'development';
    process.env.BETTER_AUTH_SECRET = 'change-this-to-a-secure-random-string-min-32-chars';
    validateEnv();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = 'https://app.example.com';
      process.env.SESSION_COOKIE_SECURE = 'true';
    });

    it('warns when the auth secret is still the shipped placeholder', () => {
      // This is the one that matters: docker-compose supplies a working
      // default, so a deployment that never overrode it would run in
      // production with a secret published in a public repository.
      process.env.BETTER_AUTH_SECRET = 'change-this-to-a-secure-random-string-min-32-chars';
      validateEnv();
      expect(warnings().some((w) => /BETTER_AUTH_SECRET/.test(w))).toBe(true);
    });

    it('warns on default database credentials', () => {
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/webapp_db';
      validateEnv();
      expect(warnings().some((w) => /DATABASE_URL/.test(w))).toBe(true);
    });

    it('warns on a non-HTTPS CORS origin', () => {
      process.env.CORS_ORIGIN = 'http://app.example.com';
      validateEnv();
      expect(warnings().some((w) => /CORS_ORIGIN/.test(w))).toBe(true);
    });

    it('warns when session cookies are not marked secure', () => {
      process.env.SESSION_COOKIE_SECURE = 'false';
      validateEnv();
      expect(warnings().some((w) => /SESSION_COOKIE_SECURE/.test(w))).toBe(true);
    });

    it('warns when Stripe is half-configured', () => {
      // A missing webhook secret fails signature checks silently, so
      // subscription state drifts out of sync with Stripe with no error.
      process.env.STRIPE_SECRET_KEY = 'sk_live_something';
      validateEnv();
      expect(warnings().some((w) => /STRIPE_WEBHOOK_SECRET/.test(w))).toBe(true);
    });

    it('is silent when everything is configured properly', () => {
      validateEnv();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});
