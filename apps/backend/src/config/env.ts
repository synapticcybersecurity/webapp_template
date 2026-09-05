/**
 * Startup environment validation.
 *
 * Fails fast on missing required configuration, and — more importantly — warns
 * loudly in production when a value is still the shipped development default.
 * The template's docker-compose supplies working defaults for
 * BETTER_AUTH_SECRET and the database password so `docker compose up` works
 * out of the box, which means a deployment that never overrode them would
 * otherwise run in production with a publicly known auth secret and no
 * indication anything was wrong.
 */

import { logger } from '../utils/logger.js';

interface EnvVar {
  name: string;
  required: boolean;
  defaultValue?: string;
}

const ENV_VARS: EnvVar[] = [
  { name: 'DATABASE_URL', required: true },
  { name: 'BETTER_AUTH_SECRET', required: true },
  { name: 'BETTER_AUTH_URL', required: false, defaultValue: 'http://localhost:3001' },
  { name: 'FRONTEND_URL', required: false, defaultValue: 'http://localhost:5173' },
  { name: 'CORS_ORIGIN', required: false, defaultValue: 'http://localhost:5173' },
  { name: 'PORT', required: false, defaultValue: '3001' },
  { name: 'NODE_ENV', required: false, defaultValue: 'development' },
  { name: 'LOG_LEVEL', required: false, defaultValue: 'info' },
];

/** Substrings that mark a value as a shipped placeholder rather than a real secret. */
const PLACEHOLDER_MARKERS = [
  'change-this',
  'change-me',
  'your-',
  'placeholder',
  'dev_secret',
  'changeme',
];

function looksLikePlaceholder(value: string): boolean {
  const lowered = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker));
}

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  for (const v of ENV_VARS) {
    if (!process.env[v.name]) {
      if (v.required) {
        missing.push(v.name);
      } else if (v.defaultValue) {
        process.env[v.name] = v.defaultValue;
      }
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(message);
    throw new Error(message);
  }

  const secret = process.env.BETTER_AUTH_SECRET ?? '';
  if (secret.length < 32) {
    const message = 'BETTER_AUTH_SECRET must be at least 32 characters long';
    logger.error(message);
    throw new Error(message);
  }

  if (isProduction) {
    if (looksLikePlaceholder(secret)) {
      warnings.push(
        'BETTER_AUTH_SECRET is still a template placeholder. Every session cookie this ' +
          'instance issues can be forged by anyone who has read the repository. Generate one ' +
          'with: openssl rand -base64 48',
      );
    }

    const databaseUrl = process.env.DATABASE_URL ?? '';
    if (/:(postgres|password|changeme)@/i.test(databaseUrl)) {
      warnings.push(
        'DATABASE_URL uses a default credential from the template. Set a strong POSTGRES_PASSWORD.',
      );
    }

    const corsOrigin = process.env.CORS_ORIGIN ?? '';
    if (corsOrigin.split(',').some((o) => !o.trim().startsWith('https://'))) {
      warnings.push('CORS_ORIGIN contains a non-HTTPS origin. Use HTTPS in production.');
    }

    if (process.env.SESSION_COOKIE_SECURE !== 'true') {
      warnings.push(
        'SESSION_COOKIE_SECURE is not "true". Session cookies will be sent over plain HTTP.',
      );
    }

    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
      warnings.push(
        'STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is not. Webhook signature checks ' +
          'will fail and subscription state will silently drift out of sync with Stripe.',
      );
    }
  }

  for (const warning of warnings) {
    logger.warn(`ENV WARNING: ${warning}`);
  }
}
