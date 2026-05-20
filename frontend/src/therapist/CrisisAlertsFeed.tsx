import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import React from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

import { TherapistCrisisAlert, useTherapistCrisisAlertsQuery } from './hooks/useTherapistQueries';

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function parseJsonToList(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([key, value]) => `${key}: ${String(value)}`);
    }
    return [String(parsed)];
  } catch {
    return [raw];
  }
}

function severityClasses(level: string) {
  switch (level.toUpperCase()) {
    case 'CRITICAL':
      return 'border-red-300 bg-red-50 text-red-700';
    case 'HIGH':
      return 'border-orange-300 bg-orange-50 text-orange-700';
    case 'MODERATE':
      return 'border-amber-300 bg-amber-50 text-amber-700';
    default:
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  }
}

export function CrisisAlertsFeed() {
  const { data: alerts = [], isLoading: loading, error, refetch } = useTherapistCrisisAlertsQuery() as {
    data: TherapistCrisisAlert[] | undefined;
    isLoading: boolean;
    error: unknown;
    refetch: () => Promise<unknown>;
  };
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" /> Crisis Alerts (Last 7 Days)
            </CardTitle>
            <CardDescription>Recent risk detections across your active clients.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && alerts.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Loading alerts...</div>
        ) : errorMessage ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No recent crisis alerts detected for your assigned clients.
          </div>
        ) : (
          alerts.map((alert) => {
            const indicators = parseJsonToList(alert.indicators);
            const actions = parseJsonToList(alert.actionTaken);

            return (
              <div key={alert.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{alert.user?.name || alert.user?.email || 'Client'}</p>
                    <p className="text-xs text-muted-foreground">Detected {formatDateTime(alert.detectedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={severityClasses(alert.crisisLevel)}>
                      <AlertTriangle className="mr-1 h-3 w-3" /> {alert.crisisLevel}
                    </Badge>
                    <Badge variant="outline">{Math.round(alert.confidence * 100)}% confidence</Badge>
                    {alert.resolved ? (
                      <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Resolved
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indicators</p>
                    <ul className="space-y-1 text-sm">
                      {indicators.map((indicator, index) => (
                        <li key={`${alert.id}-indicator-${index}`}>• {indicator}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action Taken</p>
                    <ul className="space-y-1 text-sm">
                      {actions.map((action, index) => (
                        <li key={`${alert.id}-action-${index}`}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {alert.followUpResponse ? (
                  <div className="rounded-md border bg-background p-3 text-sm">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-up</p>
                    <p>{alert.followUpResponse}</p>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
