import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Brain, Activity, TrendingUp, TrendingDown, Calendar, MessageCircle, BookOpen, Heart, Flame, Sparkles, Target, RefreshCw, Play, Clock, Shield, BarChart3, Gamepad2, Award, Star, Minus } from 'lucide-react-native';
import Svg, { Polyline, Path, Circle as SvgCircle, Line } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuthStore } from '@/stores/authStore';
import { dashboardApi, moodApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';

interface DashboardSummary {
  assessmentCount?: number;
  moodEntries?: number;
  completedPractices?: number;
  streakDays?: number;
  recentMood?: {
    emoji: string;
    label: string;
    date: string;
    note?: string;
  } | null;
  recommendedPractice?: {
    id: string;
    title: string;
    description: string;
    duration?: number;
    type?: string;
    reason?: string;
  } | null;
}

interface WeeklyProgress {
  practices?: { completed: number; goal: number };
  moodCheckins?: { completed: number; goal: number };
  assessmentsCompleted?: number;
  streak?: { days: number; message?: string };
}

interface InsightsData {
  aiSummary?: string;
  overallTrend?: 'improving' | 'declining' | 'stable';
  wellnessScore?: number;
  wellnessScoreHistory?: { date: string; score: number }[];
  assessmentInsights?: { total: number; averageScore: number; trend: string };
  chatInsights?: { conversationCount: number; commonTopics: string[] };
}

// ── Streak Milestones ──────────────────────────────────────────────────────────
const MILESTONES = [
  { days: 3, label: 'Getting Started', icon: '🌱', color: '#16a34a' },
  { days: 7, label: 'One Week Strong', icon: '⭐', color: '#2563eb' },
  { days: 14, label: 'Two Weeks!', icon: '🎯', color: '#7c3aed' },
  { days: 30, label: 'Monthly Warrior', icon: '🏆', color: '#ca8a04' },
  { days: 60, label: 'Consistency Champion', icon: '👑', color: '#ea580c' },
  { days: 90, label: '90-Day Legend', icon: '💎', color: '#db2777' },
  { days: 180, label: 'Half-Year Hero', icon: '🌟', color: '#4f46e5' },
  { days: 365, label: 'Year of Growth', icon: '🎊', color: '#dc2626' },
];

function getStreakMilestoneInfo(streakDays: number) {
  const current = MILESTONES.reduce<typeof MILESTONES[0] | null>((prev, curr) => {
    return streakDays >= curr.days ? curr : prev;
  }, null);
  const next = MILESTONES.find(m => m.days > streakDays) ?? MILESTONES[MILESTONES.length - 1];
  const prevDays = current?.days ?? 0;
  const range = next.days - prevDays;
  const progress = Math.min(streakDays - prevDays, range);
  const pct = range > 0 ? Math.round((progress / range) * 100) : 100;
  const daysToGo = Math.max(next.days - streakDays, 0);
  const upcoming = MILESTONES.filter(m => m.days > streakDays).slice(0, 4);
  return { current, next, pct, daysToGo, upcoming };
}

// ── Wellness Trend Chart Component (SVG) ────────────────────────────────────
interface WellnessDataPoint { date: string; score: number }

function WellnessTrendChart({ data, t }: { data: WellnessDataPoint[]; t: ReturnType<typeof useTranslation>['t'] }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return data
      .filter(d => { const dt = new Date(d.date); return dt >= start && dt <= end; })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { avg: 0, min: 0, max: 0, trend: 0, trendPct: 0 };
    const scores = chartData.map(d => d.score);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const mid = Math.floor(scores.length / 2);
    const firstAvg = scores.slice(0, mid).reduce((s, v) => s + v, 0) / Math.max(mid, 1);
    const secondAvg = scores.slice(mid).reduce((s, v) => s + v, 0) / Math.max(scores.length - mid, 1);
    const trend = secondAvg - firstAvg;
    const trendPct = firstAvg > 0 ? Math.round((trend / firstAvg) * 100) : 0;
    return { avg: Math.round(avg), min: Math.round(min), max: Math.round(max), trend: Math.round(trend), trendPct };
  }, [chartData]);

  const { points, areaPath } = useMemo(() => {
    if (chartData.length === 0) return { points: '', areaPath: '' };
    const W = 300, H = 120, P = 10;
    const xStep = (W - P * 2) / Math.max(chartData.length - 1, 1);
    const pts = chartData.map((d, i) => {
      const x = P + i * xStep;
      const y = H - P - (d.score / 100) * (H - P * 2);
      return { x, y };
    });
    const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
    let area = `M ${P} ${H - P}`;
    pts.forEach(p => { area += ` L ${p.x} ${p.y}`; });
    area += ` L ${pts[pts.length - 1].x} ${H - P} Z`;
    return { points: pointsStr, areaPath: area };
  }, [chartData]);

  if (chartData.length < 2) {
    return (
      <Card>
        <CardContent className="p-4 items-center py-8">
          <BarChart3 size={40} color="#d1d5db" />
          <Text variant="body" className="text-gray-500 mt-3 text-center">
            {t('dashboard.noTrendData', 'Complete more assessments to see your wellness trend')}
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TrendingUp size={18} color="#8b5cf6" />
            <Text variant="h3" className="ml-2">{t('dashboard.wellnessTrend', 'Wellness Trend')}</Text>
          </View>
          {stats.trend !== 0 && (
            <View className={`flex-row items-center px-2 py-1 rounded-full ${stats.trend > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {stats.trend > 0 ? <TrendingUp size={14} color="#16a34a" /> : <TrendingDown size={14} color="#dc2626" />}
              <Text variant="caption" className={`ml-1 ${stats.trend > 0 ? 'text-green-700' : 'text-red-700'}`}>
                {stats.trendPct > 0 ? '+' : ''}{stats.trendPct}%
              </Text>
            </View>
          )}
        </View>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* SVG Chart */}
        <View className="mb-3" style={{ height: 120 }}>
          <Svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none">
            <Line x1="0" y1="30" x2="300" y2="30" stroke="#e5e7eb" strokeWidth="0.5" />
            <Line x1="0" y1="60" x2="300" y2="60" stroke="#e5e7eb" strokeWidth="0.5" />
            <Line x1="0" y1="90" x2="300" y2="90" stroke="#e5e7eb" strokeWidth="0.5" />
            <Path d={areaPath} fill="#8b5cf6" opacity={0.1} />
            <Polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="2" />
            {chartData.map((d, i) => {
              const W = 300, H = 120, P = 10;
              const xStep = (W - P * 2) / Math.max(chartData.length - 1, 1);
              const x = P + i * xStep;
              const y = H - P - (d.score / 100) * (H - P * 2);
              return <SvgCircle key={i} cx={x} cy={y} r={3} fill="#8b5cf6" />;
            })}
          </Svg>
        </View>
        {/* Stats Row */}
        <View className="flex-row border-t border-gray-200 pt-3">
          <View className="flex-1 items-center">
            <Text variant="h3" className="text-primary-600">{stats.avg}</Text>
            <Text variant="caption" className="text-gray-500">{t('dashboard.average', 'Average')}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text variant="h3">{stats.min}</Text>
            <Text variant="caption" className="text-gray-500">{t('dashboard.lowest', 'Lowest')}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text variant="h3">{stats.max}</Text>
            <Text variant="caption" className="text-gray-500">{t('dashboard.highest', 'Highest')}</Text>
          </View>
        </View>
        {/* Trend Message */}
        {stats.trend !== 0 && (
          <Text variant="caption" className={`text-center mt-2 ${stats.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.trend > 0 ? '↑' : '↓'} {Math.abs(stats.trend)} {t('dashboard.pointsChange', 'points')} {stats.trend > 0 ? t('dashboard.improvement', 'improvement') : t('dashboard.decline', 'decline')}
          </Text>
        )}
      </CardContent>
    </Card>
  );
}

// ── Emotional Pattern Widget ────────────────────────────────────────────────
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_LABELS = ['Morning', 'Afternoon', 'Evening', 'Night'];

function EmotionalPatternWidget({ moodHistory, t }: { moodHistory: any[]; t: ReturnType<typeof useTranslation>['t'] }) {
  const patterns = useMemo(() => {
    if (!moodHistory || moodHistory.length < 5) return null;

    // Day-of-week pattern (avg mood per day)
    const dayBuckets: Record<number, number[]> = {};
    // Time-of-day pattern
    const timeBuckets: Record<number, number[]> = {};
    // Mood frequency
    const moodCounts: Record<number, number> = {};

    moodHistory.forEach((entry: any) => {
      const d = new Date(entry.createdAt || entry.date || entry.timestamp);
      const day = d.getDay(); // 0-6
      const hour = d.getHours();
      const mood = Number(entry.mood) || 3;

      // Day bucket
      if (!dayBuckets[day]) dayBuckets[day] = [];
      dayBuckets[day].push(mood);

      // Time bucket: 0=Morning(5-11), 1=Afternoon(12-16), 2=Evening(17-20), 3=Night(21-4)
      let timeBucket = 3; // Night
      if (hour >= 5 && hour < 12) timeBucket = 0;
      else if (hour >= 12 && hour < 17) timeBucket = 1;
      else if (hour >= 17 && hour < 21) timeBucket = 2;

      if (!timeBuckets[timeBucket]) timeBuckets[timeBucket] = [];
      timeBuckets[timeBucket].push(mood);

      // Mood frequency
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    // Average per day
    const dayAvg = Array.from({ length: 7 }, (_, i) => {
      const entries = dayBuckets[i] || [];
      return entries.length > 0 ? Math.round((entries.reduce((a, b) => a + b, 0) / entries.length) * 10) / 10 : null;
    });

    // Average per time
    const timeAvg = Array.from({ length: 4 }, (_, i) => {
      const entries = timeBuckets[i] || [];
      return entries.length > 0 ? Math.round((entries.reduce((a, b) => a + b, 0) / entries.length) * 10) / 10 : null;
    });

    // Find best and worst
    const validDays = dayAvg.map((v, i) => ({ day: i, avg: v })).filter(d => d.avg !== null);
    const bestDay = validDays.length > 0 ? validDays.reduce((a, b) => (a.avg! > b.avg! ? a : b)) : null;
    const worstDay = validDays.length > 0 ? validDays.reduce((a, b) => (a.avg! < b.avg! ? a : b)) : null;

    const validTimes = timeAvg.map((v, i) => ({ time: i, avg: v })).filter(t => t.avg !== null);
    const bestTime = validTimes.length > 0 ? validTimes.reduce((a, b) => (a.avg! > b.avg! ? a : b)) : null;

    // Most frequent mood
    const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

    return { dayAvg, timeAvg, bestDay, worstDay, bestTime, dominantMood };
  }, [moodHistory]);

  if (!patterns) return null;

  const moodColor = (avg: number | null) => {
    if (avg === null) return '#f3f4f6';
    if (avg >= 4.5) return '#10b981';
    if (avg >= 3.5) return '#3b82f6';
    if (avg >= 2.5) return '#f59e0b';
    if (avg >= 1.5) return '#f97316';
    return '#ef4444';
  };

  const moodEmoji = (val: number) => {
    if (val >= 4.5) return '😄';
    if (val >= 3.5) return '🙂';
    if (val >= 2.5) return '😐';
    if (val >= 1.5) return '😔';
    return '😢';
  };

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <View className="flex-row items-center">
          <View className="bg-purple-100 rounded-full p-2 mr-3">
            <Activity size={20} color="#7c3aed" />
          </View>
          <CardTitle>{t('dashboard.emotionalPatterns', 'Emotional Patterns')}</CardTitle>
        </View>
      </CardHeader>
      <CardContent>
        {/* Day-of-Week Heatmap Row */}
        <Text variant="caption" className="text-gray-500 mb-2 font-medium">
          {t('dashboard.moodByDay', 'Mood by Day of Week')}
        </Text>
        <View className="flex-row justify-between mb-4">
          {DAY_LABELS.map((label, i) => {
            const avg = patterns.dayAvg[i];
            return (
              <View key={i} className="items-center flex-1">
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center mb-1"
                  style={{ backgroundColor: moodColor(avg) + (avg !== null ? '30' : ''), borderWidth: avg !== null ? 1.5 : 0, borderColor: moodColor(avg) }}
                >
                  {avg !== null && (
                    <Text style={{ fontSize: 12 }}>{moodEmoji(avg)}</Text>
                  )}
                </View>
                <Text variant="caption" className="text-gray-400 text-xs">{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Time-of-Day Row */}
        <Text variant="caption" className="text-gray-500 mb-2 font-medium">
          {t('dashboard.moodByTime', 'Mood by Time of Day')}
        </Text>
        <View className="flex-row justify-between mb-4">
          {TIME_LABELS.map((label, i) => {
            const avg = patterns.timeAvg[i];
            const icons = ['🌅', '☀️', '🌆', '🌙'];
            return (
              <View key={i} className="items-center flex-1">
                <View
                  className="w-12 h-10 rounded-lg items-center justify-center mb-1"
                  style={{ backgroundColor: moodColor(avg) + (avg !== null ? '20' : '') }}
                >
                  <Text style={{ fontSize: 14 }}>{icons[i]}</Text>
                  {avg !== null && (
                    <Text style={{ fontSize: 9, color: moodColor(avg), fontWeight: '700' }}>{avg}</Text>
                  )}
                </View>
                <Text variant="caption" className="text-gray-400 text-xs">{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Insights Summary */}
        <View className="border-t border-gray-100 pt-3 gap-2">
          {patterns.bestDay && (
            <View className="flex-row items-center">
              <TrendingUp size={14} color="#10b981" />
              <Text variant="caption" className="text-gray-600 ml-2">
                {t('dashboard.bestDay', 'Best day')}: <Text variant="caption" className="font-semibold text-green-600">{DAY_LABELS[patterns.bestDay.day]}</Text> ({patterns.bestDay.avg})
              </Text>
            </View>
          )}
          {patterns.worstDay && patterns.bestDay && patterns.bestDay.day !== patterns.worstDay.day && (
            <View className="flex-row items-center">
              <TrendingDown size={14} color="#f97316" />
              <Text variant="caption" className="text-gray-600 ml-2">
                {t('dashboard.challengingDay', 'Most challenging')}: <Text variant="caption" className="font-semibold text-orange-600">{DAY_LABELS[patterns.worstDay.day]}</Text> ({patterns.worstDay.avg})
              </Text>
            </View>
          )}
          {patterns.bestTime && (
            <View className="flex-row items-center">
              <Sparkles size={14} color="#8b5cf6" />
              <Text variant="caption" className="text-gray-600 ml-2">
                {t('dashboard.peakTime', 'Peak mood time')}: <Text variant="caption" className="font-semibold text-purple-600">{TIME_LABELS[patterns.bestTime.time]}</Text>
              </Text>
            </View>
          )}
          {patterns.dominantMood && (
            <View className="flex-row items-center">
              <Heart size={14} color="#ec4899" />
              <Text variant="caption" className="text-gray-600 ml-2">
                {t('dashboard.dominantMood', 'Most frequent mood')}: {moodEmoji(Number(patterns.dominantMood[0]))} ({patterns.dominantMood[1]} times)
              </Text>
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: dashboard, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return (response.data ?? null) as DashboardSummary;
    },
  });

  const { data: weeklyProgress } = useQuery({
    queryKey: queryKeys.dashboard.weeklyProgress(),
    queryFn: async () => {
      const response = await dashboardApi.getWeeklyProgress();
      return (response.data ?? null) as WeeklyProgress;
    },
  });

  const { data: insights } = useQuery({
    queryKey: [...queryKeys.dashboard.all, 'insights'] as const,
    queryFn: async () => {
      const response = await dashboardApi.getInsights();
      return (response.data ?? null) as InsightsData;
    },
  });

  // Fetch mood history for emotional pattern widget
  const { data: moodHistory } = useQuery({
    queryKey: queryKeys.mood.history(),
    queryFn: async () => {
      const response = await moodApi.getMoodHistory();
      return response.data?.moodEntries || [];
    },
  });

  const quickActions = [
    {
      icon: Brain,
      label: t('dashboard.assessments', 'Assessments'),
      color: '#6366f1',
      bgColor: '#eef2ff',
      onPress: () => router.push('/assessments' as any),
    },
    {
      icon: Heart,
      label: t('dashboard.mood', 'Log Mood'),
      color: '#ec4899',
      bgColor: '#fce7f3',
      onPress: () => router.push('/(tabs)/mood' as any),
    },
    {
      icon: MessageCircle,
      label: t('dashboard.chat', 'Chat'),
      color: '#8b5cf6',
      bgColor: '#f3e8ff',
      onPress: () => router.push('/(tabs)/chat' as any),
    },
    {
      icon: BookOpen,
      label: t('dashboard.practices', 'Practices'),
      color: '#10b981',
      bgColor: '#d1fae5',
      onPress: () => router.push('/(tabs)/content' as any),
    },
    {
      icon: BarChart3,
      label: t('dashboard.progress', 'Progress'),
      color: '#f97316',
      bgColor: '#fff7ed',
      onPress: () => router.push('/progress' as any),
    },
    {
      icon: Gamepad2,
      label: t('dashboard.games', 'Games'),
      color: '#06b6d4',
      bgColor: '#ecfeff',
      onPress: () => router.push('/games' as any),
    },
  ];

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-gray-50">
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View className="px-6 pt-12 pb-8">
        {/* Header */}
        <View className="mb-8">
          <Text variant="caption" className="text-gray-600 mb-1">
            {t('dashboard.welcome', 'Welcome back')}
          </Text>
          <Text variant="h2" className="text-gray-900 mb-2" accessibilityRole="header">
            {user?.name || 'Guest'}
          </Text>
          <Text variant="body" className="text-gray-600">
            {t('dashboard.subtitle', "Here's your wellness overview")}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text variant="h3" className="mb-4" accessibilityRole="header">
            {t('dashboard.quickActions', 'Quick Actions')}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={action.onPress}
                  className="flex-1 min-w-[48%]"
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <Card className="p-4 items-center">
                    <View 
                      className="rounded-full p-3 mb-2"
                      style={{ backgroundColor: action.bgColor }}
                    >
                      <IconComponent size={24} color={action.color} />
                    </View>
                    <Text variant="caption" className="text-center font-medium">
                      {action.label}
                    </Text>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Stats Overview */}
        {dashboard && (
          <View className="mb-6">
            <Text variant="h3" className="mb-4" accessibilityRole="header">
              {t('dashboard.overview', 'Your Overview')}
            </Text>
            <View className="flex-row gap-3 mb-3">
              <Card className="flex-1 p-4" accessibilityLabel={t('dashboard.assessmentsTaken', 'Assessments')}>
                <Text variant="h1" className="text-primary-600 mb-1">
                  {dashboard.assessmentCount || 0}
                </Text>
                <Text variant="caption" className="text-gray-600">
                  {t('dashboard.assessmentsTaken', 'Assessments')}
                </Text>
              </Card>
              <Card className="flex-1 p-4" accessibilityLabel={t('dashboard.moodLogs', 'Mood Logs')}>
                <Text variant="h1" className="text-accent-600 mb-1">
                  {dashboard.moodEntries || 0}
                </Text>
                <Text variant="caption" className="text-gray-600">
                  {t('dashboard.moodLogs', 'Mood Logs')}
                </Text>
              </Card>
            </View>
            <View className="flex-row gap-3">
              <Card className="flex-1 p-4" accessibilityLabel={t('dashboard.practices', 'Practices')}>
                <Text variant="h1" className="text-success-600 mb-1">
                  {dashboard.completedPractices || 0}
                </Text>
                <Text variant="caption" className="text-gray-600">
                  {t('dashboard.practices', 'Practices')}
                </Text>
              </Card>
              <Card className="flex-1 p-4" accessibilityLabel={t('dashboard.dayStreak', 'Day Streak')}>
                <Text variant="h1" className="text-warning-600 mb-1">
                  {dashboard.streakDays || 0}
                </Text>
                <Text variant="caption" className="text-gray-600">
                  {t('dashboard.dayStreak', 'Day Streak')}
                </Text>
              </Card>
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View className="gap-4 mb-6">
          {/* Enhanced Streak Tracker with Milestones */}
          {(dashboard?.streakDays != null && dashboard.streakDays > 0) && (() => {
            const streak = dashboard.streakDays;
            const { current: curMilestone, next: nextMilestone, pct, daysToGo, upcoming } = getStreakMilestoneInfo(streak);
            return (
              <Card className="border-orange-200">
                <CardContent className="p-4">
                  {/* Current Streak + Milestone Badge */}
                  <View className="flex-row items-center mb-4">
                    <View className="bg-orange-100 rounded-full p-3 mr-4">
                      <Flame size={28} color="#f97316" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text variant="h2" className="text-orange-600">
                          {streak} {t('dashboard.days', 'days')}
                        </Text>
                        {curMilestone && (
                          <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: curMilestone.color + '20' }}>
                            <Text variant="caption" style={{ color: curMilestone.color }}>
                              {curMilestone.icon} {curMilestone.label}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text variant="caption" className="text-orange-700">
                        {t('dashboard.streakMessage', 'Keep your streak going!')}
                      </Text>
                    </View>
                  </View>

                  {/* Progress to Next Milestone */}
                  {daysToGo > 0 && (
                    <View className="mb-4">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text variant="caption" className="text-gray-600">
                          {t('dashboard.nextMilestone', 'Next')}: {nextMilestone.icon} {nextMilestone.label}
                        </Text>
                        <Text variant="caption" className="text-gray-500">
                          {daysToGo} {t('dashboard.daysToGo', 'days to go')}
                        </Text>
                      </View>
                      <View className="bg-gray-200 rounded-full h-2.5">
                        <View 
                          className="rounded-full h-2.5"
                          style={{ width: `${pct}%`, backgroundColor: nextMilestone.color }}
                        />
                      </View>
                    </View>
                  )}

                  {/* Upcoming Milestones Row */}
                  {upcoming.length > 0 && (
                    <View>
                      <Text variant="caption" className="text-gray-500 mb-2">
                        {t('dashboard.upcomingMilestones', 'Upcoming Milestones')}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                          {upcoming.map(m => (
                            <View key={m.days} className="items-center bg-gray-50 rounded-lg px-3 py-2" style={{ minWidth: 72 }}>
                              <Text className="text-lg">{m.icon}</Text>
                              <Text variant="caption" className="font-medium text-gray-700" numberOfLines={1}>
                                {m.days}d
                              </Text>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Recommended Practice */}
          {dashboard?.recommendedPractice && (
            <Card className="bg-primary-50 border-primary-200">
              <CardHeader>
                <CardTitle className="flex-row items-center">
                  <Sparkles size={18} color="#6366f1" />
                  <Text variant="h3" className="ml-2">{t('dashboard.todaysPractice', "Today's Practice")}</Text>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Text variant="label" className="mb-1">{dashboard.recommendedPractice.title}</Text>
                <Text variant="caption" className="text-gray-600 mb-2" numberOfLines={2}>
                  {dashboard.recommendedPractice.description}
                </Text>
                {dashboard.recommendedPractice.duration && (
                  <View className="flex-row items-center mb-2">
                    <Clock size={14} color="#6b7280" />
                    <Text variant="caption" className="ml-1 text-gray-500">
                      {dashboard.recommendedPractice.duration} {t('content.min', 'min')}
                    </Text>
                  </View>
                )}
                {dashboard.recommendedPractice.reason && (
                  <Text variant="caption" className="text-primary-700 italic mb-3">
                    {dashboard.recommendedPractice.reason}
                  </Text>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => router.push(`/content/practice/${dashboard.recommendedPractice!.id}` as any)}
                  leftIcon={<Play size={16} color="#ffffff" />}
                >
                  {t('practices.startPractice', 'Start Practice')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {insights && (
            <Card>
              <CardHeader>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Sparkles size={18} color="#8b5cf6" />
                    <Text variant="h3" className="ml-2">{t('dashboard.aiInsights', 'AI Insights')}</Text>
                  </View>
                  {insights.overallTrend && (
                    <View className={`px-2 py-1 rounded-full ${
                      insights.overallTrend === 'improving' ? 'bg-success-100' :
                      insights.overallTrend === 'declining' ? 'bg-danger-100' : 'bg-gray-100'
                    }`}>
                      <Text variant="caption" className={
                        insights.overallTrend === 'improving' ? 'text-success-700' :
                        insights.overallTrend === 'declining' ? 'text-danger-700' : 'text-gray-700'
                      }>
                        {insights.overallTrend === 'improving' ? '📈' : insights.overallTrend === 'declining' ? '📉' : '📊'}{' '}
                        {t(`dashboard.trend.${insights.overallTrend}`, insights.overallTrend)}
                      </Text>
                    </View>
                  )}
                </View>
              </CardHeader>
              <CardContent>
                {insights.aiSummary && (
                  <Text variant="body" className="text-gray-700 mb-3">
                    {insights.aiSummary}
                  </Text>
                )}
                {insights.wellnessScore != null && (
                  <View className="bg-gray-50 rounded-xl p-3 mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text variant="label">{t('dashboard.wellnessScore', 'Wellness Score')}</Text>
                      <Text variant="h3" className="text-primary-600">{insights.wellnessScore}%</Text>
                    </View>
                    <View className="bg-gray-200 rounded-full h-2">
                      <View 
                        className="bg-primary-500 rounded-full h-2"
                        style={{ width: `${Math.min(insights.wellnessScore, 100)}%` }}
                      />
                    </View>
                  </View>
                )}
                {insights.chatInsights?.commonTopics && insights.chatInsights.commonTopics.length > 0 && (
                  <View>
                    <Text variant="caption" className="text-gray-500 mb-2">{t('dashboard.commonTopics', 'Common Topics')}</Text>
                    <View className="flex-row flex-wrap gap-1">
                      {insights.chatInsights.commonTopics.slice(0, 5).map((topic, i) => (
                        <View key={i} className="bg-purple-100 px-2 py-1 rounded-full">
                          <Text variant="caption" className="text-purple-700">{topic}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>
          )}

          {/* Wellness Trend Chart */}
          <WellnessTrendChart 
            data={insights?.wellnessScoreHistory ?? []}
            t={t}
          />

          {/* Weekly Progress */}
          {weeklyProgress && (
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.thisWeek', 'This Week')}</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-3 py-2">
                  {weeklyProgress.practices && (
                    <View>
                      <View className="flex-row items-center justify-between mb-1">
                        <Text variant="body" className="text-gray-700">
                          {t('dashboard.dailyPractices', 'Practices')}
                        </Text>
                        <Text variant="caption" className="text-gray-500">
                          {weeklyProgress.practices.completed}/{weeklyProgress.practices.goal}
                        </Text>
                      </View>
                      <View className="bg-gray-200 rounded-full h-2">
                        <View 
                          className="bg-success-500 rounded-full h-2"
                          style={{ width: `${Math.min((weeklyProgress.practices.completed / Math.max(weeklyProgress.practices.goal, 1)) * 100, 100)}%` }}
                        />
                      </View>
                    </View>
                  )}
                  {weeklyProgress.moodCheckins && (
                    <View>
                      <View className="flex-row items-center justify-between mb-1">
                        <Text variant="body" className="text-gray-700">
                          {t('dashboard.moodCheckins', 'Mood Check-ins')}
                        </Text>
                        <Text variant="caption" className="text-gray-500">
                          {weeklyProgress.moodCheckins.completed}/{weeklyProgress.moodCheckins.goal}
                        </Text>
                      </View>
                      <View className="bg-gray-200 rounded-full h-2">
                        <View 
                          className="bg-pink-500 rounded-full h-2"
                          style={{ width: `${Math.min((weeklyProgress.moodCheckins.completed / Math.max(weeklyProgress.moodCheckins.goal, 1)) * 100, 100)}%` }}
                        />
                      </View>
                    </View>
                  )}
                  {weeklyProgress.assessmentsCompleted != null && (
                    <View className="flex-row items-center justify-between">
                      <Text variant="body" className="text-gray-700">
                        {t('dashboard.assessmentsThisWeek', 'Assessments')}
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

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.moodTrend', 'Recent Mood')}</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.recentMood ? (
                <View className="py-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text variant="body" className="text-gray-700">
                      {dashboard.recentMood.emoji} {dashboard.recentMood.label}
                    </Text>
                    <Text variant="caption" className="text-gray-500">
                      {dashboard.recentMood.date}
                    </Text>
                  </View>
                  {dashboard.recentMood.note && (
                    <Text variant="caption" className="text-gray-600">
                      {dashboard.recentMood.note}
                    </Text>
                  )}
                </View>
              ) : (
                <View className="items-center py-8">
                  <Heart size={48} color="#d1d5db" />
                  <Text variant="body" className="text-gray-600 mt-4 text-center">
                    {t('dashboard.noMoodData', 'Start tracking your mood')}
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Emotional Pattern Widget */}
          {moodHistory && (moodHistory as any[]).length >= 5 && (
            <EmotionalPatternWidget moodHistory={moodHistory as any[]} t={t} />
          )}

          <Card>
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <CardTitle>{t('dashboard.nextSteps', 'Recommended for You')}</CardTitle>
                <TouchableOpacity
                  onPress={() => router.push('/recommendations' as any)}
                  accessibilityRole="button"
                  accessibilityLabel={t('dashboard.seeAllRecommendations', 'See all recommendations')}
                >
                  <Text variant="caption" className="text-primary-600 font-medium">
                    {t('dashboard.seeAll', 'See All →')}
                  </Text>
                </TouchableOpacity>
              </View>
            </CardHeader>
            <CardContent>
              <View className="gap-3 py-2">
                <TouchableOpacity 
                  className="flex-row items-center p-3 bg-gray-50 rounded-lg"
                  onPress={() => router.push('/assessments' as any)}
                  accessibilityRole="button"
                  accessibilityLabel={t('dashboard.takeAssessment', 'Take an Assessment')}
                >
                  <View className="bg-primary-100 rounded-full p-2 mr-3">
                    <Brain size={20} color="#6366f1" />
                  </View>
                  <View className="flex-1">
                    <Text variant="label" className="mb-1">
                      {t('dashboard.takeAssessment', 'Take an Assessment')}
                    </Text>
                    <Text variant="caption" className="text-gray-600">
                      {t('dashboard.assessmentDesc', 'Check your current wellness')}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="flex-row items-center p-3 bg-gray-50 rounded-lg"
                  onPress={() => router.push('/(tabs)/mood' as any)}
                  accessibilityRole="button"
                  accessibilityLabel={t('dashboard.logMood', 'Log Your Mood')}
                >
                  <View className="bg-pink-100 rounded-full p-2 mr-3">
                    <Heart size={20} color="#ec4899" />
                  </View>
                  <View className="flex-1">
                    <Text variant="label" className="mb-1">
                      {t('dashboard.logMood', 'Log Your Mood')}
                    </Text>
                    <Text variant="caption" className="text-gray-600">
                      {t('dashboard.moodDesc', 'Track how you feel today')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  className="flex-row items-center p-3 bg-gray-50 rounded-lg"
                  onPress={() => router.push('/progress' as any)}
                  accessibilityRole="button"
                  accessibilityLabel={t('dashboard.viewProgress', 'View Progress')}
                >
                  <View className="bg-orange-100 rounded-full p-2 mr-3">
                    <BarChart3 size={20} color="#f97316" />
                  </View>
                  <View className="flex-1">
                    <Text variant="label" className="mb-1">
                      {t('dashboard.viewProgress', 'View Progress')}
                    </Text>
                    <Text variant="caption" className="text-gray-600">
                      {t('dashboard.progressDesc', 'See your wellness journey')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  className="flex-row items-center p-3 bg-gray-50 rounded-lg"
                  onPress={() => router.push('/help-safety' as any)}
                  accessibilityRole="button"
                  accessibilityLabel={t('dashboard.helpSafety', 'Help & Safety')}
                >
                  <View className="bg-red-100 rounded-full p-2 mr-3">
                    <Shield size={20} color="#ef4444" />
                  </View>
                  <View className="flex-1">
                    <Text variant="label" className="mb-1">
                      {t('dashboard.helpSafety', 'Help & Safety')}
                    </Text>
                    <Text variant="caption" className="text-gray-600">
                      {t('dashboard.helpDesc', 'Crisis support & resources')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  className="flex-row items-center p-3 bg-gray-50 rounded-lg"
                  onPress={() => router.push('/games' as any)}
                  accessibilityRole="button"
                  accessibilityLabel={t('dashboard.playGames', 'Wellness Games')}
                >
                  <View className="bg-cyan-100 rounded-full p-2 mr-3">
                    <Gamepad2 size={20} color="#06b6d4" />
                  </View>
                  <View className="flex-1">
                    <Text variant="label" className="mb-1">
                      {t('dashboard.playGames', 'Wellness Games')}
                    </Text>
                    <Text variant="caption" className="text-gray-600">
                      {t('dashboard.gamesDesc', 'Fun activities for your mind')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}
