import { Request, Response, NextFunction } from 'express';
import { advancedAnalyticsService } from '../services/advancedAnalyticsService';
import { logger } from '../utils/logger';

const healthLogger = logger.child({ module: 'SystemHealthMiddleware' });

/**
 * Middleware to track API response times and system health metrics
 */
export const systemHealthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Capture the original end function
  const originalEnd = res.end;

  // Override the end function to capture response time
  res.end = function (this: Response, ...args: any[]): Response {
    // Keep tests deterministic and avoid noise from analytics writes when Prisma is mocked.
    if (process.env.NODE_ENV === 'test') {
      // @ts-ignore - Express response.end has complex overloads
      return originalEnd.apply(this, args);
    }

    const responseTime = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Track API response time
    advancedAnalyticsService.trackSystemMetric({
      metricType: 'api_response',
      value: responseTime,
      unit: 'ms',
      endpoint: `${req.method} ${req.route?.path || req.path}`,
      tags: {
        statusCode: res.statusCode,
        method: req.method,
        userAgent: req.get('user-agent')
      }
    }).catch(err => {
      healthLogger.warn({ err }, 'Failed to track API response time');
    });

    // Track memory usage if significant change
    if (Math.abs(memoryDelta) > 1024 * 1024) { // Only track if > 1MB change
      advancedAnalyticsService.trackSystemMetric({
        metricType: 'memory_usage',
        value: endMemory.heapUsed / 1024 / 1024, // Convert to MB
        unit: 'mb',
        tags: {
          endpoint: `${req.method} ${req.route?.path || req.path}`,
          delta: memoryDelta / 1024 / 1024
        }
      }).catch(err => {
        healthLogger.warn({ err }, 'Failed to track memory usage');
      });
    }

    // Call the original end function
    // @ts-ignore - Express response.end has complex overloads
    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Periodic system health check (call this from a cron job or interval)
 */
export const recordSystemHealth = async () => {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    // Track memory metrics
    await advancedAnalyticsService.trackSystemMetric({
      metricType: 'memory_usage',
      value: memory.heapUsed / 1024 / 1024, // MB
      unit: 'mb',
      tags: {
        heapTotal: memory.heapTotal / 1024 / 1024,
        external: memory.external / 1024 / 1024,
        rss: memory.rss / 1024 / 1024
      }
    });

    // Track CPU usage (basic - in production, use better metrics)
    const cpuUsage = process.cpuUsage();
    await advancedAnalyticsService.trackSystemMetric({
      metricType: 'cpu_usage',
      value: ((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to seconds
      unit: 'percent',
      tags: {
        user: cpuUsage.user / 1000000,
        system: cpuUsage.system / 1000000,
        uptime: uptime,
        uptimeHours: Math.floor(uptime / 3600),
        uptimeDays: Math.floor(uptime / 86400)
      }
    });

    healthLogger.info('System health metrics recorded');
  } catch (error) {
    healthLogger.error({ err: error }, 'Failed to record system health metrics');
  }
};

/**
 * Start periodic health monitoring
 */
export const startHealthMonitoring = (intervalMs: number = 60000) => {
  setInterval(recordSystemHealth, intervalMs);
  // Silent start - monitoring active in background
};
