/**
 * React Query Configuration
 * 
 * Centralized configuration for all data fetching in the application.
 * Provides automatic caching, background refetching, and optimistic updates.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests 2 times
      retry: 2,
      
      // Don't refetch on window focus in development
      refetchOnWindowFocus: import.meta.env.PROD,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Don't refetch on mount by default
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  // User queries
  currentUser: ['user', 'current'] as const,
  userProfile: (userId: string) => ['user', 'profile', userId] as const,
  
  // Assessment queries
  assessments: ['assessments'] as const,
  assessmentTemplates: ['assessments', 'templates'] as const,
  assessmentHistory: (userId?: string) => 
    userId ? ['assessments', 'history', userId] : ['assessments', 'history'] as const,
  assessmentInsights: (userId?: string) => 
    userId ? ['assessments', 'insights', userId] : ['assessments', 'insights'] as const,
  assessmentById: (id: string) => ['assessments', id] as const,
  
  // Mood queries
  mood: ['mood'] as const,
  moodEntries: (userId?: string) => 
    userId ? ['mood', 'entries', userId] : ['mood', 'entries'] as const,
  moodHistory: (userId?: string) =>
    userId ? ['mood', 'history', userId] : ['mood', 'history'] as const,
  moodTrend: (userId?: string, days?: number) => 
    userId ? ['mood', 'trend', userId, days] : ['mood', 'trend', days] as const,
  
  // Chat queries
  chatHistory: (userId?: string) => 
    userId ? ['chat', 'history', userId] : ['chat', 'history'] as const,
  conversationMemory: (userId?: string) => 
    userId ? ['chat', 'memory', userId] : ['chat', 'memory'] as const,
  
  // Plan queries
  personalizedPlan: (userId?: string) => 
    userId ? ['plans', userId] : ['plans'] as const,
  planModules: ['plans', 'modules'] as const,
  
  // Content queries
  content: ['content'] as const,
  contentById: (id: string) => ['content', id] as const,
  practices: ['practices'] as const,
  practiceById: (id: string) => ['practices', id] as const,
  recommendations: (userId?: string) => 
    userId ? ['content', 'recommendations', userId] : ['content', 'recommendations'] as const,
  
  // Progress queries
  progress: (userId?: string, metric?: string) => 
    userId && metric ? ['progress', userId, metric] : 
    userId ? ['progress', userId] : ['progress'] as const,
};
