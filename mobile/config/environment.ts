/**
 * Environment configuration for the mobile app
 * Supports development, staging, and production environments
 */

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  apiUrl: string;
  apiTimeout: number;
  enableLogging: boolean;
  enableAnalytics: boolean;
  sentryDsn?: string;
  stripePublishableKey?: string;
  googleOAuthClientId?: string;
  appleOAuthClientId?: string;
}

const environments: Record<Environment, EnvironmentConfig> = {
  development: {
    apiUrl: 'http://localhost:5000/api',
    apiTimeout: 30000,
    enableLogging: true,
    enableAnalytics: false,
    googleOAuthClientId: 'your-dev-google-client-id',
    appleOAuthClientId: 'your-dev-apple-client-id',
  },
  staging: {
    apiUrl: 'https://staging-api.MaanSarathi.app/api',
    apiTimeout: 30000,
    enableLogging: true,
    enableAnalytics: true,
    sentryDsn: 'your-staging-sentry-dsn',
    stripePublishableKey: 'pk_test_...',
    googleOAuthClientId: 'your-staging-google-client-id',
    appleOAuthClientId: 'your-staging-apple-client-id',
  },
  production: {
    apiUrl: 'https://api.MaanSarathi.app/api',
    apiTimeout: 30000,
    enableLogging: false,
    enableAnalytics: true,
    sentryDsn: 'your-production-sentry-dsn',
    stripePublishableKey: 'pk_live_...',
    googleOAuthClientId: 'your-prod-google-client-id',
    appleOAuthClientId: 'your-prod-apple-client-id',
  },
};

/**
 * Get current environment from process.env or default to development
 */
export function getCurrentEnvironment(): Environment {
  const env = process.env.NODE_ENV as Environment;
  return env && env in environments ? env : 'development';
}

/**
 * Get configuration for current environment
 */
export function getConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment();
  return environments[env];
}

/**
 * Environment-specific configuration
 */
export const config = getConfig();

/**
 * Check if running in development mode
 */
export const isDevelopment = getCurrentEnvironment() === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = getCurrentEnvironment() === 'production';

/**
 * App version and build number
 */
export const APP_VERSION = '1.0.0';
export const BUILD_NUMBER = '1';

/**
 * Feature flags
 */
export const FEATURE_FLAGS = {
  enableBiometricAuth: true,
  enablePushNotifications: true,
  enableOfflineMode: true,
  enableDeepLinking: true,
  enableAnalytics: config.enableAnalytics,
  enableCrashReporting: isProduction,
  enableDebugMenu: isDevelopment,
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  baseUrl: config.apiUrl,
  timeout: config.apiTimeout,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  maxSize: 50, // items per namespace
  enableLogging: config.enableLogging,
};

/**
 * Notification Configuration
 */
export const NOTIFICATION_CONFIG = {
  defaultMoodReminderTime: { hour: 20, minute: 0 },
  defaultPracticeReminderTime: { hour: 9, minute: 0 },
  enableBadgeCount: true,
  enableSound: true,
  enableVibration: true,
};

/**
 * Security Configuration
 */
export const SECURITY_CONFIG = {
  biometricLockTimeout: 30000, // 30 seconds
  sessionTimeout: 1000 * 60 * 60 * 24 * 7, // 7 days
  enableSecureStorage: true,
  minPasswordLength: 8,
};

/**
 * Analytics Configuration
 */
export const ANALYTICS_CONFIG = {
  enabled: config.enableAnalytics,
  trackScreenViews: true,
  trackUserInteractions: true,
  trackErrors: true,
};

/**
 * Logging Configuration
 */
export const LOGGING_CONFIG = {
  enabled: config.enableLogging,
  logLevel: isDevelopment ? 'debug' : 'error',
  sensitiveDataRedaction: isProduction,
};
