/**
 * Express Server Entry Point
 * Main application setup with middleware and routes
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth.config.js';
import { logger, requestLogger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import userRoutes from './routes/user.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import projectRoutes from './routes/project.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// =============================================================================
// Security Middleware
// =============================================================================

// Helmet - Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS - Cross-Origin Resource Sharing
app.use(
  cors({
    origin: CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// Rate limiting for API routes
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
});

app.use('/api/', apiLimiter);

// =============================================================================
// Body Parsing Middleware
// =============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// Request Logging
// =============================================================================

app.use(requestLogger);

// =============================================================================
// Health Check Endpoint
// =============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Webapp Template API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// Better Auth Routes
// =============================================================================

// Mount Better Auth handler for authentication endpoints
app.all('/api/auth/*', toNodeHandler(auth));

// =============================================================================
// API Routes
// =============================================================================

app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/projects', projectRoutes);

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler - must be after all other routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// =============================================================================
// Start Server
// =============================================================================

app.listen(PORT, () => {
  logger.info(`🚀 Server started successfully`);
  logger.info(`📍 Port: ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason.message,
    stack: reason.stack,
  });
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  // Exit on uncaught exception as the app is in an undefined state
  process.exit(1);
});

export default app;
