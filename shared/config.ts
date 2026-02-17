/**
 * Shared Configuration — Central Database & API Config
 * 
 * Both the webapp (frontend/) and mobile app (mobile/) connect to the
 * SAME backend API server, which uses a SINGLE database instance.
 * 
 * Architecture:
 *   ┌──────────────┐
 *   │  Web App     │──┐
 *   │  (React)     │  │
 *   └──────────────┘  │    ┌──────────────┐    ┌──────────────┐
 *                     ├───▶│  Backend API  │───▶│  Database    │
 *   ┌──────────────┐  │    │  (Express)   │    │  (Prisma)    │
 *   │  Mobile App  │──┘    └──────────────┘    └──────────────┘
 *   │  (Expo)      │
 *   └──────────────┘
 * 
 * IMPORTANT: Both apps share ONE database through the backend API.
 * Never access the database directly from either client app.
 */

// ============================================================================
// API Endpoints — Both apps must use these exact paths
// ============================================================================

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    GOOGLE_WEB: '/auth/google',              // Web: browser redirect flow
    GOOGLE_MOBILE: '/auth/google/mobile',     // Mobile: code exchange flow
    GOOGLE_CALLBACK: '/auth/google/callback',
    GOOGLE_STATUS: '/auth/google/status',
    SETUP_PASSWORD: '/auth/setup-password',
    SECURITY_QUESTION: '/auth/security-question',
    SECURITY_QUESTION_UPDATE: '/auth/security-question/update',
    PASSWORD_RESET_AUTH: '/auth/password/reset-with-answer',
    APPROACH_UPDATE: '/auth/approach/update',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    PROFILE: '/auth/profile',
    VALIDATE: '/auth/validate',
  },

  // Users
  USERS: {
    COMPLETE_ONBOARDING: '/users/complete-onboarding',
    PROFILE: '/users/profile',               // Alias for /auth/profile (mobile compat)
    CHANGE_PASSWORD: '/users/change-password',
    MOOD: '/users/mood',
    MOOD_HISTORY: '/users/mood-history',
    GET_BY_ID: (id: string) => `/users/${id}`,
  },

  // Mood (standalone routes)
  MOOD: {
    LOG: '/mood',
    HISTORY: '/mood',
  },

  // Assessments
  ASSESSMENTS: {
    LIST: '/assessments',
    AVAILABLE: '/assessments/available',
    TEMPLATES: '/assessments/templates',
    SUBMIT: '/assessments',
    SUBMIT_COMBINED: '/assessments/submit-combined',
    HISTORY: '/assessments/history',
    SESSIONS: '/assessments/sessions',
    ACTIVE_SESSION: '/assessments/sessions/active',
    SESSION: (id: string) => `/assessments/sessions/${id}`,
  },

  // Chat & Conversations
  CHAT: {
    MESSAGE: '/chat/message',
    HISTORY: '/chat/history',
    STARTERS: '/chat/starters',
    SUMMARY: (userId: string) => `/chat/summary/${userId}`,
    CHECK_IN: '/chat/check-in',
    GREETING: '/chat/greeting',
    EXERCISES: '/chat/exercises',
  },

  CONVERSATIONS: {
    LIST: '/conversations',
    CREATE: '/conversations',
    SEARCH: '/conversations/search',
    COUNT: '/conversations/count',
    EXPORT_BULK: '/conversations/export/bulk',
    GET: (id: string) => `/conversations/${id}`,
    UPDATE: (id: string) => `/conversations/${id}`,
    DELETE: (id: string) => `/conversations/${id}`,
    TITLE: (id: string) => `/conversations/${id}/title`,
    ARCHIVE: (id: string) => `/conversations/${id}/archive`,
    EXPORT: (id: string) => `/conversations/${id}/export`,
  },

  // Plans
  PLANS: {
    PERSONALIZED: '/plans/personalized',
    MODULE_PROGRESS: (id: string) => `/plans/modules/${id}/progress`,
    MODULE_COMPLETE: (id: string) => `/plans/modules/${id}/complete`,
  },

  // Content & Engagement
  CONTENT: {
    LIST: '/content',
    GET: (id: string) => `/content/${id}`,
    ENGAGE: (id: string) => `/content/${id}/engage`,
    ENGAGEMENT: (id: string) => `/content/${id}/engagement`,
    USER_ENGAGEMENTS: '/content/engagements/me',
    BOOKMARK: (id: string) => `/content/${id}/bookmark`,
    BOOKMARKS: '/content/bookmarks',
  },

  // Practices
  PRACTICES: {
    LIST: '/practices',
    GET: (id: string) => `/practices/${id}`,
    LOG_SESSION: '/practices/sessions',
  },

  // Progress
  PROGRESS: {
    TRACK: '/progress',
    HISTORY: '/progress',
  },

  // Recommendations
  RECOMMENDATIONS: {
    PERSONALIZED: '/recommendations/personalized',
  },

  // Dashboard
  DASHBOARD: {
    SUMMARY: '/dashboard/summary',
    INSIGHTS: '/dashboard/insights',
    REFRESH_INSIGHTS: '/dashboard/insights/refresh',
    WEEKLY_PROGRESS: '/dashboard/weekly-progress',
    RECOMMENDED_PRACTICE: '/dashboard/recommended-practice',
  },

  // Crisis & Safety
  CRISIS: {
    CHECK: '/crisis/check',
    RESOURCES: '/crisis/resources',
    SAFETY_PLAN: '/crisis/safety-plan',
  },

  // FAQ
  FAQ: {
    LIST: '/faq',
    SEARCH: '/faq/search',
    VIEW: (id: string) => `/faq/${id}/view`,
    VOTE: (id: string) => `/faq/${id}/vote`,
  },

  // Support
  SUPPORT: {
    TICKETS: '/support/tickets',
    TICKET: (id: string) => `/support/tickets/${id}`,
    ACKNOWLEDGE: (id: string) => `/support/tickets/${id}/acknowledge`,
  },

  // Therapists
  THERAPISTS: {
    LIST: '/therapists',
    SEARCH: '/therapists/search',
    GET: (id: string) => `/therapists/${id}`,
    BOOKING: '/therapists/booking',
    BOOKINGS: '/therapists/bookings',
    CANCEL_BOOKING: (id: string) => `/therapists/bookings/${id}`,
  },

  // Health
  HEALTH: {
    CHECK: '/health',
    READY: '/health/ready',
  },
} as const;

// ============================================================================
// Environment URLs
// ============================================================================

export const ENVIRONMENTS = {
  development: {
    apiUrl: 'http://localhost:5000/api',
    webUrl: 'http://localhost:3000',
  },
  staging: {
    apiUrl: 'https://staging-api.maansarathi.app/api',
    webUrl: 'https://staging.maansarathi.app',
  },
  production: {
    apiUrl: 'https://api.maansarathi.app/api',
    webUrl: 'https://maansarathi.app',
  },
} as const;

// ============================================================================
// Feature Flags — Shared between both apps
// ============================================================================

export const FEATURES = {
  GOOGLE_OAUTH: true,
  BIOMETRIC_AUTH: true,         // Mobile only
  PUSH_NOTIFICATIONS: true,     // Mobile only
  OFFLINE_CACHE: true,          // Mobile only
  PWA_INSTALL: true,            // Web only
  PREMIUM: false,               // Not yet implemented
  ANALYTICS: true,
  CRISIS_DETECTION: true,
  AI_CHATBOT: true,
  GAMES: true,
  CONTENT_BOOKMARKS: true,
  PRACTICE_SESSIONS: true,
  SAFETY_PLAN: true,
  THERAPIST_BOOKING: true,
} as const;

// ============================================================================
// App Constants — Shared
// ============================================================================

export const APP = {
  NAME: 'MaanSarathi',
  BUNDLE_ID: 'com.maansarathi.app',
  SCHEME: 'maansarathi',
  SUPPORTED_LANGUAGES: ['en', 'hi', 'es', 'fr', 'de', 'zh'] as const,
  DEFAULT_LANGUAGE: 'en',
  ASSESSMENT_TYPES: [
    'gad2',        // Anxiety (GAD-2)
    'phq2',        // Depression (PHQ-2) 
    'pss4',        // Stress (PSS-4)
    'rrs4',        // Overthinking (RRS-4)
    'pcptsd5',     // Trauma (PC-PTSD-5)
    'eq5',         // Emotional Intelligence (EQ-5)
    'bigfive10',   // Personality (Big Five-10)
  ] as const,
  MOOD_LEVELS: ['very_bad', 'bad', 'neutral', 'good', 'great'] as const,
  APPROACHES: ['western', 'eastern', 'hybrid'] as const,
} as const;
