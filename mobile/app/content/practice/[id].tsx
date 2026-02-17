import { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, Alert, Share, Modal, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Clock, Tag, BarChart3, BookmarkPlus, BookmarkCheck, Share2, Play, CheckCircle, Pause, X, RotateCcw } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { LoadingSpinner as Loading } from '@/components/ui/Loading';
import { contentApi, practicesApi } from '@/services/api';
import { QUERY_KEYS, queryClient } from '@/config/queryClient';

const DIFFICULTY_COLORS = {
  beginner: 'text-success-600',
  intermediate: 'text-warning-600',
  advanced: 'text-danger-600',
};

export default function PracticeDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showSession, setShowSession] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const { data: practice, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.content.practice(id!),
    queryFn: () => contentApi.getPracticeById(id!),
    enabled: !!id,
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => contentApi.bookmarkContent(id!, 'practice'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.content.practice(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.content.bookmarks() });
    },
  });

  const startPracticeMutation = useMutation({
    mutationFn: () => practicesApi.logPracticeSession({
      practiceId: id!,
      startTime: new Date().toISOString(),
    }),
    onSuccess: (session: any) => {
      // Open guided session modal
      setShowSession(true);
      setSessionTime(0);
      setCurrentStep(0);
      setIsTimerRunning(true);
    },
  });

  const handleEndSession = useCallback(() => {
    setIsTimerRunning(false);
    setShowSession(false);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.practices.history() });
    Alert.alert(
      t('practices.completed', 'Practice Complete! 🎉'),
      t('practices.completedDescription', `Great job! You practiced for ${formatTime(sessionTime)}.`),
      [{ text: t('common.ok', 'OK') }]
    );
  }, [sessionTime, formatTime, t]);

  const handleShare = async () => {
    try {
      await Share.share({
        title: practice?.title || '',
        message: `${practice?.title}\n\n${practice?.description || ''}\n\nTry it on MaanSarathi`,
      });
    } catch (error) {
      // User cancelled or share failed
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loading size="large" />
        <Text variant="body" className="mt-4 text-gray-600">
          {t('common.loading', 'Loading...')}
        </Text>
      </View>
    );
  }

  if (error || !practice) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text variant="h3" className="mb-2">
          {t('content.notFound', 'Practice not found')}
        </Text>
        <Text variant="body" className="text-gray-600 mb-6 text-center">
          {t('content.practiceNotFoundDescription', 'The practice you are looking for could not be found')}
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          {t('common.goBack', 'Go Back')}
        </Button>
      </View>
    );
  }

  return (
    <>
    <ScrollView className="flex-1 bg-white">
      {/* Hero Section */}
      <View className="bg-gradient-to-br from-primary-500 to-primary-700 px-6 py-12">
        <View className="bg-white/20 rounded-full w-16 h-16 items-center justify-center mb-4">
          <Play size={32} color="#ffffff" />
        </View>
        <Text variant="h1" className="text-white mb-4">
          {practice.title}
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {practice.duration && (
            <View className="flex-row items-center">
              <Clock size={16} color="#ffffff" />
              <Text variant="caption" className="ml-1 text-white">
                {practice.duration} {t('content.min', 'min')}
              </Text>
            </View>
          )}
          {practice.difficulty && (
            <View className="flex-row items-center">
              <BarChart3 size={16} color="#ffffff" />
              <Text variant="caption" className="ml-1 text-white capitalize">
                {practice.difficulty}
              </Text>
            </View>
          )}
          {practice.category && (
            <View className="flex-row items-center">
              <Tag size={16} color="#ffffff" />
              <Text variant="caption" className="ml-1 text-white">
                {practice.category}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className="px-6 py-8">
        {/* Primary Actions */}
        <View className="gap-3 mb-6">
          <Button
            variant="primary"
            size="lg"
            onPress={() => startPracticeMutation.mutate()}
            disabled={startPracticeMutation.isPending}
            fullWidth
            leftIcon={<Play size={20} color="#ffffff" />}
          >
            {t('practices.startPractice', 'Start Practice')}
          </Button>
          <View className="flex-row gap-3">
            <Button
              variant={practice.isBookmarked ? 'primary' : 'outline'}
              size="sm"
              onPress={() => bookmarkMutation.mutate()}
              disabled={bookmarkMutation.isPending}
              leftIcon={
                practice.isBookmarked ? (
                  <BookmarkCheck size={18} color="#ffffff" />
                ) : (
                  <BookmarkPlus size={18} color="#6366f1" />
                )
              }
            >
              {practice.isBookmarked
                ? t('content.bookmarked', 'Saved')
                : t('content.bookmark', 'Save')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={handleShare}
              leftIcon={<Share2 size={18} color="#6366f1" />}
            >
              {t('common.share', 'Share')}
            </Button>
          </View>
        </View>

        <Separator className="mb-6" />

        {/* Description */}
        <View className="mb-8">
          <Text variant="h3" className="mb-3">
            {t('content.about', 'About this practice')}
          </Text>
          <Text variant="body" className="text-gray-800 leading-relaxed">
            {practice.description}
          </Text>
        </View>

        {/* Benefits */}
        {practice.benefits && practice.benefits.length > 0 && (
          <View className="mb-8">
            <Text variant="h3" className="mb-3">
              {t('practices.benefits', 'Benefits')}
            </Text>
            <Card className="bg-success-50 border-success-200">
              <CardContent className="p-4">
                <View className="gap-3">
                  {practice.benefits.map((benefit: string, index: number) => (
                    <View key={index} className="flex-row items-start">
                      <CheckCircle size={20} color="#10b981" className="mr-2 mt-0.5" />
                      <Text variant="body" className="flex-1 text-success-900">
                        {benefit}
                      </Text>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Instructions */}
        {practice.instructions && practice.instructions.length > 0 && (
          <View className="mb-8">
            <Text variant="h3" className="mb-3">
              {t('practices.instructions', 'How to practice')}
            </Text>
            <Card>
              <CardContent className="p-4">
                <View className="gap-4">
                  {practice.instructions.map((instruction: string, index: number) => (
                    <View key={index} className="flex-row items-start">
                      <View className="bg-primary-100 rounded-full w-8 h-8 items-center justify-center mr-3">
                        <Text variant="body" className="text-primary-600 font-bold">
                          {index + 1}
                        </Text>
                      </View>
                      <Text variant="body" className="flex-1 text-gray-800 pt-1">
                        {instruction}
                      </Text>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Stats */}
        {(practice.completions || practice.avgRating) && (
          <View className="flex-row gap-3 mb-8">
            {practice.completions && (
              <Card className="flex-1">
                <CardContent className="p-3 items-center">
                  <Text variant="h3" className="text-primary-600 mb-1">
                    {practice.completions.toLocaleString()}
                  </Text>
                  <Text variant="caption" className="text-gray-600">
                    {t('practices.completions', 'Completions')}
                  </Text>
                </CardContent>
              </Card>
            )}
            {practice.avgRating && (
              <Card className="flex-1">
                <CardContent className="p-3 items-center">
                  <Text variant="h3" className="text-warning-600 mb-1">
                    {practice.avgRating.toFixed(1)} ⭐
                  </Text>
                  <Text variant="caption" className="text-gray-600">
                    {t('practices.rating', 'Rating')}
                  </Text>
                </CardContent>
              </Card>
            )}
          </View>
        )}

        {/* Prerequisites */}
        {practice.prerequisites && practice.prerequisites.length > 0 && (
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <Text variant="body" className="font-medium text-blue-900 mb-2">
                {t('practices.prerequisites', 'Prerequisites')}
              </Text>
              <Text variant="caption" className="text-blue-800">
                {practice.prerequisites.join(', ')}
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {practice.tags && practice.tags.length > 0 && (
          <View>
            <Text variant="h3" className="mb-3">
              {t('content.tags', 'Tags')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {practice.tags.map((tag: string, index: number) => (
                <View
                  key={index}
                  className="bg-gray-100 px-3 py-1.5 rounded-full"
                >
                  <Text variant="caption" className="text-gray-700">
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>

    {/* Guided Practice Session Modal */}
    <Modal
      visible={showSession}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        Alert.alert(
          t('practices.endSession', 'End Session?'),
          t('practices.endSessionConfirm', 'Are you sure you want to end this practice?'),
          [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            { text: t('practices.end', 'End'), onPress: handleEndSession, style: 'destructive' },
          ]
        );
      }}
    >
      <View className="flex-1 bg-primary-700 items-center justify-center px-8">
        {/* Close button */}
        <TouchableOpacity
          className="absolute top-14 right-6 p-2"
          onPress={() => {
            Alert.alert(
              t('practices.endSession', 'End Session?'),
              t('practices.endSessionConfirm', 'Are you sure you want to end this practice?'),
              [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                { text: t('practices.end', 'End'), onPress: handleEndSession, style: 'destructive' },
              ]
            );
          }}
        >
          <X size={28} color="#ffffff" />
        </TouchableOpacity>

        {/* Practice Title */}
        <Text variant="h3" className="text-white/80 mb-2 text-center">
          {practice?.title}
        </Text>

        {/* Timer */}
        <View className="my-8">
          <Text variant="h1" className="text-white text-center" style={{ fontSize: 72, fontVariant: ['tabular-nums'] }}>
            {formatTime(sessionTime)}
          </Text>
        </View>

        {/* Current Step Instruction */}
        {practice?.instructions && practice.instructions.length > 0 && (
          <View className="bg-white/15 rounded-2xl p-6 mb-8 w-full">
            <Text variant="caption" className="text-white/70 mb-2 text-center">
              {t('practices.step', 'Step')} {currentStep + 1} / {practice.instructions.length}
            </Text>
            <Text variant="body" className="text-white text-center text-lg leading-relaxed">
              {practice.instructions[currentStep]}
            </Text>
          </View>
        )}

        {/* Step Navigation */}
        {practice?.instructions && practice.instructions.length > 1 && (
          <View className="flex-row gap-4 mb-8">
            <TouchableOpacity
              className={`px-6 py-3 rounded-xl ${currentStep > 0 ? 'bg-white/20' : 'bg-white/5'}`}
              onPress={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <Text variant="body" className={currentStep > 0 ? 'text-white' : 'text-white/30'}>
                {t('common.previous', '← Previous')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-6 py-3 rounded-xl ${
                currentStep < practice.instructions.length - 1 ? 'bg-white/20' : 'bg-white/5'
              }`}
              onPress={() => setCurrentStep(Math.min(practice!.instructions.length - 1, currentStep + 1))}
              disabled={currentStep >= practice.instructions.length - 1}
            >
              <Text variant="body" className={
                currentStep < practice.instructions.length - 1 ? 'text-white' : 'text-white/30'
              }>
                {t('common.next', 'Next →')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timer Controls */}
        <View className="flex-row items-center gap-6">
          <TouchableOpacity
            className="bg-white/20 rounded-full p-4"
            onPress={() => {
              setSessionTime(0);
              setCurrentStep(0);
            }}
          >
            <RotateCcw size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white rounded-full p-6"
            onPress={() => setIsTimerRunning(!isTimerRunning)}
          >
            {isTimerRunning ? (
              <Pause size={32} color="#6366f1" />
            ) : (
              <Play size={32} color="#6366f1" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-success-500 rounded-full p-4"
            onPress={handleEndSession}
          >
            <CheckCircle size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Duration Target */}
        {practice?.duration && (
          <Text variant="caption" className="text-white/50 mt-6">
            {t('practices.targetDuration', 'Target')}: {practice.duration} {t('content.min', 'min')}
          </Text>
        )}
      </View>
    </Modal>
    </>
  );
}
