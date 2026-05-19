/**
 * Graceful Shutdown Handler
 * 
 * Ensures clean shutdown of the application:
 * - Close database connections
 * - Drain pending requests
 * - Close server properly
 * Prevents data corruption and hanging connections
 */

import { Server } from 'http';
import prisma from '../config/database';
import { logger } from './logger';

interface ShutdownConfig {
  timeout?: number; // Max wait time before force kill (ms)
}

const DEFAULT_CONFIG: Required<ShutdownConfig> = {
  timeout: 30000, // 30 seconds
};

let isShuttingDown = false;
let activeRequests = 0;

/**
 * Increment active request count
 */
export function incrementActiveRequests(): void {
  activeRequests++;
}

/**
 * Decrement active request count
 */
export function decrementActiveRequests(): void {
  activeRequests--;
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(
  server: Server,
  config?: ShutdownConfig
): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`Received ${signal} during shutdown - forcing exit`);
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info({ signal }, '🛑 Graceful shutdown initiated');

    // Stop accepting new requests
    server.close(async () => {
      logger.info('HTTP server closed');

      // Wait for pending requests with timeout
      let waited = 0;
      const checkInterval = 100;

      while (activeRequests > 0 && waited < finalConfig.timeout) {
        logger.debug({ activeRequests }, 'Waiting for pending requests...');
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }

      if (activeRequests > 0) {
        logger.warn(
          { activeRequests },
          'Timeout waiting for pending requests - forcing shutdown'
        );
      } else {
        logger.info('All pending requests completed');
      }

      // Close database connection
      try {
        await prisma.$disconnect();
        logger.info('Database connection closed');
      } catch (err) {
        logger.error({ err }, 'Error closing database connection');
      }

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      logger.error('Forced shutdown - timeout exceeded');
      process.exit(1);
    }, finalConfig.timeout);
  };

  // Handle termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error({ err }, '💥 Uncaught exception');
    shutdown('uncaughtException').catch((shutdownErr) => {
      logger.error({ err: shutdownErr }, 'Error during shutdown');
      process.exit(1);
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, '💥 Unhandled promise rejection');
  });

  logger.info('Graceful shutdown handlers registered');
}

/**
 * Middleware to track active requests
 */
export function requestTracker() {
  return (
    req: any,
    res: any,
    next: any
  ) => {
    incrementActiveRequests();

    res.on('finish', () => {
      decrementActiveRequests();
    });

    res.on('close', () => {
      decrementActiveRequests();
    });

    next();
  };
}
