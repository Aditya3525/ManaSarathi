/**
 * React Query key factories for consistent query key management
 * Follows TanStack Query best practices with key factory pattern
 */

export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    currentUser: () => [...queryKeys.auth.all, 'current-user'] as const,
    status: () => [...queryKeys.auth.all, 'status'] as const,
  },

  // Assessments
  assessments: {
    all: ['assessments'] as const,
    lists: () => [...queryKeys.assessments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.assessments.lists(), filters] as const,
    available: () => [...queryKeys.assessments.all, 'available'] as const,
    templates: (types?: string[]) => 
      [...queryKeys.assessments.all, 'templates', types] as const,
    history: () => [...queryKeys.assessments.all, 'history'] as const,
    insights: () => [...queryKeys.assessments.all, 'insights'] as const,
    detail: (id: string) => [...queryKeys.assessments.all, 'detail', id] as const,
    session: {
      all: ['assessment-sessions'] as const,
      active: () => [...queryKeys.assessments.session.all, 'active'] as const,
      detail: (id: string) => [...queryKeys.assessments.session.all, id] as const,
    },
  },

  // Mood
  mood: {
    all: ['mood'] as const,
    history: (params?: { startDate?: string; endDate?: string }) => 
      [...queryKeys.mood.all, 'history', params] as const,
    trends: () => [...queryKeys.mood.all, 'trends'] as const,
  },

  // Progress
  progress: {
    all: ['progress'] as const,
    history: (metric?: string) => 
      [...queryKeys.progress.all, 'history', metric] as const,
    metrics: () => [...queryKeys.progress.all, 'metrics'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
    insights: () => [...queryKeys.dashboard.all, 'insights'] as const,
    weeklyProgress: () => [...queryKeys.dashboard.all, 'weekly-progress'] as const,
    recommendedPractice: () => [...queryKeys.dashboard.all, 'recommended-practice'] as const,
  },

  // Chat & Conversations
  conversations: {
    all: ['conversations'] as const,
    lists: () => [...queryKeys.conversations.all, 'list'] as const,
    list: (includeArchived = false) => 
      [...queryKeys.conversations.lists(), { includeArchived }] as const,
    detail: (id: string) => [...queryKeys.conversations.all, 'detail', id] as const,
    search: (query: string) => [...queryKeys.conversations.all, 'search', query] as const,
    count: (includeArchived = false) => 
      [...queryKeys.conversations.all, 'count', { includeArchived }] as const,
  },

  chat: {
    all: ['chat'] as const,
    history: () => [...queryKeys.chat.all, 'history'] as const,
    starters: () => [...queryKeys.chat.all, 'starters'] as const,
    checkIn: () => [...queryKeys.chat.all, 'check-in'] as const,
    greeting: () => [...queryKeys.chat.all, 'greeting'] as const,
    exercises: (message?: string) => [...queryKeys.chat.all, 'exercises', message] as const,
  },

  // Content & Practices
  content: {
    all: ['content'] as const,
    lists: () => [...queryKeys.content.all, 'list'] as const,
    list: (filters?: { category?: string; type?: string; approach?: string }) => 
      [...queryKeys.content.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.content.all, 'detail', id] as const,
    engagement: (id: string) => [...queryKeys.content.all, 'engagement', id] as const,
    userEngagements: () => [...queryKeys.content.all, 'user-engagements'] as const,
  },

  practices: {
    all: ['practices'] as const,
    lists: () => [...queryKeys.practices.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.practices.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.practices.all, 'detail', id] as const,
  },

  // Plans
  plans: {
    all: ['plans'] as const,
    personalized: () => [...queryKeys.plans.all, 'personalized'] as const,
    module: (id: string) => [...queryKeys.plans.all, 'module', id] as const,
  },

  // Recommendations
  recommendations: {
    all: ['recommendations'] as const,
    personalized: (context?: Record<string, unknown>) => 
      [...queryKeys.recommendations.all, 'personalized', context] as const,
  },

  // Crisis & Help
  crisis: {
    all: ['crisis'] as const,
    level: () => [...queryKeys.crisis.all, 'level'] as const,
    resources: () => [...queryKeys.crisis.all, 'resources'] as const,
    safetyPlan: () => [...queryKeys.crisis.all, 'safety-plan'] as const,
  },

  // FAQ
  faq: {
    all: ['faq'] as const,
    lists: () => [...queryKeys.faq.all, 'list'] as const,
    list: (category?: string) => [...queryKeys.faq.lists(), category] as const,
    search: (query: string) => [...queryKeys.faq.all, 'search', query] as const,
    detail: (id: string) => [...queryKeys.faq.all, 'detail', id] as const,
  },

  // Support
  support: {
    all: ['support'] as const,
    tickets: () => [...queryKeys.support.all, 'tickets'] as const,
    ticket: (id: string) => [...queryKeys.support.all, 'ticket', id] as const,
  },

  // Therapists
  therapists: {
    all: ['therapists'] as const,
    lists: () => [...queryKeys.therapists.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.therapists.lists(), filters] as const,
    search: (query: string, filters?: Record<string, unknown>) => 
      [...queryKeys.therapists.all, 'search', query, filters] as const,
    detail: (id: string) => [...queryKeys.therapists.all, 'detail', id] as const,
    bookings: () => [...queryKeys.therapists.all, 'bookings'] as const,
  },
} as const;

/**
 * Helper to invalidate all queries for a feature
 */
export const getFeatureKeys = (feature: keyof typeof queryKeys) => {
  return queryKeys[feature].all;
};
