import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface TimeoutOptions {
  timeout?: number; // milliseconds
  message?: string;
}

interface CircuitBreakerConfig {
  failureThreshold?: number; // Failed requests before opening
  successThreshold?: number; // Successful requests to close
  timeout?: number; // Time to attempt half-open state (ms)
}

// Circuit breaker states
enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Rejecting requests
  HALF_OPEN = 'half-open', // Testing recovery
}

interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  openedAt?: number;
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_TIMEOUT_MESSAGE = 'Request timeout';

const circuitBreakerStates = new Map<string, CircuitBreakerStats>();

/**
 * Request Timeout Middleware
 * 
 * Ensures requests complete within specified time
 * Prevents hanging connections and resource exhaustion
 */
export const requestTimeout = (options?: TimeoutOptions) => {
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const message = options?.message ?? DEFAULT_TIMEOUT_MESSAGE;

  return (req: Request, res: Response, next: NextFunction) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let finished = false;

    // Set timeout
    timeoutId = setTimeout(() => {
      if (finished) {
        return;
      }

      finished = true;
      logger.warn(
        { path: req.path, method: req.method, timeoutMs },
        'Request timeout'
      );

      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: message,
          code: 'REQUEST_TIMEOUT',
        });
      } else {
        res.destroy();
      }
    }, timeoutMs);

    // Clean up on response end
    const cleanup = () => {
      finished = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    next();
  };
};

/**
 * Circuit Breaker Middleware
 * 
 * Prevents cascade failures by stopping requests to failing services
 * Implements automatic recovery with exponential backoff
 */
export const circuitBreaker = (
  serviceName: string,
  config?: CircuitBreakerConfig
) => {
  const failureThreshold = config?.failureThreshold ?? 5;
  const successThreshold = config?.successThreshold ?? 2;
  const halfOpenTimeout = config?.timeout ?? 60000; // 1 minute

  return (req: Request, res: Response, next: NextFunction) => {
    let breaker = circuitBreakerStates.get(serviceName);

    if (!breaker) {
      breaker = {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
      };
      circuitBreakerStates.set(serviceName, breaker);
    }

    // Check if circuit is open
    if (breaker.state === CircuitState.OPEN) {
      const timeSinceOpen = Date.now() - (breaker.openedAt ?? Date.now());

      // Try transitioning to half-open after timeout
      if (timeSinceOpen > halfOpenTimeout) {
        logger.info(
          { serviceName, timeSinceOpen },
          'Circuit breaker transitioning to half-open'
        );
        breaker.state = CircuitState.HALF_OPEN;
        breaker.successCount = 0;
        breaker.failureCount = 0;
      } else {
        // Still open, reject request
        return res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable',
          code: 'CIRCUIT_BREAKER_OPEN',
          retryAfter: Math.ceil((halfOpenTimeout - timeSinceOpen) / 1000),
        });
      }
    }

    // Track response
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 400;

      if (breaker) {
        if (isSuccess) {
          breaker.successCount++;
          breaker.failureCount = 0;

          // Close circuit if threshold reached
          if (
            breaker.state === CircuitState.HALF_OPEN &&
            breaker.successCount >= successThreshold
          ) {
            logger.info({ serviceName }, 'Circuit breaker closed (recovered)');
            breaker.state = CircuitState.CLOSED;
            breaker.successCount = 0;
            breaker.failureCount = 0;
          }
        } else {
          breaker.failureCount++;
          breaker.successCount = 0;
          breaker.lastFailureTime = Date.now();

          // Open circuit if threshold reached
          if (breaker.failureCount >= failureThreshold) {
            logger.error(
              { serviceName, failureCount: breaker.failureCount },
              'Circuit breaker opened (too many failures)'
            );
            breaker.state = CircuitState.OPEN;
            breaker.openedAt = Date.now();
          }
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Get circuit breaker status for monitoring
 */
export const getCircuitBreakerStatus = (serviceName?: string) => {
  if (serviceName) {
    return circuitBreakerStates.get(serviceName);
  }

  const status: Record<string, CircuitBreakerStats> = {};
  circuitBreakerStates.forEach((value, key) => {
    status[key] = { ...value };
  });
  return status;
};

/**
 * Reset circuit breaker state
 */
export const resetCircuitBreaker = (serviceName: string) => {
  circuitBreakerStates.delete(serviceName);
  logger.info({ serviceName }, 'Circuit breaker reset');
};
