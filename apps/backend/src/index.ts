/**
 * Express Server Entry Point
 * Imports configured app and starts the server
 */

import dotenv from 'dotenv';

dotenv.config();

// Validate before importing the app: app.ts pulls in auth.config.ts, which
// reads BETTER_AUTH_SECRET at module scope. Checking afterwards would mean the
// process had already exited with a less useful message.
import { validateEnv } from './config/env.js';

validateEnv();

const { default: app } = await import('./app.js');
const { connectRedis } = await import('./config/redis.js');
const { logger } = await import('./utils/logger.js');

const PORT = process.env.PORT || 3001;

// =============================================================================
// Start Server
// =============================================================================

async function start() {
  // Connect to Redis (optional — degrades gracefully if unavailable)
  await connectRedis();

  app.listen(PORT, () => {
    logger.info(`Server started successfully`);
    logger.info(`Port: ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`API URL: http://localhost:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error, _promise: Promise<any>) => {
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
