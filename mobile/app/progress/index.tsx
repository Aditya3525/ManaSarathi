import { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Flame, Calendar, Target, Award, TrendingUp, TrendingDown, Minus,
  ArrowLeft, Brain, Heart, Activity, CheckCircle, Star, BookOpen, Clock, Zap,
} from 'lucide-react-native';
import Svg, { Polyline, Circle as SvgCircle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { router } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { Separator } from '@/components/ui/Separator';
import { progressApi, moodApi, assessmentsApi, plansApi, dashboardApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';

type TabKey = 'overview' | 'trends' | 'goals' | 'achievements';

export default function ProgressScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m'>('30d');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: t('progress.overview', 'Overview') },
    { key: 'trends', label: t('progress.trends', 'Trends') },
    { key: 'goals', label: t('progress.goals', 'Goals') },
    { key: 'achievements', label: t('progress.achievements', 'Achievements') },
  ];

  // Shared data queries
  const { data: dashboard, isError: dashboardError, refetch: refetchDashboard, isRefetching } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return response.data as any;
    },
  });

  const { data: weeklyProgress, refetch: refetchWeekly } = useQuery({
    queryKey: queryKeys.dashboard.weeklyProgress(),
    queryFn: async () => {
      const response = await dashboardApi.getWeeklyProgress();
      return response.data as any;
    },
  });

  const { data: insights } = useQuery({
    queryKey: queryKeys.dashboard.insights(),
    queryFn: async () => {
      const response = await dashboardApi.getInsights();
      return response.data as any;
    },
  });

  const handleRefresh = () => {
    refetchDashboard();
    refetchWeekly();
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text variant="h2">{t('progress.title', 'Your Progress')}</Text>
        </View>

        {/* Tab Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full ${
                  activeTab === tab.key ? 'bg-primary-600' : 'bg-gray-100'
                }`}
              >
                <Text
                  variant="caption"
                  className={`font-medium ${activeTab === tab.key ? 'text-white' : 'text-gray-600'}`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
      >
        {dashboardError ? (
          <ErrorState compact onRetry={handleRefresh} />
        ) : (
        <>
        {activeTab === 'overview' && (
          <OverviewTab dashboard={dashboard} weeklyProgress={weeklyProgress} insights={insights} />
        )}
        {activeTab === 'trends' && (
          <TrendsTab timeRange={timeRange} setTimeRange={setTimeRange} insights={insights} />
        )}
        {activeTab === 'goals' && <GoalsTab />}
        {activeTab === 'achievements' && <AchievementsTab dashboard={dashboard} />}
        </>
        )}
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Overview Tab
// =============================================================================
function OverviewTab({ dashboard, weeklyProgress, insights }: {
  dashboard: any; weeklyProgress: any; insights: any;
}) {
  const { t } = useTranslation();

  return (
    <View className="px-6 py-4">
      {/* Stat Cards */}
      <View className="flex-row flex-wrap gap-3 mb-6">
        <StatCard
          icon={Flame}
          color="#f97316"
          bgColor="#fff7ed"
          value={dashboard?.streakDays || 0}
          label={t('progress.dayStreak', 'Day Streak')}
        />
        <StatCard
          icon={Calendar}
          color="#6366f1"
          bgColor="#eef2ff"
          value={weeklyProgress?.moodCheckins?.completed || 0}
          label={t('progress.weeklyCheckins', 'Weekly Check-ins')}
        />
        <StatCard
          icon={BookOpen}
          color="#10b981"
          bgColor="#d1fae5"
          value={dashboard?.completedPractices || 0}
          label={t('progress.modulesCompleted', 'Practices Done')}
        />
        <StatCard
          icon={Heart}
          color="#ec4899"
          bgColor="#fce7f3"
          value={dashboard?.moodEntries || 0}
          label={t('progress.moodLogs', 'Mood Entries')}
        />
      </View>

      {/* Wellness Score */}
      {insights?.wellnessScore != null && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text variant="h3">{t('progress.wellnessScore', 'Wellness Score')}</Text>
              <Text variant="h2" className="text-primary-600">{insights.wellnessScore}%</Text>
            </View>
            <View className="bg-gray-200 rounded-full h-3">
              <View
                className="bg-primary-500 rounded-full h-3"
                style={{ width: `${Math.min(insights.wellnessScore, 100)}%` }}
              />
            </View>
            {insights.overallTrend && (
              <View className="flex-row items-center mt-2">
                {insights.overallTrend === 'improving' ? (
                  <TrendingUp size={16} color="#10b981" />
                ) : insights.overallTrend === 'declining' ? (
                  <TrendingDown size={16} color="#ef4444" />
                ) : (
                  <Minus size={16} color="#6b7280" />
                )}
                <Text variant="caption" className={`ml-1 ${
                  insights.overallTrend === 'improving' ? 'text-success-600' :
                  insights.overallTrend === 'declining' ? 'text-danger-600' : 'text-gray-600'
                }`}>
                  {String(t(`progress.trend.${insights.overallTrend}`, insights.overallTrend))}
                </Text>
              </View>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Progress */}
      {weeklyProgress && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('progress.thisWeek', 'This Week')}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-4 py-2">
              {weeklyProgress.practices && (
                <ProgressBar
                  label={t('progress.practices', 'Practices')}
                  completed={weeklyProgress.practices.completed}
                  goal={weeklyProgress.practices.goal}
                  color="#10b981"
                />
              )}
              {weeklyProgress.moodCheckins && (
                <ProgressBar
                  label={t('progress.moodCheckins', 'Mood Check-ins')}
                  completed={weeklyProgress.moodCheckins.completed}
                  goal={weeklyProgress.moodCheckins.goal}
                  color="#ec4899"
                />
              )}
              {weeklyProgress.assessmentsCompleted != null && (
                <View className="flex-row items-center justify-between">
                  <Text variant="body" className="text-gray-700">
                    {t('progress.assessments', 'Assessments')}
                  </Text>
                  <Text variant="label" className="text-primary-600">
                    {weeklyProgress.assessmentsCompleted}
                  </Text>
                </View>
              )}
            </View>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      {insights?.aiSummary && (
        <Card className="mb-4 bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <View className="flex-row items-center mb-2">
              <Activity size={18} color="#7c3aed" />
              <Text variant="label" className="ml-2 text-purple-800">
                {t('progress.aiSummary', 'AI Summary')}
              </Text>
            </View>
            <Text variant="body" className="text-purple-900 leading-relaxed">
              {insights.aiSummary}
            </Text>
          </CardContent>
        </Card>
      )}

      {/* Activity Calendar Placeholder */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('progress.recentActivity', 'Recent Activity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityList dashboard={dashboard} />
        </CardContent>
      </Card>
    </View>
  );
}

function StatCard({ icon: Icon, color, bgColor, value, label }: {
  icon: any; color: string; bgColor: string; value: number; label: string;
}) {
  return (
    <Card className="flex-1 min-w-[45%]">
      <CardContent className="p-4 items-center">
        <View className="rounded-full p-2 mb-2" style={{ backgroundColor: bgColor }}>
          <Icon size={20} color={color} />
        </View>
        <Text variant="h2" style={{ color }}>{value}</Text>
        <Text variant="caption" className="text-gray-600 text-center">{label}</Text>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ label, completed, goal, color }: {
  label: string; completed: number; goal: number; color: string;
}) {
  const pct = Math.min((completed / Math.max(goal, 1)) * 100, 100);
  return (
    <View>
      <View className="flex-row items-center justify-between mb-1">
        <Text variant="body" className="text-gray-700">{label}</Text>
        <Text variant="caption" className="text-gray-500">{completed}/{goal}</Text>
      </View>
      <View className="bg-gray-200 rounded-full h-2">
        <View className="rounded-full h-2" style={{ width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function RecentActivityList({ dashboard }: { dashboard: any }) {
  const { t } = useTranslation();

  const activities = useMemo(() => {
    const items: { icon: any; color: string; label: string; date: string }[] = [];
    if (dashboard?.recentMood) {
      items.push({
        icon: Heart,
        color: '#ec4899',
        label: `${t('progress.loggedMood', 'Logged mood')}: ${dashboard.recentMood.emoji} ${dashboard.recentMood.label}`,
        date: dashboard.recentMood.date,
      });
    }
    if (dashboard?.assessmentCount > 0) {
      items.push({
        icon: Brain,
        color: '#6366f1',
        label: t('progress.completedAssessment', 'Completed an assessment'),
        date: 'Recently',
      });
    }
    if (dashboard?.completedPractices > 0) {
      items.push({
        icon: BookOpen,
        color: '#10b981',
        label: t('progress.completedPractice', 'Completed a practice'),
        date: 'Recently',
      });
    }
    return items;
  }, [dashboard, t]);

  if (activities.length === 0) {
    return (
      <View className="items-center py-6">
        <Clock size={32} color="#d1d5db" />
        <Text variant="body" className="text-gray-500 mt-2">
          {t('progress.noActivity', 'No recent activity yet')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3 py-2">
      {activities.map((item, index) => {
        const Icon = item.icon;
        return (
          <View key={index} className="flex-row items-center">
            <View className="rounded-full p-2 mr-3" style={{ backgroundColor: `${item.color}15` }}>
              <Icon size={18} color={item.color} />
            </View>
            <View className="flex-1">
              <Text variant="body" className="text-gray-800">{item.label}</Text>
              <Text variant="caption" className="text-gray-500">{item.date}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// =============================================================================
// Assessment Trends Chart (SVG)
// =============================================================================
const CHART_WIDTH = Dimensions.get('window').width - 80;
const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 16, right: 16, bottom: 28, left: 36 };

function AssessmentTrendsChart({ data, t }: { data: any[]; t: ReturnType<typeof useTranslation>['t'] }) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      return new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime();
    }).slice(-12); // Show last 12 assessments max

    if (sorted.length === 0) return null;

    const scores = sorted.map(d => Number(d.score) || 0);
    const maxScore = Math.max(...scores, 10);
    const minScore = Math.min(...scores, 0);
    const range = maxScore - minScore || 1;

    const plotW = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const plotH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

    const points = sorted.map((item, i) => {
      const x = CHART_PADDING.left + (sorted.length === 1 ? plotW / 2 : (i / (sorted.length - 1)) * plotW);
      const y = CHART_PADDING.top + plotH - ((Number(item.score) - minScore) / range) * plotH;
      return { x, y, score: Number(item.score), date: new Date(item.completedAt || item.createdAt), severity: item.severity, type: item.assessmentType || item.type };
    });

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

    // Y-axis labels
    const yLabels = [minScore, Math.round((minScore + maxScore) / 2), maxScore];

    return { points, polylinePoints, yLabels, minScore, maxScore, plotH, plotW };
  }, [data]);

  if (!chartData) return null;

  const severityColor = (sev: string) => {
    if (sev === 'minimal' || sev === 'none') return '#10b981';
    if (sev === 'mild') return '#f59e0b';
    if (sev === 'moderate') return '#f97316';
    return '#ef4444';
  };

  return (
    <View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Grid lines */}
        {chartData.yLabels.map((val, i) => {
          const y = CHART_PADDING.top + chartData.plotH - ((val - chartData.minScore) / (chartData.maxScore - chartData.minScore || 1)) * chartData.plotH;
          return (
            <Line
              key={`grid-${i}`}
              x1={CHART_PADDING.left}
              y1={y}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}
        {/* Y-axis labels */}
        {chartData.yLabels.map((val, i) => {
          const y = CHART_PADDING.top + chartData.plotH - ((val - chartData.minScore) / (chartData.maxScore - chartData.minScore || 1)) * chartData.plotH;
          return (
            <SvgText key={`label-${i}`} x={4} y={y + 4} fontSize={10} fill="#9ca3af">{val}</SvgText>
          );
        })}
        {/* Trend line */}
        <Polyline
          points={chartData.polylinePoints}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Data points */}
        {chartData.points.map((p, i) => (
          <SvgCircle key={i} cx={p.x} cy={p.y} r={5} fill={severityColor(p.severity)} stroke="#fff" strokeWidth={2} />
        ))}
        {/* X-axis date labels (first and last) */}
        {chartData.points.length > 0 && (
          <>
            <SvgText x={chartData.points[0].x} y={CHART_HEIGHT - 4} fontSize={9} fill="#9ca3af" textAnchor="start">
              {chartData.points[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </SvgText>
            {chartData.points.length > 1 && (
              <SvgText x={chartData.points[chartData.points.length - 1].x} y={CHART_HEIGHT - 4} fontSize={9} fill="#9ca3af" textAnchor="end">
                {chartData.points[chartData.points.length - 1].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </SvgText>
            )}
          </>
        )}
      </Svg>
      {/* Legend */}
      <View className="flex-row flex-wrap gap-3 mt-3 justify-center">
        {[
          { color: '#10b981', label: t('progress.minimal', 'Minimal') },
          { color: '#f59e0b', label: t('progress.mild', 'Mild') },
          { color: '#f97316', label: t('progress.moderate', 'Moderate') },
          { color: '#ef4444', label: t('progress.severe', 'Severe') },
        ].map(item => (
          <View key={item.label} className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: item.color }} />
            <Text variant="caption" className="text-gray-500">{item.label}</Text>
          </View>
        ))}
      </View>
      {/* Assessment details below chart */}
      <View className="gap-2 mt-4 pt-3 border-t border-gray-100">
        {chartData.points.slice(-5).reverse().map((p, i) => (
          <View key={i} className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text variant="caption" className="font-medium text-gray-700">{p.type}</Text>
              <Text variant="caption" className="text-gray-400">{p.date.toLocaleDateString()}</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: severityColor(p.severity) }} />
              <Text variant="label" className="text-primary-600">{p.score}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// =============================================================================
// Trends Tab
// =============================================================================
function TrendsTab({ timeRange, setTimeRange, insights }: {
  timeRange: '7d' | '30d' | '6m';
  setTimeRange: (r: '7d' | '30d' | '6m') => void;
  insights: any;
}) {
  const { t } = useTranslation();

  const timeRangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 180;
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - timeRangeDays);
    return d;
  }, [timeRangeDays]);

  const { data: moodHistory, isLoading: moodLoading } = useQuery({
    queryKey: [...queryKeys.mood.history(), timeRange],
    queryFn: async () => {
      const response = await moodApi.getMoodHistory();
      return response.data?.moodEntries || [];
    },
  });

  const { data: progressHistory, isLoading: progressLoading } = useQuery({
    queryKey: [...queryKeys.progress.history(), timeRange],
    queryFn: async () => {
      const response = await progressApi.getProgressHistory();
      return response.data || [];
    },
  });

  const { data: assessmentHistory } = useQuery({
    queryKey: [...queryKeys.assessments.history(), timeRange],
    queryFn: async () => {
      const response = await assessmentsApi.getAssessmentHistory();
      return response.data as any;
    },
  });

  // Filter mood data by selected time range
  const filteredMoodHistory = useMemo(() => {
    if (!moodHistory || !Array.isArray(moodHistory)) return [];
    return (moodHistory as any[]).filter((entry: any) => {
      const entryDate = new Date(entry.createdAt || entry.date || entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }, [moodHistory, cutoffDate]);

  // Compute mood distribution from filtered data
  const moodDistribution = useMemo(() => {
    if (filteredMoodHistory.length === 0) return [];
    const counts: Record<string, number> = {};
    filteredMoodHistory.forEach((entry: any) => {
      const label = entry.mood || entry.label || 'Unknown';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([mood, count]) => ({ mood, count }));
  }, [moodHistory]);

  const ranges = [
    { value: '7d' as const, label: '7D' },
    { value: '30d' as const, label: '30D' },
    { value: '6m' as const, label: '6M' },
  ];

  return (
    <View className="px-6 py-4">
      {/* Time Range */}
      <View className="flex-row gap-2 mb-4">
        {ranges.map((r) => (
          <TouchableOpacity
            key={r.value}
            onPress={() => setTimeRange(r.value)}
            className={`px-4 py-2 rounded-full ${
              timeRange === r.value ? 'bg-primary-600' : 'bg-gray-100'
            }`}
          >
            <Text
              variant="caption"
              className={`font-medium ${timeRange === r.value ? 'text-white' : 'text-gray-600'}`}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mood Distribution */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('progress.moodDistribution', 'Mood Distribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          {moodLoading ? (
            <LoadingSpinner size="small" />
          ) : moodDistribution.length > 0 ? (
            <View className="gap-3 py-2">
              {moodDistribution.map(({ mood, count }) => {
                const maxCount = moodDistribution[0].count;
                const pct = (count / maxCount) * 100;
                return (
                  <View key={mood}>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text variant="body" className="text-gray-700 capitalize">{mood}</Text>
                      <Text variant="caption" className="text-gray-500">{count}</Text>
                    </View>
                    <View className="bg-gray-200 rounded-full h-2">
                      <View className="bg-pink-400 rounded-full h-2" style={{ width: `${pct}%` }} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="items-center py-6">
              <Heart size={32} color="#d1d5db" />
              <Text variant="body" className="text-gray-500 mt-2">
                {t('progress.noMoodData', 'No mood data yet')}
              </Text>
            </View>
          )}
        </CardContent>
      </Card>

      {/* Assessment Trends Chart */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('progress.assessmentTrends', 'Assessment Trends')}</CardTitle>
        </CardHeader>
        <CardContent>
          {assessmentHistory?.history && (assessmentHistory.history as any[]).length > 0 ? (() => {
            const filtered = (assessmentHistory.history as any[]).filter((item: any) => {
              const d = new Date(item.completedAt || item.createdAt);
              return d >= cutoffDate;
            });
            return filtered.length > 0 ? (
              <AssessmentTrendsChart data={filtered} t={t} />
            ) : (
            <View className="items-center py-6">
              <Brain size={32} color="#d1d5db" />
              <Text variant="body" className="text-gray-500 mt-2">
                {t('progress.noAssessmentsInRange', 'No assessments in this time range')}
              </Text>
            </View>
            );
          })() : (
            <View className="items-center py-6">
              <Brain size={32} color="#d1d5db" />
              <Text variant="body" className="text-gray-500 mt-2">
                {t('progress.noAssessments', 'No assessments taken yet')}
              </Text>
            </View>
          )}
        </CardContent>
      </Card>

      {/* Percentile Comparison */}
      {assessmentHistory?.history && (assessmentHistory.history as any[]).length >= 2 && (() => {
        const filtered = (assessmentHistory.history as any[]).filter((item: any) => {
          const d = new Date(item.completedAt || item.createdAt);
          return d >= cutoffDate;
        });
        if (filtered.length < 2) return null;
        const scores = filtered.map((item: any) => Number(item.score) || 0);
        const latestScore = scores[scores.length - 1];
        const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        // Simplified percentile: where latest falls relative to personal range
        const range = maxScore - minScore || 1;
        const percentile = Math.round(((latestScore - minScore) / range) * 100);
        const improvement = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;

        return (
          <Card className="mb-4 bg-indigo-50 border-indigo-200">
            <CardHeader>
              <CardTitle>{t('progress.percentileComparison', 'Your Progress Snapshot')}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-4 py-2">
                {/* Percentile Bar */}
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text variant="body" className="text-indigo-800">{t('progress.latestScore', 'Latest Score')}</Text>
                    <Text variant="h3" className="text-indigo-600">{latestScore}</Text>
                  </View>
                  <View className="bg-indigo-200 rounded-full h-3 relative">
                    <View className="bg-indigo-500 rounded-full h-3" style={{ width: `${Math.min(percentile, 100)}%` }} />
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text variant="caption" className="text-indigo-400">{t('progress.low', 'Low')} ({minScore})</Text>
                    <Text variant="caption" className="text-indigo-400">{t('progress.high', 'High')} ({maxScore})</Text>
                  </View>
                </View>

                {/* Stats */}
                <View className="flex-row justify-around pt-2 border-t border-indigo-200">
                  <View className="items-center">
                    <Text variant="h3" className="text-indigo-600">{avgScore}</Text>
                    <Text variant="caption" className="text-indigo-500">{t('progress.avgScore', 'Average')}</Text>
                  </View>
                  <View className="items-center">
                    <Text variant="h3" className="text-indigo-600">{percentile}%</Text>
                    <Text variant="caption" className="text-indigo-500">{t('progress.percentile', 'Percentile')}</Text>
                  </View>
                  <View className="items-center">
                    <View className="flex-row items-center">
                      {improvement > 0 ? (
                        <TrendingUp size={14} color="#10b981" />
                      ) : improvement < 0 ? (
                        <TrendingDown size={14} color="#ef4444" />
                      ) : (
                        <Minus size={14} color="#6b7280" />
                      )}
                      <Text variant="h3" className={`ml-1 ${improvement > 0 ? 'text-green-600' : improvement < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {improvement > 0 ? '+' : ''}{improvement}
                      </Text>
                    </View>
                    <Text variant="caption" className="text-indigo-500">{t('progress.change', 'Change')}</Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        );
      })()}

      {/* Chat Insights */}
      {insights?.chatInsights && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('progress.conversationInsights', 'Conversation Insights')}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3 py-2">
              <View className="flex-row items-center justify-between">
                <Text variant="body" className="text-gray-700">
                  {t('progress.totalConversations', 'Total Conversations')}
                </Text>
                <Text variant="label" className="text-primary-600">
                  {insights.chatInsights.conversationCount || 0}
                </Text>
              </View>
              {insights.chatInsights.commonTopics && insights.chatInsights.commonTopics.length > 0 && (
                <View>
                  <Text variant="caption" className="text-gray-500 mb-2">
                    {t('progress.commonTopics', 'Common Topics')}
                  </Text>
                  <View className="flex-row flex-wrap gap-1">
                    {insights.chatInsights.commonTopics.slice(0, 6).map((topic: string, i: number) => (
                      <View key={i} className="bg-purple-100 px-2 py-1 rounded-full">
                        <Text variant="caption" className="text-purple-700">{topic}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </CardContent>
        </Card>
      )}
    </View>
  );
}

// =============================================================================
// Goals Tab
// =============================================================================
function GoalsTab() {
  const { t } = useTranslation();

  const { data: plan, isLoading } = useQuery({
    queryKey: queryKeys.plans.personalized(),
    queryFn: async () => {
      const response = await plansApi.getPersonalizedPlan();
      return response.data || [];
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <View className="px-6 py-4">
      <Text variant="h3" className="mb-4">{t('progress.personalizedPlan', 'Your Plan')}</Text>

      {plan && Array.isArray(plan) && plan.length > 0 ? (
        <View className="gap-3 mb-8">
          {(plan as any[]).map((module: any, index: number) => (
            <Card key={module.id || index}>
              <CardContent className="p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text variant="label" className="flex-1">{module.title || module.name}</Text>
                  {module.completed ? (
                    <CheckCircle size={20} color="#10b981" />
                  ) : (
                    <Text variant="caption" className="text-gray-500">
                      {module.progress || 0}%
                    </Text>
                  )}
                </View>
                {module.description && (
                  <Text variant="caption" className="text-gray-600 mb-2">{module.description}</Text>
                )}
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className={`rounded-full h-2 ${module.completed ? 'bg-success-500' : 'bg-primary-500'}`}
                    style={{ width: `${module.completed ? 100 : module.progress || 0}%` }}
                  />
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      ) : (
        <View className="items-center py-12">
          <Target size={48} color="#d1d5db" />
          <Text variant="body" className="text-gray-500 mt-4 text-center">
            {t('progress.noPlan', 'Complete an assessment to get your personalized plan')}
          </Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Achievements Tab
// =============================================================================
function AchievementsTab({ dashboard }: { dashboard: any }) {
  const { t } = useTranslation();

  const achievements = useMemo(() => [
    {
      id: 'first_steps',
      icon: Star,
      color: '#f59e0b',
      title: t('achievements.firstSteps', 'First Steps'),
      description: t('achievements.firstStepsDesc', 'Complete your first assessment'),
      earned: (dashboard?.assessmentCount || 0) >= 1,
      progress: Math.min(dashboard?.assessmentCount || 0, 1),
      total: 1,
    },
    {
      id: 'consistency',
      icon: Flame,
      color: '#f97316',
      title: t('achievements.consistency', 'Consistency Champion'),
      description: t('achievements.consistencyDesc', 'Maintain a 7-day streak'),
      earned: (dashboard?.streakDays || 0) >= 7,
      progress: Math.min(dashboard?.streakDays || 0, 7),
      total: 7,
    },
    {
      id: 'practice_pioneer',
      icon: BookOpen,
      color: '#10b981',
      title: t('achievements.practicePioneer', 'Practice Pioneer'),
      description: t('achievements.practicePioneerDesc', 'Complete 10 practices'),
      earned: (dashboard?.completedPractices || 0) >= 10,
      progress: Math.min(dashboard?.completedPractices || 0, 10),
      total: 10,
    },
    {
      id: 'mood_tracker',
      icon: Heart,
      color: '#ec4899',
      title: t('achievements.moodTracker', 'Mood Tracker'),
      description: t('achievements.moodTrackerDesc', 'Log 30 mood entries'),
      earned: (dashboard?.moodEntries || 0) >= 30,
      progress: Math.min(dashboard?.moodEntries || 0, 30),
      total: 30,
    },
    {
      id: 'balanced_growth',
      icon: Activity,
      color: '#6366f1',
      title: t('achievements.balancedGrowth', 'Balanced Growth'),
      description: t('achievements.balancedGrowthDesc', 'Use all app features at least once'),
      earned: (dashboard?.assessmentCount || 0) > 0 && (dashboard?.moodEntries || 0) > 0 && (dashboard?.completedPractices || 0) > 0,
      progress:
        ((dashboard?.assessmentCount || 0) > 0 ? 1 : 0) +
        ((dashboard?.moodEntries || 0) > 0 ? 1 : 0) +
        ((dashboard?.completedPractices || 0) > 0 ? 1 : 0),
      total: 3,
    },
  ], [dashboard, t]);

  return (
    <View className="px-6 py-4">
      <View className="gap-3 mb-8">
        {achievements.map((ach) => {
          const Icon = ach.icon;
          const pct = (ach.progress / ach.total) * 100;
          return (
            <Card key={ach.id} className={ach.earned ? 'border-yellow-300' : ''}>
              <CardContent className="p-4">
                <View className="flex-row items-center mb-3">
                  <View
                    className="rounded-full p-3 mr-3"
                    style={{ backgroundColor: ach.earned ? `${ach.color}20` : '#f3f4f6' }}
                  >
                    <Icon size={24} color={ach.earned ? ach.color : '#9ca3af'} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text variant="label">{ach.title}</Text>
                      {ach.earned && (
                        <Text variant="caption" className="ml-2">🏆</Text>
                      )}
                    </View>
                    <Text variant="caption" className="text-gray-600">{ach.description}</Text>
                  </View>
                </View>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="rounded-full h-2"
                    style={{ width: `${pct}%`, backgroundColor: ach.earned ? ach.color : '#9ca3af' }}
                  />
                </View>
                <Text variant="caption" className="text-gray-500 mt-1 text-right">
                  {ach.progress}/{ach.total}
                </Text>
              </CardContent>
            </Card>
          );
        })}
      </View>
    </View>
  );
}
