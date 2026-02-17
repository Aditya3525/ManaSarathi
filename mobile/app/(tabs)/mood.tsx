import { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, TrendingUp, Calendar, ChevronRight, ChevronLeft } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { moodApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';

// =============================================================================
// Mood Calendar Heatmap Component
// =============================================================================
const MOOD_COLORS: Record<number, string> = {
  1: '#fecaca', // terrible - red-200
  2: '#fed7aa', // not good - orange-200
  3: '#fde68a', // okay - yellow-200
  4: '#bfdbfe', // good - blue-200
  5: '#bbf7d0', // great - green-200
};

const MOOD_COLORS_STRONG: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#f59e0b',
  4: '#3b82f6',
  5: '#10b981',
};

function MoodCalendarHeatmap({
  history,
  moodOptions,
  calendarMonth,
  setCalendarMonth,
  t,
}: {
  history: any[];
  moodOptions: { value: number; emoji: string; label: string; color: string }[];
  calendarMonth: { year: number; month: number };
  setCalendarMonth: (m: { year: number; month: number }) => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const { year, month } = calendarMonth;

  // Build day → mood mapping for the displayed month
  const dayMoodMap = useMemo(() => {
    const map: Record<number, { mood: number; count: number }> = {};
    history.forEach((entry: any) => {
      const d = new Date(entry.createdAt || entry.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const moodVal = Number(entry.mood) || 3;
        if (!map[day]) {
          map[day] = { mood: moodVal, count: 1 };
        } else {
          // Average multiple entries in same day
          map[day] = {
            mood: Math.round((map[day].mood * map[day].count + moodVal) / (map[day].count + 1)),
            count: map[day].count + 1,
          };
        }
      }
    });
    return map;
  }, [history, year, month]);

  // Calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const monthLabel = new Date(year, month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCalendarMonth(month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  };
  const nextMonth = () => {
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth())) return;
    setCalendarMonth(month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  };

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const cellSize = (Dimensions.get('window').width - 80) / 7; // 6px padding each side + 6 gaps

  return (
    <Card className="mb-6">
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={prevMonth} className="p-2">
            <ChevronLeft size={20} color="#6b7280" />
          </TouchableOpacity>
          <CardTitle>{monthLabel}</CardTitle>
          <TouchableOpacity onPress={nextMonth} className="p-2" disabled={isCurrentMonth}>
            <ChevronRight size={20} color={isCurrentMonth ? '#d1d5db' : '#6b7280'} />
          </TouchableOpacity>
        </View>
      </CardHeader>
      <CardContent className="p-4">
        {/* Day headers */}
        <View className="flex-row mb-2">
          {dayNames.map((d, i) => (
            <View key={i} style={{ width: cellSize }} className="items-center">
              <Text variant="caption" className="text-gray-400 font-medium">{d}</Text>
            </View>
          ))}
        </View>
        {/* Calendar cells */}
        <View className="flex-row flex-wrap">
          {cells.map((day, i) => {
            const moodData = day ? dayMoodMap[day] : null;
            const isToday = isCurrentMonth && day === today.getDate();
            const bgColor = moodData ? MOOD_COLORS[moodData.mood] || '#f3f4f6' : 'transparent';
            const borderColor = isToday ? '#6366f1' : 'transparent';

            return (
              <View
                key={i}
                style={{
                  width: cellSize,
                  height: cellSize,
                  padding: 2,
                }}
                className="items-center justify-center"
              >
                {day !== null ? (
                  <View
                    style={{
                      backgroundColor: bgColor,
                      borderWidth: isToday ? 2 : 0,
                      borderColor,
                      width: cellSize - 6,
                      height: cellSize - 6,
                      borderRadius: 6,
                    }}
                    className="items-center justify-center"
                  >
                    <Text
                      variant="caption"
                      className={`text-xs ${moodData ? 'font-semibold text-gray-800' : 'text-gray-400'}`}
                    >
                      {day}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        {/* Legend */}
        <View className="flex-row justify-center gap-3 mt-4 pt-3 border-t border-gray-100">
          {moodOptions.map((m) => (
            <View key={m.value} className="flex-row items-center">
              <View className="w-3 h-3 rounded mr-1" style={{ backgroundColor: MOOD_COLORS[m.value] }} />
              <Text variant="caption" className="text-gray-500 text-xs">{m.emoji}</Text>
            </View>
          ))}
        </View>
        {/* Month stats */}
        {Object.keys(dayMoodMap).length > 0 && (
          <View className="flex-row justify-around mt-3 pt-3 border-t border-gray-100">
            <View className="items-center">
              <Text variant="h3" className="text-primary-600">{Object.keys(dayMoodMap).length}</Text>
              <Text variant="caption" className="text-gray-500">{t('mood.daysLogged', 'Days Logged')}</Text>
            </View>
            <View className="items-center">
              <Text variant="h3" className="text-primary-600">
                {Math.round(Object.values(dayMoodMap).reduce((a, b) => a + b.mood, 0) / Object.keys(dayMoodMap).length * 10) / 10}
              </Text>
              <Text variant="caption" className="text-gray-500">{t('mood.monthAvg', 'Month Avg')}</Text>
            </View>
            <View className="items-center">
              <Text variant="h3" className="text-primary-600">
                {Math.round((Object.keys(dayMoodMap).length / daysInMonth) * 100)}%
              </Text>
              <Text variant="caption" className="text-gray-500">{t('mood.consistency', 'Consistency')}</Text>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

export default function MoodScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const MOOD_OPTIONS = [
    { value: 5, emoji: '😄', label: t('mood.great', 'Great'), color: '#10b981' },
    { value: 4, emoji: '🙂', label: t('mood.good', 'Good'), color: '#3b82f6' },
    { value: 3, emoji: '😐', label: t('mood.okay', 'Okay'), color: '#f59e0b' },
    { value: 2, emoji: '😔', label: t('mood.notGood', 'Not Good'), color: '#f97316' },
    { value: 1, emoji: '😢', label: t('mood.terrible', 'Terrible'), color: '#ef4444' },
  ];

  const { data: history, isLoading, isError, error: queryError, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.mood.history(),
    queryFn: async () => {
      const response = await moodApi.getMoodHistory();
      return response.data?.moodEntries || [];
    },
  });

  // Compute trends from already-fetched history (no duplicate API call)
  const trends = useMemo(() => {
    if (!history || history.length === 0) return null;
    const entries = history;
    const totalEntries = entries.length;
    const averageMood = entries.reduce((sum: number, e: any) => sum + (Number(e.mood) || 0), 0) / totalEntries;
    // Simple streak calculation
    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sorted = [...entries].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (let i = 0; i < sorted.length; i++) {
      const entryDate = new Date(sorted[i].createdAt);
      entryDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      if (entryDate.getTime() === expectedDate.getTime()) {
        streakDays++;
      } else {
        break;
      }
    }
    return { averageMood, totalEntries, streakDays };
  }, [history]);

  const logMoodMutation = useMutation({
    mutationFn: async ({ mood, note }: { mood: number; note?: string }) => {
      return await moodApi.logMood(String(mood), note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mood.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      setSelectedMood(null);
      setNote('');
      setShowForm(false);
      Alert.alert(
        t('mood.success', 'Mood Logged'),
        t('mood.successMessage', 'Your mood has been recorded')
      );
    },
    onError: (error: any) => {
      Alert.alert(
        t('common.error', 'Error'),
        error.message || t('mood.logError', 'Failed to log mood')
      );
    },
  });

  const handleSubmit = () => {
    if (selectedMood === null) {
      Alert.alert(
        t('mood.selectMood', 'Select Your Mood'),
        t('mood.selectMoodDesc', 'Please select how you\'re feeling')
      );
      return;
    }

    logMoodMutation.mutate({ mood: selectedMood, note });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
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
        <View className="mb-6">
          <Text variant="h2" className="mb-2" accessibilityRole="header">
            {t('mood.title', 'Mood Tracker')}
          </Text>
          <Text variant="body" className="text-gray-600">
            {t('mood.subtitle', 'Track your emotional well-being')}
          </Text>
        </View>

        {/* Log Mood Card */}
        {!showForm ? (
          <Card className="mb-6">
            <CardContent className="p-6">
              <View className="items-center">
                <View className="bg-pink-100 rounded-full p-4 mb-4">
                  <Heart size={32} color="#ec4899" />
                </View>
                <Text variant="h3" className="mb-2 text-center">
                  {t('mood.howAreYou', 'How are you feeling today?')}
                </Text>
                <Text variant="caption" className="text-gray-600 mb-6 text-center">
                  {t('mood.trackDaily', 'Tracking your mood helps identify patterns')}
                </Text>
                <Button
                  variant="primary"
                  size="lg"
                  onPress={() => setShowForm(true)}
                  fullWidth
                >
                  {t('mood.logMood', 'Log Your Mood')}
                </Button>
              </View>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('mood.logMood', 'Log Your Mood')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Text variant="label" className="mb-3">
                {t('mood.selectFeeling', 'How are you feeling?')}
              </Text>
              
              <View className="flex-row justify-between mb-6">
                {MOOD_OPTIONS.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    onPress={() => setSelectedMood(mood.value)}
                    className="items-center"
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t(`accessibility.mood${mood.label === 'Great' ? 'Excellent' : mood.label === 'Not Good' ? 'Bad' : mood.label}`)}
                  >
                    <View
                      className={`rounded-full p-3 mb-2 ${
                        selectedMood === mood.value ? 'bg-primary-100' : 'bg-gray-100'
                      }`}
                      style={{
                        borderWidth: selectedMood === mood.value ? 2 : 0,
                        borderColor: mood.color,
                      }}
                    >
                      <Text style={{ fontSize: 32 }}>{mood.emoji}</Text>
                    </View>
                    <Text
                      variant="caption"
                      className={selectedMood === mood.value ? 'font-semibold' : ''}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label={t('mood.addNote', 'Add a note (optional)')}
                placeholder={t('mood.notePlaceholder', 'What influenced your mood?')}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                accessibilityLabel={t('mood.addNote', 'Add a note (optional)')}
              />

              <View className="flex-row gap-3 mt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onPress={() => {
                    setShowForm(false);
                    setSelectedMood(null);
                    setNote('');
                  }}
                  disabled={logMoodMutation.isPending}
                  className="flex-1"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onPress={handleSubmit}
                  loading={logMoodMutation.isPending}
                  disabled={logMoodMutation.isPending}
                  className="flex-1"
                >
                  {t('mood.save', 'Save')}
                </Button>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Trends */}
        {trends && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('mood.trends', 'Your Trends')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text variant="h2" className="text-primary-600 mb-1">
                    {trends.averageMood?.toFixed(1) || '0'}
                  </Text>
                  <Text variant="caption" className="text-gray-600">
                    {t('mood.average', 'Average')}
                  </Text>
                </View>
                <View className="items-center">
                  <Text variant="h2" className="text-success-600 mb-1">
                    {trends.totalEntries || 0}
                  </Text>
                  <Text variant="caption" className="text-gray-600">
                    {t('mood.logged', 'Logged')}
                  </Text>
                </View>
                <View className="items-center">
                  <Text variant="h2" className="text-accent-600 mb-1">
                    {trends.streakDays || 0}
                  </Text>
                  <Text variant="caption" className="text-gray-600">
                    {t('mood.streak', 'Day Streak')}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Mood Calendar Heatmap */}
        {history && history.length > 0 && (
          <MoodCalendarHeatmap
            history={history}
            moodOptions={MOOD_OPTIONS}
            calendarMonth={calendarMonth}
            setCalendarMonth={setCalendarMonth}
            t={t}
          />
        )}

        {/* History */}
        <View>
          <Text variant="h3" className="mb-4" accessibilityRole="header">
            {t('mood.recentEntries', 'Recent Entries')}
          </Text>
          {history && history.length > 0 ? (
            <View className="gap-3">
              {history.slice(0, 10).map((entry: any, index: number) => {
                const mood = MOOD_OPTIONS.find(m => m.value === entry.mood);
                return (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <View className="flex-row items-center">
                        <View
                          className="rounded-full p-2 mr-3"
                          style={{ backgroundColor: mood ? mood.color + '20' : '#f3f4f6' }}
                        >
                          <Text style={{ fontSize: 28 }}>{mood?.emoji || '😐'}</Text>
                        </View>
                        <View className="flex-1">
                          <Text variant="label" className="mb-1">
                            {mood?.label || 'Unknown'}
                          </Text>
                          {entry.note && (
                            <Text variant="caption" className="text-gray-600 mb-1">
                              {entry.note}
                            </Text>
                          )}
                          <Text variant="caption" className="text-gray-500">
                            {entry.date}
                          </Text>
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Card className="p-8">
              <View className="items-center">
                <Heart size={48} color="#d1d5db" />
                <Text variant="body" className="text-gray-600 mt-4 text-center">
                  {t('mood.noEntries', 'No mood entries yet')}
                </Text>
                <Text variant="caption" className="text-gray-500 mt-2 text-center">
                  {t('mood.startTracking', 'Start tracking your mood to see patterns')}
                </Text>
              </View>
            </Card>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
