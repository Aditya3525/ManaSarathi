/**
 * Mood Tracking Hooks using React Query
 * 
 * Optimized hooks for mood entries with automatic caching and background syncing.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../contexts/ToastContext';
import { queryKeys } from '../lib/queryClient';
import { moodApi } from '../services/api';

/**
 * Fetch mood history
 */
export function useMoodHistory() {
  return useQuery({
    queryKey: queryKeys.moodHistory(),
    queryFn: async () => {
      const response = await moodApi.getMoodHistory();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch mood history');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

/**
 * Log mood entry mutation
 */
export function useLogMood() {
  const queryClient = useQueryClient();
  const { push } = useToast();

  return useMutation({
    mutationFn: async (data: {
      mood: string;
      notes?: string;
    }) => {
      const response = await moodApi.logMood({ mood: data.mood, notes: data.notes });
      if (!response.success) {
        throw new Error(response.error || 'Failed to log mood');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate mood-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.mood });
      queryClient.invalidateQueries({ queryKey: queryKeys.moodHistory() });
      
      push({
        title: 'Mood Logged',
        description: 'Your mood has been recorded successfully.',
        type: 'success',
      });
    },
    onError: (error) => {
      push({
        title: 'Failed to Log Mood',
        description: error instanceof Error ? error.message : 'Please try again.',
        type: 'error',
      });
    },
  });
}

/**
 * Prefetch mood history for faster navigation
 */
export function usePrefetchMoodHistory() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.moodHistory(),
      queryFn: async () => {
        const response = await moodApi.getMoodHistory();
        return response.data;
      },
    });
  };
}
