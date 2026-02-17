import { useState, useMemo, useCallback } from 'react';
import { View, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, Brain } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { assessmentsApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';
import {
  BASIC_ASSESSMENT_DEFINITIONS,
  type BasicAssessmentDefinition,
  type BasicAssessmentQuestion,
} from '@/data/basicAssessmentDefinitions';
import { friendlyAssessmentLabel } from '@/utils/assessmentUtils';

interface FlatQuestion {
  assessmentType: string;
  assessmentTitle: string;
  questionIndex: number; // index within this assessment
  totalInAssessment: number;
  question: BasicAssessmentQuestion;
}

export default function CombinedAssessmentFlowScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { sessionId, selectedTypes: selectedTypesStr } = useLocalSearchParams<{
    sessionId: string;
    selectedTypes: string;
  }>();

  const selectedTypes = useMemo(
    () => (selectedTypesStr ? selectedTypesStr.split(',') : []),
    [selectedTypesStr],
  );

  // Flatten all questions from all selected assessments
  const flatQuestions = useMemo(() => {
    const questions: FlatQuestion[] = [];
    selectedTypes.forEach((type) => {
      const def = BASIC_ASSESSMENT_DEFINITIONS[type];
      if (def) {
        def.questions.forEach((q, idx) => {
          questions.push({
            assessmentType: type,
            assessmentTitle: def.title,
            questionIndex: idx,
            totalInAssessment: def.questions.length,
            question: q,
          });
        });
      }
    });
    return questions;
  }, [selectedTypes]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({}); // questionId -> value

  const currentFlat = flatQuestions[currentIndex];
  const totalQuestions = flatQuestions.length;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const hasAnswer = currentFlat ? answers[currentFlat.question.id] !== undefined : false;
  const answeredCount = Object.keys(answers).length;
  const remainingTime = Math.ceil((totalQuestions - answeredCount) * 0.5);

  // Determine which assessment section we're currently in
  const currentAssessmentIndex = useMemo(() => {
    if (!currentFlat) return 0;
    return selectedTypes.indexOf(currentFlat.assessmentType);
  }, [currentFlat, selectedTypes]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Score each assessment independently
      const assessmentPayloads = selectedTypes.map((type) => {
        const def = BASIC_ASSESSMENT_DEFINITIONS[type];
        if (!def) return null;

        const responses: Record<string, number> = {};
        const responseDetails: Array<{
          questionId: string;
          questionText: string;
          answerLabel: string;
          answerValue: number;
          answerScore: number;
        }> = [];

        let rawScore = 0;
        let maxScore = 0;

        def.questions.forEach((q) => {
          const value = answers[q.id] ?? 0;
          responses[q.id] = value;
          rawScore += value;

          const maxOpt = Math.max(...q.options.map((o) => o.value));
          maxScore += maxOpt;

          const matchedOption = q.options.find((o) => o.value === value);
          responseDetails.push({
            questionId: q.id,
            questionText: q.text,
            answerLabel: matchedOption?.text ?? String(value),
            answerValue: value,
            answerScore: value,
          });
        });

        return {
          assessmentType: type,
          responses,
          responseDetails,
          score: maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0,
          rawScore,
          maxScore,
        };
      }).filter(Boolean) as Array<{
        assessmentType: string;
        responses: Record<string, number>;
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
      }>;

      if (!sessionId) throw new Error('Missing session ID');
      const response = await assessmentsApi.submitCombinedAssessments({
        sessionId,
        assessments: assessmentPayloads,
      });
      if (!response.success) throw new Error(response.error || 'Failed to submit assessments');
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.history() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.available() });

      const data = response.data as any;
      router.replace({
        pathname: '/assessments/result' as any,
        params: {
          score: '',
          maxScore: '',
          rawScore: '',
          normalizedScore: '',
          severity: '',
          interpretation: t('assessments.combinedComplete', 'Combined assessment complete'),
          assessmentName: t('assessments.basicOverall', 'Basic Overall Assessment'),
          assessmentType: 'combined',
          trend: data?.insights?.overallTrend ?? '',
          changeFromPrevious: '',
          aiSummary: data?.insights?.aiSummary ?? '',
          wellnessScore: String(data?.insights?.wellnessScore?.value ?? ''),
          overallTrend: data?.insights?.overallTrend ?? '',
          hasInsights: data?.insights ? 'true' : 'false',
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

  const handleNext = useCallback(() => {
    if (!hasAnswer) {
      Alert.alert(
        t('assessments.selectAnswer', 'Select an Answer'),
        t('assessments.selectAnswerDesc', 'Please select an answer before continuing'),
      );
      return;
    }

    if (isLastQuestion) {
      submitMutation.mutate();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }, [hasAnswer, isLastQuestion, currentIndex, submitMutation, t]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  if (!currentFlat || totalQuestions === 0) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <Brain size={48} color="#d1d5db" />
        <Text variant="body" className="text-gray-600 text-center mt-4">
          {t('assessments.noQuestionsSelected', 'No assessments selected')}
        </Text>
        <Button
          variant="outline"
          size="lg"
          onPress={() => router.back()}
          className="mt-4"
        >
          {t('nav.goBack', 'Go Back')}
        </Button>
      </View>
    );
  }

  if (submitMutation.isPending) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text variant="h3" className="text-primary-600 mt-4 text-center">
          {t('assessments.generatingInsights', 'Generating Your Insights...')}
        </Text>
        <Text variant="body" className="text-gray-600 mt-2 text-center">
          {t('assessments.pleaseWait', 'Our AI is analyzing your responses to provide personalized insights')}
        </Text>
      </View>
    );
  }

  const { question } = currentFlat;

  return (
    <View className="flex-1 bg-white">
      {/* Progress Header */}
      <View className="px-6 pt-4 pb-2">
        {/* Assessment section indicator */}
        <View className="flex-row items-center justify-between mb-2">
          <Badge variant="default" size="sm">
            {currentFlat.assessmentTitle}
          </Badge>
          <Text variant="caption" className="text-gray-500">
            {t('assessments.section', 'Section')} {currentAssessmentIndex + 1}/{selectedTypes.length}
          </Text>
        </View>

        {/* Overall progress */}
        <View className="flex-row items-center justify-between mb-2">
          <Text variant="caption" className="text-gray-600">
            {t('assessments.question', 'Question')} {currentIndex + 1} {t('common.of', 'of')}{' '}
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
          {question.options.map((option, index) => {
            const isSelected = answers[question.id] === option.value;
            return (
              <TouchableOpacity
                key={option.id || index}
                onPress={() =>
                  setAnswers((prev) => ({ ...prev, [question.id]: option.value }))
                }
                activeOpacity={0.7}
              >
                <Card
                  variant={isSelected ? 'elevated' : 'outlined'}
                  className={`p-4 ${
                    isSelected ? 'border-2 border-primary-600 bg-primary-50' : ''
                  }`}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                        isSelected
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <CheckCircle size={16} color="#ffffff" />}
                    </View>
                    <Text
                      variant="body"
                      className={
                        isSelected ? 'text-primary-900 font-medium' : 'text-gray-700'
                      }
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
          {currentIndex > 0 && (
            <Button
              variant="outline"
              size="lg"
              onPress={handleBack}
              disabled={submitMutation.isPending}
              leftIcon={<ChevronLeft size={20} color="#6366f1" />}
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
          >
            {isLastQuestion
              ? t('assessments.submit', 'Submit All')
              : t('nav.next', 'Next')}
          </Button>
        </View>
      </View>
    </View>
  );
}
