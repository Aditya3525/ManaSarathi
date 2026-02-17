import { useMemo } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  BarChart3,
  Clock,
  Target,
  ArrowRight,
  AlertCircle,
} from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Loading';
import { assessmentsApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';
import {
  friendlyAssessmentLabel,
  severityBadgeVariant,
  trendHexColor,
  getSeverityColor,
  isHigherScoreBetter,
} from '@/utils/assessmentUtils';
import type {
  AssessmentHistoryEntry,
  AssessmentInsights,
  AssessmentTypeSummary,
} from '@/types';

export default function AssessmentInsightsScreen() {
  const { t } = useTranslation();

  const { data: historyData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.assessments.history(),
    queryFn: async () => {
      const response = await assessmentsApi.getAssessmentHistory();
      return response.data as
        | { history: AssessmentHistoryEntry[]; insights: AssessmentInsights }
        | undefined;
    },
  });

  const history = historyData?.history || [];
  const insights = historyData?.insights;

  // Group history by type
  const typeEntries = useMemo(() => {
    if (!insights?.byType) return [];
    return Object.entries(insights.byType).sort((a, b) => {
      const aDate = a[1].lastCompletedAt || '';
      const bDate = b[1].lastCompletedAt || '';
      return bDate.localeCompare(aDate);
    });
  }, [insights]);

  const getTrendIcon = (trend?: string, size = 16) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp size={size} color="#059669" />;
      case 'declining':
        return <TrendingDown size={size} color="#e11d48" />;
      case 'stable':
        return <Minus size={size} color="#2563eb" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (!history.length) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <Brain size={64} color="#d1d5db" />
        <Text variant="h3" className="text-gray-800 mt-4 text-center">
          {t('assessments.noHistory', 'No Assessment History Yet')}
        </Text>
        <Text variant="body" className="text-gray-600 mt-2 text-center">
          {t('assessments.takeFirstDesc', 'Take your first assessment to start tracking your wellness journey.')}
        </Text>
        <Button
          variant="primary"
          size="lg"
          onPress={() => router.push('/assessments' as any)}
          className="mt-6"
        >
          {t('assessments.takeFirst', 'Take an Assessment')}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View className="px-6 py-6">
        {/* Wellness Score Card */}
        {insights?.wellnessScore && (
          <Card className="mb-4 bg-primary-600">
            <CardContent className="p-6">
              <View className="flex-row items-center mb-4">
                <Sparkles size={24} color="#ffffff" />
                <Text variant="label" className="text-white ml-2">
                  {t('assessments.overallWellness', 'Overall Wellness Score')}
                </Text>
              </View>
              <View className="items-center">
                <Text variant="h1" className="text-white mb-2">
                  {Math.round(insights.wellnessScore.value)}%
                </Text>
                {/* Score ring approximation with progress bar */}
                <View className="w-full bg-white/20 rounded-full h-3 mb-3">
                  <View
                    className="bg-white rounded-full h-3"
                    style={{ width: `${Math.min(100, insights.wellnessScore.value)}%` }}
                  />
                </View>
                {insights.overallTrend && (
                  <View className="flex-row items-center">
                    {(() => {
                      switch (insights.overallTrend) {
                        case 'improving':
                          return <TrendingUp size={16} color="#bbf7d0" />;
                        case 'declining':
                          return <TrendingDown size={16} color="#fecaca" />;
                        default:
                          return <Minus size={16} color="#bfdbfe" />;
                      }
                    })()}
                    <Text variant="caption" className="text-primary-100 ml-1">
                      {t('assessments.overallTrend', 'Overall trend')}: {insights.overallTrend}
                    </Text>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        )}

        {/* AI Summary */}
        {insights?.aiSummary && (
          <Card className="mb-4">
            <CardHeader>
              <View className="flex-row items-center">
                <Brain size={18} color="#6366f1" />
                <CardTitle className="ml-2">
                  {t('assessments.aiInsights', 'AI Insights')}
                </CardTitle>
              </View>
            </CardHeader>
            <CardContent>
              <Text variant="body" className="text-gray-700 leading-6">
                {insights.aiSummary}
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Per-Type Score Cards */}
        {typeEntries.length > 0 && (
          <View className="mb-4">
            <Text variant="h3" className="mb-3">
              {t('assessments.byCategory', 'By Category')}
            </Text>
            <View className="gap-3">
              {typeEntries.map(([typeKey, summary]) => (
                <AssessmentTypeCard
                  key={typeKey}
                  typeKey={typeKey}
                  summary={summary}
                  getTrendIcon={getTrendIcon}
                  t={t}
                />
              ))}
            </View>
          </View>
        )}

        {/* Assessment History Timeline */}
        <View className="mb-4">
          <Text variant="h3" className="mb-3">
            {t('assessments.recentHistory', 'Recent History')}
          </Text>
          <View className="gap-3">
            {history.slice(0, 20).map((entry, idx) => (
              <Card key={entry.id || idx}>
                <CardContent className="p-4">
                  <View className="flex-row items-start">
                    <View className="mr-3 mt-1">
                      {entry.trend === 'improving' ? (
                        <TrendingUp size={18} color="#059669" />
                      ) : entry.trend === 'declining' ? (
                        <TrendingDown size={18} color="#e11d48" />
                      ) : (
                        <Target size={18} color="#6366f1" />
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text variant="label">
                          {friendlyAssessmentLabel(entry.assessmentType)}
                        </Text>
                        <Badge
                          variant={severityBadgeVariant(entry.interpretation)}
                          size="sm"
                        >
                          {entry.interpretation}
                        </Badge>
                      </View>
                      <View className="flex-row items-center mt-1">
                        <Text variant="caption" className="text-gray-600">
                          {t('assessments.score', 'Score')}: {entry.score}
                          {entry.maxScore ? `/${entry.maxScore}` : ''}
                        </Text>
                        {entry.changeFromPrevious != null && entry.changeFromPrevious !== 0 && (
                          <Text
                            variant="caption"
                            className="ml-2 font-medium"
                            style={{
                              color: trendHexColor(entry.trend),
                            }}
                          >
                            ({entry.changeFromPrevious > 0 ? '+' : ''}
                            {entry.changeFromPrevious})
                          </Text>
                        )}
                      </View>
                      <View className="flex-row items-center mt-1">
                        <Clock size={12} color="#9ca3af" />
                        <Text variant="caption" className="text-gray-400 ml-1">
                          {new Date(entry.completedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        </View>

        {/* Take Assessment CTA */}
        <Button
          variant="primary"
          size="lg"
          onPress={() => router.push('/assessments' as any)}
          fullWidth
          leftIcon={<BarChart3 size={20} color="#ffffff" />}
        >
          {t('assessments.takeAnother', 'Take Another Assessment')}
        </Button>
      </View>
    </ScrollView>
  );
}

// Sub-component for per-type score cards
function AssessmentTypeCard({
  typeKey,
  summary,
  getTrendIcon,
  t,
}: {
  typeKey: string;
  summary: AssessmentTypeSummary;
  getTrendIcon: (trend?: string, size?: number) => React.ReactNode;
  t: (key: string, fallback: string) => string;
}) {
  const severityColors = getSeverityColor(summary.interpretation);
  const higherBetter = isHigherScoreBetter(typeKey);
  const changeIndicator =
    summary.change != null && summary.change !== 0
      ? `${summary.change > 0 ? '+' : ''}${summary.change}`
      : null;

  return (
    <Card>
      <CardContent className="p-4">
        <View className="flex-row items-start">
          <View
            className="rounded-xl p-2.5 mr-3"
            style={{ backgroundColor: severityColors.bg }}
          >
            <BarChart3 size={20} color={severityColors.icon} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text variant="label">{friendlyAssessmentLabel(typeKey)}</Text>
              <View className="flex-row items-center">
                {getTrendIcon(summary.trend, 14)}
                <Badge
                  variant={severityBadgeVariant(summary.interpretation)}
                  size="sm"
                  className="ml-1"
                >
                  {summary.interpretation}
                </Badge>
              </View>
            </View>

            {/* Score bar */}
            <View className="flex-row items-center mb-2">
              <Text variant="h3" style={{ color: severityColors.icon }}>
                {summary.latestScore}
              </Text>
              {summary.maxScore && (
                <Text variant="caption" className="text-gray-500 ml-1">
                  /{summary.maxScore}
                </Text>
              )}
              {changeIndicator && (
                <Text
                  variant="caption"
                  className="ml-2 font-medium"
                  style={{ color: trendHexColor(summary.trend) }}
                >
                  {changeIndicator}
                </Text>
              )}
            </View>

            {/* Mini progress bar */}
            {summary.maxScore && summary.maxScore > 0 && (
              <View className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                <View
                  className="rounded-full h-1.5"
                  style={{
                    width: `${Math.min(100, (summary.latestScore / summary.maxScore) * 100)}%`,
                    backgroundColor: severityColors.icon,
                  }}
                />
              </View>
            )}

            {/* Stats row */}
            <View className="flex-row items-center gap-3">
              <Text variant="caption" className="text-gray-500">
                {t('assessments.avg', 'Avg')}: {Math.round(summary.averageScore)}
              </Text>
              <Text variant="caption" className="text-gray-500">
                {t('assessments.best', 'Best')}: {summary.bestScore}
              </Text>
              <Text variant="caption" className="text-gray-500">
                {summary.historyCount} {t('assessments.taken', 'taken')}
              </Text>
            </View>

            {/* Recommendations */}
            {summary.recommendations?.length > 0 && (
              <View className="mt-2 pt-2 border-t border-gray-100">
                {summary.recommendations.slice(0, 2).map((rec, idx) => (
                  <View key={idx} className="flex-row items-start mt-1">
                    <ArrowRight size={12} color="#6366f1" />
                    <Text variant="caption" className="text-gray-600 ml-1 flex-1">
                      {rec}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
