import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolve the API base URL for the current platform.
 * - Expo config / env var take precedence
 * - In development, Android emulators need 10.0.2.2 instead of localhost
 * - Physical devices need the host machine's LAN IP
 */
const resolveApiBaseUrl = (): string => {
  // 1. Explicit config always wins (skip if empty)
  const explicit =
    Constants.expoConfig?.extra?.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.trim().length > 0) return explicit;

  // 2. Try to derive host from Expo dev server URL (works in Expo Go & dev builds)
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    // debuggerHost is "192.168.x.x:8081" — strip the metro port and use backend port
    const host = debuggerHost.split(':')[0];
    const url = `http://${host}:5000/api`;
    console.log(`[Config] API URL resolved from debuggerHost: ${url}`);
    return url;
  }

  // 3. Fallback: Android emulator uses 10.0.2.2; iOS simulator can use localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

// API Configuration
export const API_BASE_URL = resolveApiBaseUrl();
console.log('[Config] API_BASE_URL =', API_BASE_URL);

export const GOOGLE_CLIENT_ID = 
  Constants.expoConfig?.extra?.googleClientId ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '';

export const APP_NAME = 
  Constants.expoConfig?.extra?.appName ||
  process.env.EXPO_PUBLIC_APP_NAME ||
  'ManaSarathi';

// App Configuration
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
export const APP_SCHEME = 'ManaSarathi';

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  LANGUAGE: 'app_language',
  THEME: 'app_theme',
  ACCESSIBILITY: 'accessibility_settings',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
} as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Feature Flags
export const FEATURES = {
  BIOMETRIC_AUTH: true,
  PUSH_NOTIFICATIONS: true,
  GOOGLE_OAUTH: true,
  OFFLINE_MODE: false, // Future feature
  PREMIUM_FEATURES: false, // Future feature
} as const;

// Assessment Types
export const ASSESSMENT_TYPES = {
  ANXIETY: 'anxiety',
  DEPRESSION: 'depression',
  STRESS: 'stress',
  WELLBEING: 'wellbeing',
  BURNOUT: 'burnout',
  SLEEP: 'sleep',
} as const;

// Mood Options
export const MOOD_OPTIONS = [
  { value: 'very_bad', label: '😢 Very Bad', color: '#ef4444' },
  { value: 'bad', label: '😔 Bad', color: '#f97316' },
  { value: 'okay', label: '😐 Okay', color: '#eab308' },
  { value: 'good', label: '🙂 Good', color: '#22c55e' },
  { value: 'very_good', label: '😊 Very Good', color: '#10b981' },
] as const;

// Time Constants
export const TIME_CONSTANTS = {
  SPLASH_DURATION: 2000,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_BIO_LENGTH: 500,
  MAX_NOTE_LENGTH: 1000,
} as const;
