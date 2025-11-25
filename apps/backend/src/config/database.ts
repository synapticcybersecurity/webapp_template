/**
 * Database Configuration
 * Prisma Client singleton and connection management
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  logger.info('Disconnecting from database...');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received: Disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received: Disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
