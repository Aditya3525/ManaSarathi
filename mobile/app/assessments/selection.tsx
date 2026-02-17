import { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CheckSquare,
  Square,
  Clock,
  ChevronRight,
  Brain,
  Sparkles,
} from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/Loading';
import { assessmentsApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';
import {
  BASIC_ASSESSMENT_DEFINITIONS,
  getAllBasicAssessmentTypes,
  getEstimatedTime,
} from '@/data/basicAssessmentDefinitions';
import type { AssessmentSessionSummary } from '@/types';

export default function AssessmentSelectionScreen() {
  const { t } = useTranslation();
  const allBasic = useMemo(() => getAllBasicAssessmentTypes(), []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    allBasic.map((a) => a.assessmentType),
  );

  const startSessionMutation = useMutation({
    mutationFn: async (types: string[]) => {
      const response = await assessmentsApi.startAssessmentSession({ selectedTypes: types });
      if (!response.success) throw new Error(response.error || 'Failed to start session');
      return response;
    },
    onSuccess: (response, variables) => {
      const session = (response.data as { session: AssessmentSessionSummary })?.session;
      if (session) {
        router.push({
          pathname: '/assessments/combined' as any,
          params: {
            sessionId: session.id,
            selectedTypes: variables.join(','),
          },
        });
      }
    },
  });

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const selectAll = () => {
    if (selectedTypes.length === allBasic.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(allBasic.map((a) => a.assessmentType));
    }
  };

  const estimatedMinutes = getEstimatedTime(selectedTypes);
  const totalQuestions = selectedTypes.reduce((sum, type) => {
    const def = BASIC_ASSESSMENT_DEFINITIONS[type];
    return sum + (def?.questions.length ?? 0);
  }, 0);

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-6">
        {/* Header */}
        <View className="items-center mb-6">
          <View className="bg-primary-100 rounded-full p-4 mb-4">
            <Sparkles size={32} color="#6366f1" />
          </View>
          <Text variant="h2" className="text-center mb-2">
            {t('assessments.overallTitle', 'Basic Overall Assessment')}
          </Text>
          <Text variant="body" className="text-gray-600 text-center">
            {t(
              'assessments.overallDesc',
              'Select which screenings you\'d like to take. We recommend all 7 for a complete picture.',
            )}
          </Text>
        </View>

        {/* Stats Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <View className="flex-row items-center justify-around">
              <View className="items-center">
                <Text variant="h3" className="text-primary-600">
                  {selectedTypes.length}
                </Text>
                <Text variant="caption" className="text-gray-600">
                  {t('assessments.selected', 'Selected')}
                </Text>
              </View>
              <View className="w-px h-8 bg-gray-200" />
              <View className="items-center">
                <Text variant="h3" className="text-primary-600">
                  {totalQuestions}
                </Text>
                <Text variant="caption" className="text-gray-600">
                  {t('assessments.totalQuestions', 'Questions')}
                </Text>
              </View>
              <View className="w-px h-8 bg-gray-200" />
              <View className="items-center flex-row">
                <Clock size={16} color="#6366f1" />
                <Text variant="h3" className="text-primary-600 ml-1">
                  ~{estimatedMinutes}
                </Text>
                <Text variant="caption" className="text-gray-600 ml-1">
                  {t('common.minutes', 'min')}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Select All */}
        <TouchableOpacity
          onPress={selectAll}
          className="flex-row items-center mb-4 px-2"
          activeOpacity={0.7}
        >
          {selectedTypes.length === allBasic.length ? (
            <CheckSquare size={22} color="#6366f1" />
          ) : (
            <Square size={22} color="#9ca3af" />
          )}
          <Text variant="label" className="ml-2 text-gray-700">
            {selectedTypes.length === allBasic.length
              ? t('assessments.deselectAll', 'Deselect All')
              : t('assessments.selectAll', 'Select All')}
          </Text>
        </TouchableOpacity>

        {/* Assessment Options */}
        <View className="gap-3 mb-6">
          {allBasic.map((assessment) => {
            const isSelected = selectedTypes.includes(assessment.assessmentType);
            return (
              <TouchableOpacity
                key={assessment.assessmentType}
                onPress={() => toggleType(assessment.assessmentType)}
                activeOpacity={0.7}
              >
                <Card
                  className={`${
                    isSelected ? 'border-2 border-primary-500 bg-primary-50' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <View className="flex-row items-start">
                      {isSelected ? (
                        <CheckSquare size={22} color="#6366f1" />
                      ) : (
                        <Square size={22} color="#d1d5db" />
                      )}
                      <View className="flex-1 ml-3">
                        <Text
                          variant="label"
                          className={isSelected ? 'text-primary-900' : 'text-gray-800'}
                        >
                          {assessment.title}
                        </Text>
                        <Text variant="caption" className="text-gray-600 mt-1">
                          {assessment.description}
                        </Text>
                        <View className="flex-row items-center mt-2 gap-3">
                          <Badge variant="default" size="sm">
                            {assessment.questions.length} {t('assessments.questions', 'Qs')}
                          </Badge>
                          <View className="flex-row items-center">
                            <Clock size={12} color="#9ca3af" />
                            <Text variant="caption" className="text-gray-500 ml-1">
                              ~{assessment.estimatedMinutes} {t('common.minutes', 'min')}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Start Button */}
      <View className="px-6 py-4 border-t border-gray-200 bg-white">
        <Button
          variant="primary"
          size="lg"
          onPress={() => startSessionMutation.mutate(selectedTypes)}
          loading={startSessionMutation.isPending}
          disabled={selectedTypes.length === 0 || startSessionMutation.isPending}
          fullWidth
          rightIcon={<ChevronRight size={20} color="#ffffff" />}
        >
          {selectedTypes.length === 0
            ? t('assessments.selectAtLeastOne', 'Select at least one')
            : t('assessments.beginAssessment', `Begin (${totalQuestions} questions)`)}
        </Button>
      </View>
    </View>
  );
}
