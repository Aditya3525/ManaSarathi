import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  ClipboardList,
  Shield,
  TrendingUp,
  Users
} from 'lucide-react';
import React from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { getApiBaseUrl } from '../config/apiConfig';

import { adminFetch } from './adminApi';
import { AdminSectionCard } from './AdminSectionCard';
import { useAdminDashboardSummary } from './hooks/useAdminQueries';

interface AdminOverviewProps {
  onNavigate: (tab: string) => void;
}

interface ReadyProviderStatus {
  available: boolean;
  name: string;
  cooldownActive: boolean;
  cooldownExpiresAt: string | null;
  lastError?: string;
}

interface ReadyCheckResponse {
  status: string;
  checks?: {
    providers?: Record<string, ReadyProviderStatus>;
  };
}

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export function AdminOverview({ onNavigate }: AdminOverviewProps) {
  const summaryQuery = useAdminDashboardSummary();

  const readyQuery = useQuery({
    queryKey: ['admin', 'health', 'ready'],
    queryFn: async () => {
      const response = await adminFetch(`${getApiBaseUrl()}/health/ready`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return (await response.json()) as ReadyCheckResponse;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return (
      <AdminSectionCard
        icon={Activity}
        title="Overview"
        description="Operational snapshot for users, content, and system readiness"
        contentClassName="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`overview-kpi-skeleton-${index}`}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </AdminSectionCard>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <AdminSectionCard
        icon={Activity}
        title="Overview"
        description="Operational snapshot for users, content, and system readiness"
      >
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-destructive">
              {summaryQuery.error instanceof Error
                ? summaryQuery.error.message
                : 'Failed to load overview summary'}
            </p>
            <Button variant="outline" onClick={() => void summaryQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </AdminSectionCard>
    );
  }

  const { kpis, attention, recentActivity } = summaryQuery.data;

  const overviewCards = [
    {
      title: 'Total Users',
      value: kpis.totalUsers,
      subtitle: `${kpis.newUsersLast7d} new in last 7 days`,
      icon: Users,
      tone: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Active Users (7d)',
      value: kpis.activeUsersLast7d,
      subtitle: `${kpis.userGrowthPercent >= 0 ? '+' : ''}${kpis.userGrowthPercent}% vs previous 7 days`,
      icon: TrendingUp,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      title: 'Content & Practices',
      value: kpis.totalContent + kpis.totalPractices,
      subtitle: `${kpis.publishedContent + kpis.publishedPractices} published`,
      icon: BookOpen,
      tone: 'text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Assessments',
      value: kpis.totalAssessments,
      subtitle: 'Published assessment definitions',
      icon: ClipboardList,
      tone: 'text-teal-600 bg-teal-50',
    },
  ];

  const attentionItems = [
    {
      key: 'pending-tickets',
      label: 'Open support tickets',
      value: attention.pendingTickets,
      tab: 'support-tickets',
    },
    {
      key: 'urgent-tickets',
      label: 'Urgent support tickets',
      value: attention.urgentTickets,
      tab: 'support-tickets',
    },
    {
      key: 'pending-bookings',
      label: 'Pending therapist bookings',
      value: attention.pendingTherapistBookings,
      tab: 'therapists',
    },
    {
      key: 'crisis-events',
      label: 'Crisis events (last 7d)',
      value: attention.crisisEventsLast7d,
      tab: 'crisis-resources',
    },
  ];

  const providers = Object.entries(readyQuery.data?.checks?.providers ?? {});

  return (
    <AdminSectionCard
      icon={Activity}
      title="Overview"
      description="Operational snapshot for users, content, and system readiness"
      contentClassName="space-y-6"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-semibold mt-1">{card.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-2">{card.subtitle}</p>
                </div>
                <div className={`rounded-lg p-2 ${card.tone}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attentionItems.map((item) => (
              <Button
                key={item.key}
                variant="ghost"
                className="w-full justify-between"
                onClick={() => onNavigate(item.tab)}
              >
                <span className="text-sm text-left">{item.label}</span>
                <span className="flex items-center gap-2">
                  <Badge variant={item.value > 0 ? 'destructive' : 'secondary'}>{item.value}</Badge>
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-violet-600" />
              AI Provider Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Service readiness</span>
              <Badge variant={readyQuery.data?.status === 'ready' ? 'default' : 'secondary'}>
                {readyQuery.data?.status === 'ready' ? 'Ready' : 'Degraded'}
              </Badge>
            </div>
            {readyQuery.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No provider status available.</p>
            ) : (
              <div className="space-y-2">
                {providers.map(([providerKey, provider]) => (
                  <div key={providerKey} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{provider.name || providerKey}</span>
                    </div>
                    <Badge variant={provider.available ? 'default' : 'secondary'}>
                      {provider.available ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('activity')}>
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              recentActivity.map((entry) => (
                <div key={entry.id} className="rounded-md border px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {entry.action} {entry.entityType.toLowerCase()}
                      </p>
                      {entry.details ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.details}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AdminSectionCard>
  );
}
