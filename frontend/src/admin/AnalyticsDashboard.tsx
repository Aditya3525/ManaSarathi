import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  ClipboardList,
  BookOpen,
  Brain,
  Award,
  Calendar,
  RefreshCw,
  Download
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useNotificationStore } from '../stores/notificationStore';

import { AdminSectionCard } from './AdminSectionCard';
import { useAdminAnalytics } from './hooks/useAdminQueries';

const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6'
};

const PIE_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6'];

export const AnalyticsDashboard: React.FC = () => {
  const { push } = useNotificationStore();
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const analyticsQuery = useAdminAnalytics(timeframe);
  const analytics = analyticsQuery.data ?? null;
  const isLoading = analyticsQuery.isLoading;
  const isRefreshing = analyticsQuery.isFetching;

  useEffect(() => {
    if (analyticsQuery.error) {
      push({
        type: 'error',
        title: 'Analytics Error',
        description: analyticsQuery.error instanceof Error
          ? analyticsQuery.error.message
          : 'Failed to load analytics'
      });
    }
  }, [analyticsQuery.error, push]);

  const escapeCsvCell = (value: string | number | null | undefined) => {
    const cell = value === null || value === undefined ? '' : String(value);
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const buildCsv = () => {
    if (!analytics) {
      return '';
    }

    const rows: string[] = [];
    rows.push(['section', 'metric', 'value'].map(escapeCsvCell).join(','));

    rows.push(['meta', 'timeframe', analytics.timeframe.type].map(escapeCsvCell).join(','));
    rows.push(['meta', 'startDate', analytics.timeframe.startDate].map(escapeCsvCell).join(','));
    rows.push(['meta', 'endDate', analytics.timeframe.endDate].map(escapeCsvCell).join(','));

    rows.push(['overview', 'totalUsers', analytics.overview.totalUsers].map(escapeCsvCell).join(','));
    rows.push(['overview', 'activeUsers', analytics.overview.activeUsers].map(escapeCsvCell).join(','));
    rows.push(['overview', 'newUsers', analytics.overview.newUsers].map(escapeCsvCell).join(','));
    rows.push(['overview', 'premiumUsers', analytics.overview.premiumUsers].map(escapeCsvCell).join(','));
    rows.push(['overview', 'activeRate', analytics.overview.activeRate].map(escapeCsvCell).join(','));
    rows.push(['overview', 'premiumRate', analytics.overview.premiumRate].map(escapeCsvCell).join(','));

    rows.push(['assessments', 'totalAssessments', analytics.assessments.totalAssessments].map(escapeCsvCell).join(','));
    rows.push(['assessments', 'completedAssessments', analytics.assessments.completedAssessments].map(escapeCsvCell).join(','));
    rows.push(['assessments', 'completionRate', analytics.assessments.completionRate].map(escapeCsvCell).join(','));
    rows.push(['assessments', 'averagePerUser', analytics.assessments.averagePerUser].map(escapeCsvCell).join(','));

    analytics.assessments.byType.forEach((item) => {
      rows.push([
        'assessmentType',
        item.name || item.assessmentType,
        item.completions,
      ].map(escapeCsvCell).join(','));
    });

    rows.push(['content', 'totalContent', analytics.content.totalContent].map(escapeCsvCell).join(','));
    rows.push(['content', 'views', analytics.content.views].map(escapeCsvCell).join(','));
    analytics.content.popular.forEach((item) => {
      rows.push([
        'contentPopular',
        `${item.title} (${item.type}/${item.category})`,
        '',
      ].map(escapeCsvCell).join(','));
    });

    rows.push(['practices', 'totalPractices', analytics.practices.totalPractices].map(escapeCsvCell).join(','));
    rows.push(['practices', 'completions', analytics.practices.completions].map(escapeCsvCell).join(','));
    analytics.practices.popular.forEach((item) => {
      rows.push([
        'practicePopular',
        `${item.title} (${item.type}, ${item.duration}m)`,
        '',
      ].map(escapeCsvCell).join(','));
    });

    analytics.trends.userGrowth.forEach((point) => {
      rows.push(['trendUserGrowth', point.date, point.count].map(escapeCsvCell).join(','));
    });
    analytics.trends.engagement.forEach((point) => {
      rows.push(['trendEngagement', point.date, point.count].map(escapeCsvCell).join(','));
    });

    return rows.join('\n');
  };

  const handleExport = (format: 'json' | 'csv') => {
    if (!analytics) return;

    const dateStamp = new Date().toISOString().split('T')[0];
    const fileBase = `analytics-${analytics.timeframe.type}-${dateStamp}`;

    const blob =
      format === 'csv'
        ? new Blob([buildCsv()], { type: 'text/csv;charset=utf-8;' })
        : new Blob(
            [
              JSON.stringify(
                {
                  generated: new Date().toISOString(),
                  timeframe: analytics.timeframe,
                  ...analytics,
                },
                null,
                2
              ),
            ],
            { type: 'application/json' }
          );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'csv' ? `${fileBase}.csv` : `${fileBase}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    push({
      type: 'success',
      title: 'Exported',
      description: format === 'csv' ? 'Analytics data exported as CSV' : 'Analytics data exported as JSON'
    });
  };

  const headerActions = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={timeframe} onValueChange={(value) => setTimeframe(value as typeof timeframe)}>
        <SelectTrigger className="w-[180px]">
          <Calendar className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Select timeframe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => void analyticsQuery.refetch()} disabled={isRefreshing}>
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button variant="outline" onClick={() => handleExport('json')} disabled={!analytics}>
        <Download className="h-4 w-4 mr-2" />
        Export JSON
      </Button>
      <Button variant="outline" onClick={() => handleExport('csv')} disabled={!analytics}>
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  );

  if (isLoading && !analytics) {
    return (
      <AdminSectionCard
        icon={TrendingUp}
        title="Analytics Dashboard"
        description="Platform insights and performance metrics"
        actions={headerActions}
        contentClassName="space-y-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </AdminSectionCard>
    );
  }

  if (!analytics) return null;

  const statCards = [
    {
      title: 'Total Users',
      value: analytics.overview.totalUsers.toLocaleString(),
      change: `${analytics.overview.newUsers} new`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: analytics.overview.newUsers > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Active Users',
      value: analytics.overview.activeUsers.toLocaleString(),
      change: `${analytics.overview.activeRate}% of total`,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: parseFloat(analytics.overview.activeRate) > 50 ? 'up' : 'down'
    },
    {
      title: 'Assessments',
      value: analytics.assessments.completedAssessments.toLocaleString(),
      change: `${analytics.assessments.averagePerUser} per user`,
      icon: ClipboardList,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 'up'
    },
    {
      title: 'Premium Members',
      value: analytics.overview.premiumUsers.toLocaleString(),
      change: `${analytics.overview.premiumRate}% conversion`,
      icon: Award,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      trend: parseFloat(analytics.overview.premiumRate) > 10 ? 'up' : 'neutral'
    }
  ];

  return (
    <AdminSectionCard
      icon={TrendingUp}
      title="Analytics Dashboard"
      description="Platform insights and performance metrics"
      actions={headerActions}
      contentClassName="space-y-6"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
                    {stat.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="practices">Practices</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.trends.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke={CHART_COLORS.primary} 
                      strokeWidth={2}
                      name="New Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Engagement Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Daily assessment completions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.trends.engagement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill={CHART_COLORS.secondary} name="Completions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Assessment Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment Distribution</CardTitle>
                <CardDescription>Completions by assessment type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.assessments.byType.slice(0, 8)}
                      dataKey="completions"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analytics.assessments.byType.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Assessments */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Assessments</CardTitle>
                <CardDescription>Most completed assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.assessments.byType.slice(0, 5).map((assessment, index) => (
                    <div key={assessment.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="text-sm font-medium">{assessment.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {assessment.completions.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.content.totalContent}</div>
                <p className="text-xs text-muted-foreground">Published items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.content.views.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Content views</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Popular Content</CardTitle>
              <CardDescription>Most viewed content items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.content.popular.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.type} • {item.category}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Practices Tab */}
        <TabsContent value="practices" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Practices</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.practices.totalPractices}</div>
                <p className="text-xs text-muted-foreground">Published practices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.practices.completions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Practice sessions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Popular Practices</CardTitle>
              <CardDescription>Most completed practices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.practices.popular.map((practice, index) => (
                  <div key={practice.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <div className="text-sm font-medium">{practice.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {practice.type} • {practice.duration} min
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminSectionCard>
  );
};

export default AnalyticsDashboard;
