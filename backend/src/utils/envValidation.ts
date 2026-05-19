/**
 * Environment Variable Validation
 * 
 * Ensures all required environment variables are set and valid
 * Runs on application startup to fail fast in production
 */

import { logger } from '../utils/logger';

interface EnvVarConfig {
  name: string;
  required: boolean;
  production?: boolean; // Only required in production
  validate?: (value: string) => boolean;
  default?: string;
}

const ENV_VARS_CONFIG: EnvVarConfig[] = [
  // Core server
  { name: 'NODE_ENV', required: true },
  { name: 'PORT', required: false, default: '5000' },

  // Database
  { name: 'DATABASE_URL', required: true },

  // Authentication
  { name: 'JWT_SECRET', required: true, production: true },
  { name: 'SESSION_SECRET', required: true, production: true },

  // Frontend URLs
  { name: 'FRONTEND_URL', required: true },
  { name: 'BACKEND_URL', required: false },
  { name: 'MOBILE_URL', required: false },

  // AI Providers
  { name: 'AI_PROVIDER_PRIORITY', required: false, default: 'huggingface,gemini' },
  { name: 'AI_ENABLE_FALLBACK', required: false, default: 'true' },
  { name: 'AI_TIMEOUT', required: false, default: '30000' },

  // OAuth (optional - feature)
  { name: 'GOOGLE_CLIENT_ID', required: false },
  { name: 'GOOGLE_CLIENT_SECRET', required: false },

  // Rate Limiting
  { name: 'RATE_LIMIT_WINDOW_MS', required: false, default: '900000' },
  { name: 'RATE_LIMIT_MAX_REQUESTS', required: false, default: '100' },

  // Logging
  { name: 'LOG_LEVEL', required: false, default: 'info' },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): ValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_VARS_CONFIG) {
    const value = process.env[config.name];

    // Check if required
    if (config.required || (config.production && isProduction)) {
      if (!value || !value.trim()) {
        errors.push(
          `Missing required environment variable: ${config.name}`
        );
        continue;
      }
    }

    // Apply custom validation if provided
    if (value && config.validate && !config.validate(value)) {
      errors.push(
        `Invalid value for ${config.name}: ${value}`
      );
      continue;
    }

    // Check for development values in production
    if (isProduction && value) {
      if (config.name === 'DATABASE_URL' && value.includes('dev.db')) {
        errors.push(
          'DATABASE_URL points to development SQLite in production - use PostgreSQL!'
        );
      }

      if (
        (config.name === 'JWT_SECRET' || config.name === 'SESSION_SECRET') &&
        (value === 'dev-fallback-secret' ||
          value === 'dev-session-secret' ||
          value.length < 32)
      ) {
        errors.push(
          `${config.name} is insecure in production (must be ≥32 chars random)`
        );
      }

      if (
        config.name === 'FRONTEND_URL' &&
        !value.startsWith('https://')
      ) {
        errors.push(
          'FRONTEND_URL must use HTTPS in production'
        );
      }

      if (
        config.name === 'BACKEND_URL' &&
        value &&
        !value.startsWith('https://')
      ) {
        errors.push(
          'BACKEND_URL must use HTTPS in production'
        );
      }
    }

    // Warnings for development issues
    if (!isProduction) {
      if (!value && config.default) {
        warnings.push(
          `Using default for ${config.name}: ${config.default}`
        );
      }
    }
  }

  // Additional security checks
  if (isProduction) {
    if (process.env.AI_VERBOSE_LOGGING === 'true') {
      warnings.push(
        'AI_VERBOSE_LOGGING is enabled in production (may log sensitive data)'
      );
    }

    if (process.env.LOG_LEVEL === 'debug') {
      warnings.push('LOG_LEVEL is set to debug in production');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log validation results and exit if there are errors
 */
export function enforceEnvironmentValidation(): void {
  const result = validateEnvironment();
  const isProduction = process.env.NODE_ENV === 'production';

  if (result.errors.length > 0) {
    logger.error(
      { errors: result.errors },
      '❌ Environment validation failed'
    );

    if (isProduction) {
      console.error('FATAL: Environment validation failed. Exiting.');
      process.exit(1);
    }
  }

  if (result.warnings.length > 0) {
    logger.warn(
      { warnings: result.warnings },
      '⚠️  Environment warnings'
    );
  }

  if (result.errors.length === 0) {
    logger.info('✅ Environment validation passed');
  }
}
