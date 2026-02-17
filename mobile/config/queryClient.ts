import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/utils/queryKeys';

/**
 * React Query Client Configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

/**
 * Extended query keys with content-specific methods
 */
export const QUERY_KEYS = {
  ...queryKeys,
  content: {
    ...queryKeys.content,
    article: (id: string) => [...queryKeys.content.all, 'article', id] as const,
    video: (id: string) => [...queryKeys.content.all, 'video', id] as const,
    practice: (id: string) => [...queryKeys.content.all, 'practice', id] as const,
    bookmarks: () => [...queryKeys.content.all, 'bookmarks'] as const,
  },
  practices: {
    ...queryKeys.practices,
    history: () => [...queryKeys.practices.all, 'history'] as const,
  },
  chat: {
    ...queryKeys.chat,
    messages: (conversationId: string) => [...queryKeys.chat.all, 'messages', conversationId] as const,
  },
  assessments: {
    ...queryKeys.assessments,
    template: (id: string) => [...queryKeys.assessments.all, 'template', id] as const,
    result: (id: string) => [...queryKeys.assessments.all, 'result', id] as const,
  },
  users: {
    all: ['users'] as const,
    profile: () => ['users', 'profile'] as const,
  },
} as const;
