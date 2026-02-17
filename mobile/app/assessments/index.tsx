import { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  ChevronRight,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Sparkles,
  Filter,
} from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { assessmentsApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';
import { friendlyAssessmentLabel, severityBadgeVariant, trendHexColor } from '@/utils/assessmentUtils';
import type { AssessmentHistoryEntry, AssessmentInsights } from '@/types';

type FilterCategory = 'all' | 'recommended' | 'completed' | 'not-started';

export default function AssessmentsListScreen() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const { data: assessments, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.assessments.available(),
    queryFn: async () => {
      const response = await assessmentsApi.getAvailableAssessments();
      if (!response.success) throw new Error(response.error || 'Failed to load assessments');
      return response.data || [];
    },
  });

  const { data: historyData } = useQuery({
    queryKey: queryKeys.assessments.history(),
    queryFn: async () => {
      const response = await assessmentsApi.getAssessmentHistory();
      if (!response.success) throw new Error(response.error || 'Failed to load history');
      return response.data as { history: AssessmentHistoryEntry[]; insights: AssessmentInsights } | undefined;
    },
  });

  const history = historyData?.history || [];
  const insights = historyData?.insights;

  // Build a map of latest result per assessment type
  const latestByType = useMemo(() => {
    const map: Record<string, AssessmentHistoryEntry> = {};
    history.forEach((entry) => {
      if (!map[entry.assessmentType]) {
        map[entry.assessmentType] = entry;
      }
    });
    return map;
  }, [history]);

  // Completed assessment types
  const completedTypes = useMemo(() => new Set(Object.keys(latestByType)), [latestByType]);

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    if (!assessments) return [];
    switch (activeFilter) {
      case 'completed':
        return assessments.filter((a: any) => completedTypes.has(a.type || a.id));
      case 'not-started':
        return assessments.filter((a: any) => !completedTypes.has(a.type || a.id));
      case 'recommended':
        return assessments.filter((a: any) => a.category === 'recommended' || a.category === 'required');
      default:
        return assessments;
    }
  }, [assessments, activeFilter, completedTypes]);

  const completionPercent = useMemo(() => {
    if (!assessments?.length) return 0;
    return Math.round((completedTypes.size / assessments.length) * 100);
  }, [assessments, completedTypes]);

  const getTrendIcon = useCallback((trend?: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp size={14} color="#059669" />;
      case 'declining':
        return <TrendingDown size={14} color="#e11d48" />;
      case 'stable':
        return <Minus size={14} color="#2563eb" />;
      default:
        return null;
    }
  }, []);

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

  const recentAssessment = history?.[0];

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View className="px-6 py-6">
        {/* Header */}
        <View className="mb-4">
          <Text variant="h3" className="mb-2">
            {t('assessments.title', 'Assessments')}
          </Text>
          <Text variant="body" className="text-gray-600">
            {t('assessments.subtitle', 'Track your mental wellness with validated assessments')}
          </Text>
        </View>

        {/* Completion Stats Bar */}
        {assessments && assessments.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text variant="label" className="text-gray-700">
                  {t('assessments.progress', 'Your Progress')}
                </Text>
                <Text variant="caption" className="text-primary-600 font-semibold">
                  {completedTypes.size}/{assessments.length} {t('assessments.completed', 'completed')}
                </Text>
              </View>
              <View className="w-full bg-gray-200 rounded-full h-2.5">
                <View
                  className="bg-primary-600 rounded-full h-2.5"
                  style={{ width: `${completionPercent}%` }}
                />
              </View>
              {insights?.wellnessScore && (
                <View className="flex-row items-center mt-3">
                  <Sparkles size={16} color="#6366f1" />
                  <Text variant="caption" className="text-primary-600 ml-1 font-medium">
                    {t('assessments.wellnessScore', 'Wellness Score')}: {Math.round(insights.wellnessScore.value)}%
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {/* Basic Overall Assessment CTA */}
        <TouchableOpacity
          onPress={() => router.push('/assessments/selection' as any)}
          activeOpacity={0.7}
        >
          <Card className="mb-4 bg-primary-600">
            <CardContent className="p-5">
              <View className="flex-row items-center">
                <View className="bg-white/20 rounded-xl p-3 mr-4">
                  <BarChart3 size={28} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text variant="label" className="text-white mb-1">
                    {t('assessments.basicOverall', 'Basic Overall Assessment')}
                  </Text>
                  <Text variant="caption" className="text-primary-100">
                    {t('assessments.basicOverallDesc', 'Take 7 short screenings to get a complete wellness picture')}
                  </Text>
                </View>
                <ChevronRight size={20} color="#ffffff" />
              </View>
            </CardContent>
          </Card>
        </TouchableOpacity>

        {/* Recent Result */}
        {recentAssessment && (
          <TouchableOpacity
            onPress={() => router.push('/assessments/insights' as any)}
            activeOpacity={0.7}
          >
            <Card className="mb-4 p-4 bg-green-50 border border-green-200">
              <View className="flex-row items-start">
                <View className="bg-green-600 rounded-full p-2 mr-3">
                  <CheckCircle size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text variant="label" className="text-green-900 mb-1">
                    {t('assessments.lastCompleted', 'Last Completed')}
                  </Text>
                  <Text variant="body" className="text-green-800 mb-1">
                    {friendlyAssessmentLabel(recentAssessment.assessmentType)}
                  </Text>
                  <View className="flex-row items-center">
                    <Text variant="caption" className="text-green-700">
                      {t('assessments.score', 'Score')}: {recentAssessment.score}
                      {recentAssessment.maxScore ? `/${recentAssessment.maxScore}` : ''}
                    </Text>
                    <Text variant="caption" className="text-green-700 mx-2">•</Text>
                    <Text variant="caption" className="text-green-700">
                      {new Date(recentAssessment.completedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Badge variant={severityBadgeVariant(recentAssessment.interpretation)} size="sm">
                    {recentAssessment.interpretation}
                  </Badge>
                  {recentAssessment.trend && recentAssessment.trend !== 'baseline' && (
                    <View className="flex-row items-center mt-2">
                      {getTrendIcon(recentAssessment.trend)}
                      <Text variant="caption" className="ml-1" style={{ color: trendHexColor(recentAssessment.trend) }}>
                        {recentAssessment.changeFromPrevious != null
                          ? `${recentAssessment.changeFromPrevious > 0 ? '+' : ''}${recentAssessment.changeFromPrevious}`
                          : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Filter Tabs */}
        <View className="flex-row mb-4 gap-2">
          {(
            [
              { key: 'all' as FilterCategory, label: t('common.all', 'All') },
              { key: 'recommended' as FilterCategory, label: t('assessments.recommended', 'Recommended') },
              { key: 'completed' as FilterCategory, label: t('assessments.completedFilter', 'Done') },
              { key: 'not-started' as FilterCategory, label: t('assessments.notStarted', 'New') },
            ] as const
          ).map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              className={`px-4 py-2 rounded-full ${
                activeFilter === filter.key ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <Text
                variant="caption"
                className={activeFilter === filter.key ? 'text-white font-semibold' : 'text-gray-600'}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Assessment List */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text variant="h3">
              {t('assessments.available', 'Available Assessments')}
            </Text>
            <View className="flex-row items-center">
              <Filter size={14} color="#9ca3af" />
              <Text variant="caption" className="text-gray-500 ml-1">
                {filteredAssessments.length}
              </Text>
            </View>
          </View>
          <View className="gap-3">
            {filteredAssessments.map((assessment: any) => {
              const typeKey = assessment.type || assessment.id;
              const latestResult = latestByType[typeKey];
              const typeSummary = insights?.byType?.[typeKey];
              const isCompleted = completedTypes.has(typeKey);

              return (
                <TouchableOpacity
                  key={assessment.id}
                  onPress={() => router.push(`/assessments/${typeKey}` as any)}
                  activeOpacity={0.7}
                >
                  <Card>
                    <CardContent className="p-4">
                      <View className="flex-row items-start">
                        <View
                          className="rounded-xl p-3 mr-4"
                          style={{
                            backgroundColor: isCompleted ? '#d1fae5' : '#e0e7ff',
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle size={24} color="#059669" />
                          ) : (
                            <Brain size={24} color="#6366f1" />
                          )}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1">
                            <Text variant="label" className="flex-1">
                              {assessment.name || friendlyAssessmentLabel(typeKey)}
                            </Text>
                            {typeSummary?.trend && typeSummary.trend !== 'baseline' && (
                              <View className="flex-row items-center ml-2">
                                {getTrendIcon(typeSummary.trend)}
                              </View>
                            )}
                          </View>
                          <Text variant="caption" className="text-gray-600 mb-2" numberOfLines={2}>
                            {assessment.description}
                          </Text>
                          <View className="flex-row items-center gap-3">
                            <View className="flex-row items-center">
                              <Clock size={14} color="#9ca3af" />
                              <Text variant="caption" className="text-gray-500 ml-1">
                                {assessment.estimatedTime || assessment.timeEstimate || '5-10'} {t('common.minutes', 'min')}
                              </Text>
                            </View>
                            <Badge variant="default" size="sm">
                              {assessment.questionCount || assessment.questions || 0} {t('assessments.questions', 'Qs')}
                            </Badge>
                            {latestResult && (
                              <Badge variant={severityBadgeVariant(latestResult.interpretation)} size="sm">
                                {latestResult.score}{latestResult.maxScore ? `/${latestResult.maxScore}` : ''}
                              </Badge>
                            )}
                          </View>
                          {latestResult && (
                            <Text variant="caption" className="text-gray-400 mt-1">
                              {t('assessments.lastTaken', 'Last')}: {new Date(latestResult.completedAt).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                        <ChevronRight size={20} color="#9ca3af" />
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              );
            })}

            {!filteredAssessments.length && (
              <Card className="p-8">
                <View className="items-center">
                  <Brain size={48} color="#d1d5db" />
                  <Text variant="body" className="text-gray-600 mt-4 text-center">
                    {activeFilter === 'all'
                      ? t('assessments.noAssessments', 'No assessments available')
                      : t('assessments.noMatchingAssessments', 'No assessments match this filter')}
                  </Text>
                </View>
              </Card>
            )}
          </View>
        </View>

        {/* View Insights Button */}
        {history.length > 0 && (
          <Button
            variant="outline"
            size="lg"
            onPress={() => router.push('/assessments/insights' as any)}
            fullWidth
            leftIcon={<BarChart3 size={20} color="#6366f1" />}
          >
            {t('assessments.viewInsights', 'View Assessment Insights & History')}
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
