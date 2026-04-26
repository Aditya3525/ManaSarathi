import { useQuery } from '@tanstack/react-query';

import { getApiBaseUrl } from '../../config/apiConfig';
import { adminFetch } from '../adminApi';

export type AdminTimeframe = '7d' | '30d' | '90d' | 'all';

export interface AdminDashboardSummary {
  kpis: {
    totalUsers: number;
    activeUsersLast7d: number;
    newUsersLast7d: number;
    userGrowthPercent: number;
    totalPractices: number;
    totalContent: number;
    publishedPractices: number;
    publishedContent: number;
    totalAssessments: number;
  };
  attention: {
    pendingTickets: number;
    urgentTickets: number;
    pendingTherapistBookings: number;
    crisisEventsLast7d: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    details: string | null;
    createdAt: string;
  }>;
}

export interface AdminAnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    premiumUsers: number;
    activeRate: string;
    premiumRate: string;
  };
  assessments: {
    totalAssessments: number;
    completedAssessments: number;
    completionRate: string;
    averagePerUser: string;
    byType: Array<{
      assessmentType: string;
      name: string;
      id: string;
      type?: string;
      completions: number;
    }>;
  };
  practices: {
    totalPractices: number;
    completions: number;
    popular: Array<{
      id: string;
      title: string;
      type: string;
      duration: number;
    }>;
  };
  content: {
    totalContent: number;
    views: number;
    popular: Array<{
      id: string;
      title: string;
      type: string;
      category: string;
    }>;
  };
  trends: {
    userGrowth: Array<{ date: string; count: number }>;
    engagement: Array<{ date: string; count: number }>;
  };
  timeframe: {
    type: string;
    startDate: string;
    endDate: string;
  };
}

const adminQueryKeys = {
  dashboardSummary: ['admin', 'dashboard', 'summary'] as const,
  practices: ['admin', 'practices'] as const,
  content: ['admin', 'content'] as const,
  analytics: (timeframe: AdminTimeframe) => ['admin', 'analytics', timeframe] as const,
};

const requestAdminData = async <T>(path: string): Promise<T> => {
  const response = await adminFetch(`${getApiBaseUrl()}${path}`);
  const payload = await response.json().catch(() => ({} as Record<string, unknown>));

  if (!response.ok || payload.success === false) {
    throw new Error(
      (typeof payload.error === 'string' && payload.error) ||
      (typeof payload.message === 'string' && payload.message) ||
      `Request failed: ${response.status}`
    );
  }

  return (payload.data ?? payload) as T;
};

const requestAdminArray = async <T>(path: string): Promise<T[]> => {
  const response = await adminFetch(`${getApiBaseUrl()}${path}`);
  const payload = await response.json().catch(() => ({} as Record<string, unknown>));

  if (!response.ok || payload.success === false) {
    throw new Error(
      (typeof payload.error === 'string' && payload.error) ||
      (typeof payload.message === 'string' && payload.message) ||
      `Request failed: ${response.status}`
    );
  }

  const data = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  return data as T[];
};

export function useAdminDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.dashboardSummary,
    queryFn: () => requestAdminData<AdminDashboardSummary>('/admin/dashboard/summary'),
    staleTime: 30_000,
    enabled,
  });
}

export function useAdminPractices(enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.practices,
    queryFn: () => requestAdminArray<Record<string, unknown>>('/admin/practices'),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminContent(enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.content,
    queryFn: () => requestAdminArray<Record<string, unknown>>('/admin/content'),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminAnalytics(timeframe: AdminTimeframe, enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.analytics(timeframe),
    queryFn: () => requestAdminData<AdminAnalyticsData>(`/admin/analytics?timeframe=${timeframe}`),
    staleTime: 45_000,
    enabled,
  });
}
