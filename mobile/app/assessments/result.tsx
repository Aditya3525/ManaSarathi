import { View, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  Minus,
  Sparkles,
  BarChart3,
  ArrowRight,
  Brain,
} from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getSeverityColor, severityBadgeVariant, trendHexColor } from '@/utils/assessmentUtils';

export default function AssessmentResultScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    score: string;
    maxScore: string;
    rawScore: string;
    normalizedScore: string;
    severity: string;
    interpretation: string;
    assessmentName: string;
    assessmentType: string;
    trend: string;
    changeFromPrevious: string;
    aiSummary: string;
    wellnessScore: string;
    overallTrend: string;
    hasInsights: string;
  }>();

  const {
    score,
    maxScore,
    rawScore,
    normalizedScore,
    severity,
    interpretation,
    assessmentName,
    assessmentType,
    trend,
    changeFromPrevious,
    aiSummary,
    wellnessScore,
    overallTrend,
    hasInsights,
  } = params;

  const severityColors = getSeverityColor(severity || interpretation || '');

  const getSeverityIcon = () => {
    switch (severity?.toLowerCase()) {
      case 'minimal':
      case 'low':
      case 'excellent':
        return CheckCircle;
      case 'mild':
      case 'moderate':
      case 'fair':
        return Info;
      case 'moderately severe':
      case 'severe':
      case 'needs attention':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp size={16} color="#059669" />;
      case 'declining':
        return <TrendingDown size={16} color="#e11d48" />;
      case 'stable':
        return <Minus size={16} color="#2563eb" />;
      default:
        return null;
    }
  };

  const getTrendLabel = () => {
    switch (trend) {
      case 'improving':
        return t('assessments.improving', 'Improving');
      case 'declining':
        return t('assessments.declining', 'Declining');
      case 'stable':
        return t('assessments.stable', 'Stable');
      default:
        return t('assessments.baseline', 'Baseline');
    }
  };

  const SeverityIcon = getSeverityIcon();
  const displayScore = rawScore || score || '0';
  const displayMaxScore = maxScore || '0';
  const displayNormalized = normalizedScore ? `${normalizedScore}%` : '';
  const changeNum = changeFromPrevious ? parseFloat(changeFromPrevious) : null;
  const isCombinedAssessment = assessmentType === 'combined';
  const parsedWellness = wellnessScore ? parseFloat(wellnessScore) : NaN;

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-6">
        {/* Result Header */}
        <View className="items-center mb-6">
          <View
            className="rounded-full p-6 mb-4"
            style={{ backgroundColor: severityColors.bg }}
          >
            <SeverityIcon size={48} color={severityColors.icon} />
          </View>

          <Text variant="h2" className="text-center mb-2">
            {t('assessments.resultsTitle', 'Assessment Complete')}
          </Text>

          <Text variant="body" className="text-gray-600 text-center mb-3">
            {assessmentName}
          </Text>

          <Badge
            variant={severityBadgeVariant(severity || interpretation || '')}
            size="lg"
          >
            {severity || interpretation}
          </Badge>

          {/* Trend indicator */}
          {trend && trend !== 'baseline' && (
            <View className="flex-row items-center mt-3">
              {getTrendIcon()}
              <Text
                variant="caption"
                className="ml-1 font-medium"
                style={{ color: trendHexColor(trend as any) }}
              >
                {getTrendLabel()}
                {changeNum != null && changeNum !== 0
                  ? ` (${changeNum > 0 ? '+' : ''}${changeNum})`
                  : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Score Card */}
        {/* Score Card — hide for combined assessment (no single score) */}
        {!isCombinedAssessment && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('assessments.yourScore', 'Your Score')}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="items-center py-4">
              <Text variant="h1" className="text-primary-600 mb-1">
                {displayScore}
              </Text>
              {displayMaxScore !== '0' && (
                <Text variant="caption" className="text-gray-600 mb-2">
                  {t('assessments.outOf', 'out of')} {displayMaxScore}
                </Text>
              )}
              {displayNormalized && (
                <View className="bg-primary-50 rounded-full px-4 py-1 mt-1">
                  <Text variant="caption" className="text-primary-700 font-semibold">
                    {displayNormalized} {t('assessments.normalized', 'normalized')}
                  </Text>
                </View>
              )}
            </View>
            {/* Score Progress Bar */}
            {displayMaxScore !== '0' && (
              <View className="px-4 pb-2">
                <View className="w-full bg-gray-200 rounded-full h-3">
                  <View
                    className="rounded-full h-3"
                    style={{
                      width: `${Math.min(100, (parseFloat(displayScore) / parseFloat(displayMaxScore)) * 100)}%`,
                      backgroundColor: severityColors.icon,
                    }}
                  />
                </View>
              </View>
            )}
          </CardContent>
        </Card>
        )}

        {/* Wellness Score (if available) */}
        {!isNaN(parsedWellness) && (
          <Card className="mb-4 bg-primary-50 border border-primary-200">
            <CardContent className="p-4">
              <View className="flex-row items-center">
                <Sparkles size={20} color="#6366f1" />
                <Text variant="label" className="text-primary-800 ml-2 flex-1">
                  {t('assessments.overallWellness', 'Overall Wellness Score')}
                </Text>
                <Text variant="h3" className="text-primary-600">
                  {Math.round(parsedWellness)}%
                </Text>
              </View>
              {overallTrend && overallTrend !== '' && (
                <View className="flex-row items-center mt-2">
                  {(() => {
                    switch (overallTrend) {
                      case 'improving':
                        return <TrendingUp size={14} color="#059669" />;
                      case 'declining':
                        return <TrendingDown size={14} color="#e11d48" />;
                      default:
                        return <Minus size={14} color="#2563eb" />;
                    }
                  })()}
                  <Text
                    variant="caption"
                    className="ml-1"
                    style={{ color: trendHexColor(overallTrend as any) }}
                  >
                    {t('assessments.overallTrend', 'Overall trend')}: {overallTrend}
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Summary */}
        {aiSummary && aiSummary !== '' && (
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
                {aiSummary}
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Interpretation */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('assessments.interpretation', 'What This Means')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Text variant="body" className="text-gray-700 leading-6">
              {interpretation ||
                t(
                  'assessments.defaultInterpretation',
                  'Your results indicate your current wellness level. This is a screening tool, not a diagnosis. Please consult with a mental health professional for a comprehensive evaluation.',
                )}
            </Text>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-4 bg-blue-50 border border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">
              {t('assessments.nextSteps', 'Recommended Next Steps')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              {[
                t('assessments.nextStep1', 'Track your progress by taking this assessment regularly'),
                t('assessments.nextStep2', 'Explore guided practices and coping strategies'),
                t('assessments.nextStep3', 'Consider speaking with a mental health professional'),
              ].map((step, idx) => (
                <View key={idx} className="flex-row items-start">
                  <View className="bg-blue-600 rounded-full p-1 mr-3 mt-1">
                    <ArrowRight size={14} color="#ffffff" />
                  </View>
                  <Text variant="body" className="flex-1 text-blue-900">
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      {/* Actions */}
      <View className="px-6 py-4 border-t border-gray-200 bg-white">
        <View className="gap-3">
          {hasInsights === 'true' && (
            <Button
              variant="primary"
              size="lg"
              onPress={() => router.push('/assessments/insights' as any)}
              fullWidth
              leftIcon={<BarChart3 size={20} color="#ffffff" />}
            >
              {t('assessments.viewFullInsights', 'View Full Insights')}
            </Button>
          )}
          <Button
            variant={hasInsights === 'true' ? 'outline' : 'primary'}
            size="lg"
            onPress={() => router.push('/(tabs)' as any)}
            fullWidth
          >
            {t('nav.backToDashboard', 'Back to Dashboard')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onPress={() => router.push('/assessments' as any)}
            fullWidth
          >
            {t('assessments.takeAnother', 'Take Another Assessment')}
          </Button>
        </View>
      </View>
    </View>
  );
}
