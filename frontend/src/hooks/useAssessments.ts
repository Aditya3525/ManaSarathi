/**
 * Assessment Hooks using React Query
 * 
 * Optimized data fetching hooks for assessments with automatic caching,
 * background refetching, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../lib/queryClient';
import { assessmentsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

/**
 * Fetch all assessment templates
 */
export function useAssessmentTemplates() {
  return useQuery({
    queryKey: queryKeys.assessmentTemplates,
    queryFn: async () => {
      const response = await assessmentsApi.getAssessmentTemplates();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch assessment templates');
      }
      return response.data?.templates ?? [];
    },
    staleTime: 15 * 60 * 1000, // Templates rarely change, cache for 15 minutes
  });
}

/**
 * Fetch available assessments (excludes basic overall assessments)
 * Returns assessments that should be displayed in the main assessment list
 */
export function useAvailableAssessments() {
  return useQuery({
    queryKey: ['availableAssessments'],
    queryFn: async () => {
      const response = await assessmentsApi.getAvailableAssessments();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch available assessments');
      }
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes as these rarely change
  });
}

/**
 * Fetch assessment history for current user
 */
export function useAssessmentHistory(options?: { enabled?: boolean }) {
  const userId = useAuthStore((state) => state.user?.id);
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.assessmentHistory(userId),
    queryFn: async () => {
      const response = await assessmentsApi.getAssessmentHistory();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch assessment history');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    enabled: (options?.enabled ?? true) && !!userId && !!token, // Only run if enabled for authenticated user
  });
}

/**
 * Fetch assessment insights (returns both history and insights)
 */
export function useAssessmentInsights() {
  const userId = useAuthStore((state) => state.user?.id);
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.assessmentInsights(userId),
    queryFn: async () => {
      const response = await assessmentsApi.getAssessmentHistory();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch insights');
      }
      return response.data?.insights;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!userId && !!token,
  });
}

/**
 * Submit assessment mutation with optimistic updates
 */
export function useSubmitAssessment() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const { push } = useNotificationStore();

  return useMutation({
    mutationFn: async (data: {
      assessmentType: string;
      responses: Record<string, number | string>;
      score: number;
      rawScore?: number;
      maxScore?: number;
      sessionId?: string;
      responseDetails?: Array<{
        questionId: string;
        questionText: string;
        answerLabel: string;
        answerValue: string | number | null;
        answerScore?: number;
      }>;
      categoryBreakdown?: Record<string, { raw: number; normalized: number; interpretation?: string }>;
    }) => {
      const response = await assessmentsApi.submitAssessment(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to submit assessment');
      }
      return response.data;
    },
    onSuccess: (data) => {
      if (userId && data?.history && data?.insights) {
        queryClient.setQueryData(queryKeys.assessmentHistory(userId), {
          history: data.history,
          insights: data.insights,
        });
        queryClient.setQueryData(queryKeys.assessmentInsights(userId), data.insights);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.assessmentHistory(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.assessmentInsights(userId) });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.assessments });

      push({
        title: 'Assessment Completed',
        description: 'Your assessment has been saved successfully.',
        type: 'success',
      });
    },
    onError: (error) => {
      push({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        type: 'error',
      });
    },
  });
}

/**
 * Start assessment session
 */
export function useStartAssessmentSession() {
  const queryClient = useQueryClient();
  const { push } = useNotificationStore();

  return useMutation({
    mutationFn: async (selectedTypes: string[]) => {
      const response = await assessmentsApi.startAssessmentSession({ selectedTypes });
      if (!response.success) {
        throw new Error(response.error || 'Failed to start session');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments });
    },
    onError: (error) => {
      push({
        title: 'Session Start Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        type: 'error',
      });
    },
  });
}

/**
 * Complete assessment session
 */
export function useCompleteAssessmentSession() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await assessmentsApi.updateAssessmentSessionStatus(sessionId, 'completed');
      if (!response.success) {
        throw new Error(response.error || 'Failed to complete session');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all assessment-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessmentHistory(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessmentInsights(userId) });
    },
  });
}

/**
 * Prefetch assessment templates (useful for preloading)
 */
export function usePrefetchAssessmentTemplates() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.assessmentTemplates,
      queryFn: async () => {
        const response = await assessmentsApi.getAssessmentTemplates();
        return response.data?.templates ?? [];
      },
    });
  };
}
