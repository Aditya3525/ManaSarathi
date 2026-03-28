import {
  Activity,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  RefreshCw,
  User,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { getApiBaseUrl } from '../config/apiConfig';
import { useNotificationStore } from '../stores/notificationStore';

import { adminFetch } from './adminApi';
import { AdminSectionCard } from './AdminSectionCard';

interface ActivityLogEntry {
  id: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface ActivityStats {
  actionCounts: Array<{ action: string; count: number }>;
  entityTypeCounts: Array<{ entityType: string; count: number }>;
  adminActivity: Array<{ adminEmail: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
}

const formatLabel = (value?: string) =>
  (value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\w/g, match => match.toUpperCase());

const getEntityIcon = (entityType?: string) => {
  const normalized = (entityType || '').toLowerCase();
  const iconClass = 'h-5 w-5 text-muted-foreground';

  if (normalized.includes('user')) {
    return <User className={iconClass} />;
  }

  if (normalized.includes('content') || normalized.includes('article')) {
    return <FileText className={iconClass} />;
  }

  if (normalized.includes('alert') || normalized.includes('error')) {
    return <AlertCircle className={iconClass} />;
  }

  return <Activity className={iconClass} />;
};

const getActionBadge = (action: string) => {
  const normalized = action.toLowerCase();
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
  let Icon = Activity;

  if (normalized.includes('create') || normalized.includes('add')) {
    variant = 'default';
    Icon = Activity;
  } else if (normalized.includes('delete') || normalized.includes('remove')) {
    variant = 'destructive';
    Icon = AlertCircle;
  } else if (normalized.includes('update') || normalized.includes('edit')) {
    variant = 'secondary';
    Icon = FileText;
  } else if (normalized.includes('login') || normalized.includes('auth')) {
    variant = 'outline';
    Icon = User;
  }

  return (
    <Badge variant={variant} className="flex items-center gap-1 capitalize">
      <Icon className="h-3 w-3" />
      {formatLabel(action)}
    </Badge>
  );
};

export const ActivityLog: React.FC = () => {
  const { push } = useNotificationStore();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');

  const [filterOptions, setFilterOptions] = useState({
    actions: [] as string[],
    entityTypes: [] as string[],
    admins: [] as string[],
  });

  const handleActionFilterChange = useCallback((value: string) => {
    setActionFilter(value);
    setPage(1);
  }, []);

  const handleEntityTypeFilterChange = useCallback((value: string) => {
    setEntityTypeFilter(value);
    setPage(1);
  }, []);

  const handleAdminFilterChange = useCallback((value: string) => {
    setAdminFilter(value);
    setPage(1);
  }, []);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) {
      return logs;
    }

    const term = searchTerm.toLowerCase();

    return logs.filter(log => {
      const detailsText = log.details ? JSON.stringify(log.details).toLowerCase() : '';

      return (
        log.adminEmail.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.entityType.toLowerCase().includes(term) ||
        (log.entityId && log.entityId.toLowerCase().includes(term)) ||
        (log.entityName && log.entityName.toLowerCase().includes(term)) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(term)) ||
        (log.userAgent && log.userAgent.toLowerCase().includes(term)) ||
        detailsText.includes(term)
      );
    });
  }, [logs, searchTerm]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await adminFetch(`${getApiBaseUrl()}/admin/activity-logs/filters`);
      const result = await response.json();

      if (result?.success) {
        setFilterOptions(result.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
      push({
        type: 'error',
        title: 'Filter options unavailable',
        description: 'Unable to load filters for the activity log.',
      });
    }
  }, [push]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (entityTypeFilter !== 'all') params.append('entityType', entityTypeFilter);
      if (adminFilter !== 'all') params.append('adminEmail', adminFilter);

      const response = await adminFetch(`${getApiBaseUrl()}/admin/activity-logs/stats?${params}`);
      const result = await response.json();

      if (result?.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  }, [actionFilter, adminFilter, entityTypeFilter]);

  const fetchLogs = useCallback(
    async ({
      page: targetPage,
      actionFilter: action,
      entityTypeFilter: entityType,
      adminFilter: admin,
    }: {
      page: number;
      actionFilter: string;
      entityTypeFilter: string;
      adminFilter: string;
    }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: targetPage.toString(),
          limit: '20',
        });

        if (action !== 'all') params.append('action', action);
        if (entityType !== 'all') params.append('entityType', entityType);
        if (admin !== 'all') params.append('adminEmail', admin);

        const response = await adminFetch(`${getApiBaseUrl()}/admin/activity-logs?${params}`);
        const result = await response.json();

        if (!result?.success) {
          throw new Error(result?.error || 'Failed to fetch activity logs');
        }

        const { logs: fetchedLogs, pagination } = result.data;

        setLogs(fetchedLogs);
        setTotal(pagination.total ?? fetchedLogs.length);
        setTotalPages(pagination.totalPages ?? 1);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        push({
          type: 'error',
          title: 'Unable to load logs',
          description: 'There was a problem fetching the activity log. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    },
    [push]
  );

  const handleExport = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams();

      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (entityTypeFilter !== 'all') params.append('entityType', entityTypeFilter);
      if (adminFilter !== 'all') params.append('adminEmail', adminFilter);

      const response = await adminFetch(`${getApiBaseUrl()}/admin/activity-logs/export?${params}`);

      if (!response.ok) {
        throw new Error('Export request failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      push({
        type: 'success',
        title: 'Export started',
        description: 'Your activity log export has been downloaded.',
      });
    } catch (error) {
      console.error('Error exporting activity logs:', error);
      push({
        type: 'error',
        title: 'Export failed',
        description: 'Unable to export the activity logs right now.',
      });
    } finally {
      setExporting(false);
    }
  }, [actionFilter, adminFilter, entityTypeFilter, push]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchLogs({
      page,
      actionFilter,
      entityTypeFilter,
      adminFilter,
    });
  }, [actionFilter, adminFilter, entityTypeFilter, fetchLogs, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <AdminSectionCard
      icon={Activity}
      title="Activity Log"
      description="Track all administrative actions and changes"
      actions={(
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              fetchLogs({
                page,
                actionFilter,
                entityTypeFilter,
                adminFilter,
              })
            }
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      )}
      contentClassName="space-y-6"
    >
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Actions</p>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
                <Activity className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Admins</p>
                  <p className="text-2xl font-bold">{stats.adminActivity.length}</p>
                </div>
                <User className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entity Types</p>
                  <p className="text-2xl font-bold">{stats.entityTypeCounts.length}</p>
                </div>
                <FileText className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">
                    {stats.dailyTrend[stats.dailyTrend.length - 1]?.count || 0}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                className="w-full"
              />
            </div>

            <Select value={actionFilter} onValueChange={handleActionFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {filterOptions.actions.map(action => (
                  <SelectItem key={action} value={action}>
                    {formatLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityTypeFilter} onValueChange={handleEntityTypeFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {filterOptions.entityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={adminFilter} onValueChange={handleAdminFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Admins" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Admins</SelectItem>
                {filterOptions.admins.map(admin => (
                  <SelectItem key={admin} value={admin}>
                    {admin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline ({total} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No activity logs found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="mt-1">{getEntityIcon(log.entityType)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {getActionBadge(log.action)}
                      <Badge variant="outline" className="text-xs">
                        {formatLabel(log.entityType)}
                      </Badge>
                      {log.entityName && (
                        <span className="truncate text-sm font-medium">
                          {log.entityName}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>
                        <User className="mr-1 inline h-3 w-3" />
                        {log.adminEmail}
                      </div>
                      <div>
                        <Calendar className="mr-1 inline h-3 w-3" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 rounded bg-muted p-2 text-xs font-mono">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminSectionCard>
  );
};

export default ActivityLog;
