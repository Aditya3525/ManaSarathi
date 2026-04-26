import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Goal,
  HeartPulse,
  Sparkles,
  TrendingUp,
  UserCircle2,
} from 'lucide-react';
import React, { useMemo } from 'react';

import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

import { TherapistClientSummary, useTherapistClientSummaryQuery } from './hooks/useTherapistQueries';

interface ClientProfileProps {
  clientId?: string | null;
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
  }).format(date);
}

function getSeverityColor(severity?: string | null) {
  switch ((severity || '').toLowerCase()) {
    case 'high':
    case 'critical':
      return 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300';
    case 'medium':
      return 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
    default:
      return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300';
  }
}

export function ClientProfile({ clientId }: ClientProfileProps) {
  const { data, isLoading: loading, error } = useTherapistClientSummaryQuery(clientId) as {
    data: TherapistClientSummary | undefined;
    isLoading: boolean;
    error: unknown;
  };
  const errorMessage = error instanceof Error ? error.message : null;

  const latestCheckIn = useMemo(() => data?.checkIns?.[0] ?? null, [data]);

  if (!clientId) {
    return (
      <Card>
        <CardContent className="flex min-h-[360px] items-center justify-center text-center text-sm text-muted-foreground">
          Select a client to see session history, goals, check-ins, and insights.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">{errorMessage}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-emerald-600" />
                {data.client.name}
              </CardTitle>
              <CardDescription>{data.client.email}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.client.approach ? <Badge variant="outline">{data.client.approach}</Badge> : null}
              {data.client.level ? <Badge variant="secondary">{data.client.level}</Badge> : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Sessions</p>
              <p className="mt-1 text-2xl font-semibold">{data.stats.totalBookings}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{data.stats.completedSessions}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Completion Rate</p>
              <p className="mt-1 text-2xl font-semibold">{data.stats.completionRate}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">No Shows</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{data.stats.noShowSessions}</p>
            </div>
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5" />
              Last session: {formatDate(data.stats.lastSessionAt, true)}
            </p>
            <p className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5" />
              Next session: {formatDate(data.stats.nextSessionAt, true)}
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4 text-emerald-600" /> Latest Wellness Check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestCheckIn ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Mood</p>
                    <p className="font-semibold">{latestCheckIn.moodScore ?? 'N/A'}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Stress</p>
                    <p className="font-semibold">{latestCheckIn.stressScore ?? 'N/A'}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Sleep (hrs)</p>
                    <p className="font-semibold">{latestCheckIn.sleepHours ?? 'N/A'}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Energy</p>
                    <p className="font-semibold">{latestCheckIn.energyLevel || 'N/A'}</p>
                  </div>
                </div>
                {latestCheckIn.notes ? (
                  <div className="rounded-md border bg-muted/20 p-3 text-sm">{latestCheckIn.notes}</div>
                ) : null}
                <p className="text-xs text-muted-foreground">Recorded {formatDate(latestCheckIn.createdAt, true)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No check-ins available for this client yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Goal className="h-4 w-4 text-emerald-600" /> Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals tracked for this client.</p>
            ) : (
              data.goals.slice(0, 5).map((goal) => (
                <div key={goal.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{goal.title}</p>
                    <Badge variant={goal.status.toUpperCase() === 'COMPLETED' ? 'default' : 'outline'}>
                      {goal.status}
                    </Badge>
                  </div>
                  {goal.description ? <p className="mt-1 text-xs text-muted-foreground">{goal.description}</p> : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Target: {goal.targetDate ? formatDate(goal.targetDate) : 'Not set'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-emerald-600" /> Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
            ) : (
              data.bookings.slice(0, 6).map((booking) => (
                <div key={booking.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{booking.sessionType}</p>
                    <Badge variant="outline">{booking.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(booking.scheduledAt, true)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Duration: {booking.durationMinutes} min</p>
                  {booking.notes ? (
                    <p className="mt-2 rounded bg-muted/20 p-2 text-xs text-muted-foreground">{booking.notes}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-emerald-600" /> AI Insights
            </CardTitle>
            <CardDescription>Signals and recommendations based on recent client activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">No insights generated yet.</p>
            ) : (
              data.insights.slice(0, 6).map((insight) => (
                <div key={insight.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {insight.type.toLowerCase().includes('risk') ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        ) : insight.type.toLowerCase().includes('progress') ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        ) : insight.type.toLowerCase().includes('action') ? (
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Activity className="h-4 w-4 text-emerald-600" />
                        )}
                        {insight.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{insight.message}</p>
                    </div>
                    <Badge className={getSeverityColor(insight.severity)}>{insight.severity || 'low'}</Badge>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(insight.createdAt, true)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
