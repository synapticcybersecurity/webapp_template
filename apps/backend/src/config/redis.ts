/**
 * Redis Configuration
 * Client singleton with graceful connection handling.
 * Redis is optional — the app degrades gracefully if unavailable.
 */

import { createClient, type RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || '';

let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Get the Redis client. Returns null if Redis is not configured or unavailable.
 */
export function getRedisClient(): RedisClientType | null {
  return isConnected ? redisClient : null;
}

/**
 * Check if Redis is connected and healthy.
 */
export function isRedisConnected(): boolean {
  return isConnected;
}

/**
 * Connect to Redis. Call once at startup.
 * Silently skips if REDIS_URL is not configured.
 */
export async function connectRedis(): Promise<void> {
  if (!REDIS_URL) {
    logger.info(
      'REDIS_URL not configured — running without Redis (rate limiting uses in-memory store)',
    );
    return;
  }

  try {
    redisClient = createClient({ url: REDIS_URL });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
      isConnected = false;
    });

    redisClient.on('reconnecting', () => {
      logger.info('Reconnecting to Redis...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis connection ready');
      isConnected = true;
    });

    await redisClient.connect();
    isConnected = true;
    logger.info(`Redis connected: ${REDIS_URL.replace(/\/\/.*@/, '//<credentials>@')}`);
  } catch (error) {
    logger.warn('Failed to connect to Redis — falling back to in-memory stores:', error);
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Disconnect from Redis. Call on shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient && isConnected) {
    logger.info('Disconnecting from Redis...');
    await redisClient.quit();
    isConnected = false;
  }
}
