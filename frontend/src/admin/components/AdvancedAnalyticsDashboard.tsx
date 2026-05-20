import { useQuery } from '@tanstack/react-query';
import { Activity, Brain, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { getApiBaseUrl } from '../../config/apiConfig';
import { adminFetch } from '../adminApi';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

type Timeframe = '7d' | '30d' | '90d' | 'all';

interface ComprehensiveAnalytics {
  aiPerformance: any;
  crisisDetection: any;
  systemHealth: any;
  userEngagement: any;
  wellnessImpact: any;
  timeframe: {
    type: string;
    startDate: string;
    endDate: string;
  };
}

export function AdvancedAnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['comprehensive-analytics', timeframe],
    queryFn: async () => {
      const res = await adminFetch(`${getApiBaseUrl()}/admin/analytics/comprehensive?timeframe=${timeframe}`);
      const responseData = await res.json() as { success: boolean; data: ComprehensiveAnalytics };
      return responseData.data;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Failed to load analytics. Please try again.</p>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive system performance and insights</p>
        </div>
        <Select value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
            <Brain className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.aiPerformance.providerUsage.reduce((sum: number, p: any) => sum + p.requests, 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Avg: {Math.round(analytics.aiPerformance.avgResponseTime[0]?.avgTime || 0)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Crisis Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.crisisDetection.totalEvents}</div>
            <p className="text-xs text-gray-600 mt-1">
              Resolution: {analytics.crisisDetection.resolutionRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Performance</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.systemHealth.api.avgResponseTime)}ms
            </div>
            <p className="text-xs text-gray-600 mt-1">Average response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai">AI Performance</TabsTrigger>
          <TabsTrigger value="crisis">Crisis Detection</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
          <TabsTrigger value="wellness">Wellness Impact</TabsTrigger>
        </TabsList>

        {/* AI Performance Tab */}
        <TabsContent value="ai" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Provider Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.aiPerformance.providerUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="provider" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="requests" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.aiPerformance.providerUsage}
                      dataKey="requests"
                      nameKey="provider"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {analytics.aiPerformance.providerUsage.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.aiPerformance.avgResponseTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="provider" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgTime" fill="#00C49F" name="Avg Response Time (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Tokens</p>
                    <p className="text-2xl font-bold">{analytics.aiPerformance.totalTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Prompt Tokens</p>
                    <p className="text-xl font-semibold">{analytics.aiPerformance.promptTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completion Tokens</p>
                    <p className="text-xl font-semibold">{analytics.aiPerformance.completionTokens.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Crisis Detection Tab */}
        <TabsContent value="crisis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Events by Crisis Level</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.crisisDetection.eventsByLevel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crisis Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold">{analytics.crisisDetection.totalEvents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Resolution Rate</p>
                    <p className="text-xl font-semibold">{analytics.crisisDetection.resolutionRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                    <p className="text-xl font-semibold">{analytics.crisisDetection.avgResponseTime}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Average</p>
                    <p className="text-xl font-semibold">{Math.round(analytics.systemHealth.api.avgResponseTime)}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Min</p>
                    <p className="text-lg">{Math.round(analytics.systemHealth.api.minResponseTime)}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Max</p>
                    <p className="text-lg">{Math.round(analytics.systemHealth.api.maxResponseTime)}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm text-gray-600">Avg Query Time</p>
                  <p className="text-2xl font-bold">{Math.round(analytics.systemHealth.database.avgQueryTime)}ms</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {analytics.systemHealth.resources.length} metrics tracked
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold">{analytics.userEngagement.activeUsers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold">{analytics.userEngagement.totalSessions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold">
                    {Math.round(analytics.userEngagement.avgSessionDuration / 60)}min
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wellness Impact Tab */}
        <TabsContent value="wellness" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Wellness Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Avg Score Change</p>
                    <p className="text-2xl font-bold text-green-600">
                      +{analytics.wellnessImpact.avgScoreChange?.toFixed(1) || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assessment Completion Rate</p>
                    <p className="text-xl font-semibold">
                      {analytics.wellnessImpact.assessmentCompletionRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User Retention (7 days)</p>
                    <p className="text-xl font-semibold">{analytics.wellnessImpact.retentionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Practice Adherence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {analytics.wellnessImpact.practiceAdherence}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Users with Improvement</p>
                    <p className="text-xl font-semibold">
                      {analytics.wellnessImpact.usersWithImprovement}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
