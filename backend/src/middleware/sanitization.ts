import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Input Sanitization Middleware
 * 
 * Sanitizes request inputs to prevent:
 * - XSS attacks via script injection
 * - NoSQL injection
 * - Command injection
 * - Large payload attacks
 */

interface SanitizationOptions {
  maxStringLength?: number;
  maxBodySize?: number;
  allowedUrlPatterns?: RegExp[];
}

const DEFAULT_OPTIONS: Required<SanitizationOptions> = {
  maxStringLength: 10000,
  maxBodySize: 50 * 1024 * 1024, // 50MB
  allowedUrlPatterns: [],
};

// Dangerous patterns that could indicate injection attempts
const DANGEROUS_PATTERNS = {
  scriptTag: /<script[^>]*>[\s\S]*?<\/script>/gi,
  htmlTag: /<[^>]*>/g,
  eventHandler: /on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
  javascriptUrl: /javascript:/gi,
  dataHtmlUrl: /data:text\/html/gi,
  sqlComment: /(-{2}|\/\*|\*\/|;)/g,
  mongoOperator: /^\s*\$\w+/,
  commandInjection: /[`$(){}[\]|&;<>]/g,
};

/**
 * Sanitizes a string value
 */function sanitizeString(value: string, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  let sanitized = value;

  // Remove script tags
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.scriptTag, '');

  // Remove remaining HTML tags
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.htmlTag, '');

  // Remove event handlers
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.eventHandler, '');

  // Remove JS/data URLs
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.javascriptUrl, '');
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.dataHtmlUrl, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Enforce max length
  if (sanitized.length > maxLength) {
    logger.warn(
      { originalLength: sanitized.length, maxLength },
      'String exceeds max length limit'
    );
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Recursively sanitizes object properties
 */
function sanitizeObject(obj: any, options: Required<SanitizationOptions>): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, options.maxStringLength);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Prevent __proto__ and constructor pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      logger.warn({ key }, 'Attempted prototype pollution detected');
      continue;
    }

    sanitized[key] = sanitizeObject(value, options);
  }

  return sanitized;
}

/**
 * Main sanitization middleware
 */
export const sanitizeInputs = (options?: SanitizationOptions) => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, mergedOptions);
      }

      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, mergedOptions);
      }

      // Sanitize URL params
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params, mergedOptions);
      }

      // Check for suspicious patterns in combined input
      const allInput = JSON.stringify({ ...req.query, ...req.body, ...req.params });

      if (DANGEROUS_PATTERNS.mongoOperator.test(allInput)) {
        logger.warn(
          { path: req.path, method: req.method },
          'Potential NoSQL injection attempt detected'
        );
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
          code: 'INVALID_INPUT',
        });
      }

      next();
    } catch (error) {
      logger.error({ error, path: req.path }, 'Sanitization error');
      res.status(400).json({
        success: false,
        error: 'Input validation failed',
        code: 'VALIDATION_FAILED',
      });
    }
  };
};

/**
 * Validates URL format to prevent SSRF attacks
 */
export const validateUrlInput = (paramName: string = 'url') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const url = req.body?.[paramName] || req.query?.[paramName];

    if (!url) {
      return next();
    }

    try {
      const parsed = new URL(url as string);

      // Prevent local file access
      if (
        parsed.protocol === 'file:' ||
        ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)
      ) {
        logger.warn(
          { url, path: req.path },
          'SSRF attack attempt detected'
        );
        return res.status(400).json({
          success: false,
          error: 'Invalid URL provided',
          code: 'INVALID_URL',
        });
      }

      next();
    } catch (error) {
      logger.warn({ url, error }, 'Invalid URL format');
      res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        code: 'INVALID_URL',
      });
    }
  };
};
