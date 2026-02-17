import { useState, useCallback, useRef } from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Loading';
import { assessmentsApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';
import {
  scoreAdvancedAssessment,
  templateToScoringQuestions,
  buildResponseDetails,
} from '@/utils/assessmentScoring';
import { friendlyAssessmentLabel } from '@/utils/assessmentUtils';
import type { AssessmentTemplate, AssessmentSyncPayload } from '@/types';

export default function TakeAssessmentScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});

  // Store local scoring result for use in onSuccess
  const localScoreRef = useRef<{
    rawScore: number;
    maxScore: number;
    normalizedScoreRounded: number;
    interpretation: string;
  } | null>(null);

  const { data: template, isLoading } = useQuery({
    queryKey: queryKeys.assessments.detail(id!),
    queryFn: async () => {
      const response = await assessmentsApi.getAssessmentTemplates([id!]);
      if (!response.success) throw new Error(response.error || 'Failed to load assessment');
      return response.data?.templates?.[0] as AssessmentTemplate | undefined;
    },
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      assessmentType: string;
      responses: Record<string, unknown>;
      responseDetails: Array<{
        questionId: string;
        questionText: string;
        answerLabel: string;
        answerValue: number;
        answerScore: number;
      }>;
      score: number;
      rawScore: number;
      maxScore: number;
      categoryBreakdown?: Record<string, { raw: number; normalized: number; interpretation?: string }>;
    }) => {
      const response = await assessmentsApi.submitAssessment(payload);
      if (!response.success) throw new Error(response.error || 'Failed to submit assessment');
      return response;
    },
    onSuccess: (response) => {
      // Invalidate queries to refresh history data
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.history() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.available() });

      const syncData = response.data as AssessmentSyncPayload | undefined;
      const assessment = syncData?.assessment;
      const insights = syncData?.insights;

      // Navigate to results with the full data from backend
      router.replace({
        pathname: '/assessments/result' as any,
        params: {
          score: String(assessment?.score ?? localScoreRef.current?.rawScore ?? 0),
          maxScore: String(assessment?.maxScore ?? localScoreRef.current?.maxScore ?? 0),
          rawScore: String(assessment?.rawScore ?? localScoreRef.current?.rawScore ?? 0),
          normalizedScore: String(localScoreRef.current?.normalizedScoreRounded ?? 0),
          severity: assessment?.interpretation ?? localScoreRef.current?.interpretation ?? '',
          interpretation: assessment?.interpretation ?? localScoreRef.current?.interpretation ?? '',
          assessmentName: template?.title ?? friendlyAssessmentLabel(id!),
          assessmentType: id!,
          trend: assessment?.trend ?? 'baseline',
          changeFromPrevious: String(assessment?.changeFromPrevious ?? ''),
          aiSummary: insights?.aiSummary ?? '',
          wellnessScore: String(insights?.wellnessScore?.value ?? ''),
          overallTrend: insights?.overallTrend ?? '',
          hasInsights: insights ? 'true' : 'false',
        },
      });
    },
    onError: (error: any) => {
      Alert.alert(
        t('common.error', 'Error'),
        error.message || t('assessments.submitError', 'Failed to submit assessment'),
      );
    },
  });

  // Derived values (safe to compute even when template is null)
  const questions = template?.questions ?? [];
  const totalQuestions = questions.length;
  const question = questions[currentQuestion];
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;
  const isLastQuestion = totalQuestions > 0 && currentQuestion === totalQuestions - 1;
  const hasAnswer = answers[currentQuestion] !== undefined;
  const answeredCount = Object.keys(answers).length;
  const remainingTime = Math.ceil((totalQuestions - answeredCount) * 0.5);

  // All hooks MUST be above any conditional returns
  const handleSelectAnswer = useCallback((questionIndex: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
  }, []);

  const handleBack = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  }, [currentQuestion]);

  const handleSubmit = useCallback(() => {
    if (!template) return;

    // Build responses map {questionId: value}
    const responsesMap: Record<string, number> = {};
    template.questions.forEach((q, index) => {
      responsesMap[q.id] = answers[index] ?? 0;
    });

    // Client-side scoring
    const scoringQuestions = templateToScoringQuestions(template.questions);
    const stringAnswers: Record<string, string | number> = {};
    Object.entries(responsesMap).forEach(([k, v]) => {
      stringAnswers[k] = v;
    });

    const scored = scoreAdvancedAssessment({
      assessmentType: id!,
      answers: stringAnswers,
      questions: scoringQuestions,
      scoring: template.scoring,
    });

    // Build responseDetails for richer backend processing
    const responseDetails = buildResponseDetails(template.questions, answers);

    // Save for onSuccess callback
    localScoreRef.current = {
      rawScore: scored.rawScore,
      maxScore: scored.maxScore,
      normalizedScoreRounded: scored.normalizedScoreRounded,
      interpretation: scored.interpretation,
    };

    submitMutation.mutate({
      assessmentType: id!,
      responses: responsesMap,
      responseDetails,
      score: scored.normalizedScoreRounded,
      rawScore: scored.rawScore,
      maxScore: scored.maxScore,
      categoryBreakdown: scored.categoryBreakdown,
    });
  }, [template, answers, id, submitMutation]);

  const handleNext = useCallback(() => {
    if (!hasAnswer) {
      Alert.alert(
        t('assessments.selectAnswer', 'Select an Answer'),
        t('assessments.selectAnswerDesc', 'Please select an answer before continuing'),
      );
      return;
    }

    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestion(prev => prev + 1);
    }
  }, [hasAnswer, isLastQuestion, handleSubmit, t]);

  // --- Conditional returns AFTER all hooks ---

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (!template || !question) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <Text variant="body" className="text-gray-600 text-center">
          {t('assessments.notFound', 'Assessment not found')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Progress Bar */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-2">
          <Text variant="caption" className="text-gray-600">
            {t('assessments.question', 'Question')} {currentQuestion + 1} {t('common.of', 'of')}{' '}
            {totalQuestions}
          </Text>
          <View className="flex-row items-center">
            {remainingTime > 0 && (
              <View className="flex-row items-center mr-3">
                <Clock size={12} color="#9ca3af" />
                <Text variant="caption" className="text-gray-500 ml-1">
                  ~{remainingTime} {t('common.minutes', 'min')}
                </Text>
              </View>
            )}
            <Text variant="caption" className="text-primary-600 font-semibold">
              {Math.round(progress)}%
            </Text>
          </View>
        </View>
        <View className="w-full bg-gray-200 rounded-full h-2">
          <View
            className="bg-primary-600 rounded-full h-2"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24 }} keyboardShouldPersistTaps="handled">
        {/* Question */}
        <Card className="mb-6 bg-primary-50">
          <CardContent className="p-6">
            <Text variant="h3" className="text-primary-900">
              {question.text}
            </Text>
          </CardContent>
        </Card>

        {/* Answer Options */}
        <View className="gap-3">
          {question.options?.map((option, index) => {
            const isSelected = answers[currentQuestion] === option.value;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectAnswer(currentQuestion, option.value)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={option.text}
              >
                <Card
                  variant={isSelected ? 'elevated' : 'outlined'}
                  className={`p-4 ${isSelected ? 'border-2 border-primary-600 bg-primary-50' : ''}`}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                        isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <CheckCircle size={16} color="#ffffff" />}
                    </View>
                    <Text
                      variant="body"
                      className={isSelected ? 'text-primary-900 font-medium' : 'text-gray-700'}
                    >
                      {option.text}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View className="px-6 py-4 border-t border-gray-200 bg-white">
        <View className="flex-row gap-3">
          {currentQuestion > 0 && (
            <Button
              variant="outline"
              size="lg"
              onPress={handleBack}
              disabled={submitMutation.isPending}
              leftIcon={<ChevronLeft size={20} color="#6366f1" />}
              accessibilityRole="button"
              accessibilityLabel={t('accessibility.previousQuestion')}
            >
              {t('nav.back', 'Back')}
            </Button>
          )}

          <Button
            variant="primary"
            size="lg"
            onPress={handleNext}
            loading={submitMutation.isPending}
            disabled={submitMutation.isPending || !hasAnswer}
            className="flex-1"
            rightIcon={
              isLastQuestion ? undefined : <ChevronRight size={20} color="#ffffff" />
            }
            accessibilityRole="button"
            accessibilityLabel={isLastQuestion ? t('accessibility.submitAssessment') : t('accessibility.nextQuestion')}
          >
            {isLastQuestion
              ? t('assessments.submit', 'Submit')
              : t('nav.next', 'Next')}
          </Button>
        </View>
      </View>
    </View>
  );
}
