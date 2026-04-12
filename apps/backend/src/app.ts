/**
 * Express Application Setup
 * Configures middleware, routes, and error handling.
 * Separated from server startup for testability (Supertest).
 */

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import timeout from 'connect-timeout';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth.config.js';
import { prisma } from './config/database.js';
import { getRedisClient, isRedisConnected } from './config/redis.js';
import { logger, requestLogger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import userRoutes from './routes/user.routes.js';
import projectRoutes from './routes/project.routes.js';
import billingRoutes from './routes/billing.routes.js';
import meteringRoutes from './routes/metering.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT || '30s';
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.BETTER_AUTH_SECRET || '';
const isProduction = process.env.NODE_ENV === 'production';

// Validate CORS origins — reject wildcard with credentials
const corsOrigins = CORS_ORIGIN.split(',').map((origin) => origin.trim());
if (corsOrigins.includes('*')) {
  logger.error('CORS_ORIGIN cannot be "*" when credentials are enabled. Specify explicit origins.');
  process.exit(1);
}

// =============================================================================
// CSRF Protection Setup
// =============================================================================

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req) => req.cookies?.['webapp.session_token'] || '',
  cookieName: '__csrf',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: isProduction,
    httpOnly: true,
  },
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

// =============================================================================
// Security Middleware
// =============================================================================

// Request timeout — prevent long-running requests from exhausting resources
app.use(timeout(REQUEST_TIMEOUT));

// Request ID — unique ID per request for log correlation
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  next();
});

// Helmet - Security headers with stricter CSP
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://js.stripe.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        frameSrc: ["'self'", 'https://js.stripe.com'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

// CORS - Cross-Origin Resource Sharing
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-CSRF-Token'],
  }),
);

// Cookie parser — required for CSRF double-submit cookie pattern
app.use(cookieParser());

// Rate limiting for API routes (uses Redis if available, falls back to in-memory)
const redisClient = getRedisClient();
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient
    ? {
        store: new RedisStore({
          sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        }),
      }
    : {}),
});

app.use('/api/', apiLimiter);

// =============================================================================
// Better Auth Routes (MUST be before body parsing middleware)
// =============================================================================

// Mount Better Auth handler for authentication endpoints
app.all('/api/auth/*', toNodeHandler(auth));

// =============================================================================
// Body Parsing Middleware
// =============================================================================

// Skip JSON parsing for Stripe webhook (needs raw body for signature verification)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl === '/api/billing/webhook') {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// CSRF Protection (after body parsing, skip webhooks and auth routes)
// =============================================================================

// CSRF token endpoint — frontend fetches this to get a token
app.get('/api/csrf-token', (req: Request, res: Response) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Apply CSRF protection to all state-changing API requests
// Skip: webhooks (use Stripe signature), auth routes (handled by better-auth)
app.use('/api/', (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for routes that have their own verification
  if (req.originalUrl === '/api/billing/webhook') {
    return next();
  }
  if (req.originalUrl.startsWith('/api/auth/')) {
    return next();
  }
  doubleCsrfProtection(req, res, next);
});

// =============================================================================
// Request Logging
// =============================================================================

app.use(requestLogger);

// =============================================================================
// Halt check — stop processing if request has timed out
// =============================================================================

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (!req.timedout) next();
});

// =============================================================================
// Health Check Endpoint
// =============================================================================

app.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // Check Redis connectivity
  const redis = getRedisClient();
  if (redis && isRedisConnected()) {
    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }
  } else {
    checks.redis = 'not configured';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'not configured');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks,
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Webapp Template API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// API Routes
// =============================================================================

app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/metering', meteringRoutes);

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler - must be after all other routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

export default app;
