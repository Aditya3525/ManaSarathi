import { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Star,
  Clock,
  AlertTriangle,
  Phone,
  Filter,
  BookOpen,
  Brain,
  Heart,
  Sparkles,
  Target,
  Leaf,
  Zap,
} from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { recommendationsApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';
import type { EnhancedRecommendationItem, EnhancedRecommendationResult, CrisisLevel } from '@/types';

// ── Filter Types ──────────────────────────────────────────────────────────────
type ApproachFilter = 'all' | 'western' | 'eastern' | 'hybrid';
type CategoryFilter = 'all' | 'anxiety' | 'depression' | 'stress' | 'mindfulness' | 'sleep' | 'self-care';

const APPROACH_OPTIONS: { value: ApproachFilter; labelKey: string; fallback: string }[] = [
  { value: 'all', labelKey: 'recommendations.allApproaches', fallback: 'All' },
  { value: 'western', labelKey: 'recommendations.western', fallback: 'Western' },
  { value: 'eastern', labelKey: 'recommendations.eastern', fallback: 'Eastern' },
  { value: 'hybrid', labelKey: 'recommendations.hybrid', fallback: 'Hybrid' },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; labelKey: string; fallback: string; icon: typeof Brain }[] = [
  { value: 'all', labelKey: 'recommendations.allCategories', fallback: 'All', icon: Sparkles },
  { value: 'anxiety', labelKey: 'recommendations.anxiety', fallback: 'Anxiety', icon: Brain },
  { value: 'depression', labelKey: 'recommendations.depression', fallback: 'Depression', icon: Heart },
  { value: 'stress', labelKey: 'recommendations.stress', fallback: 'Stress', icon: Zap },
  { value: 'mindfulness', labelKey: 'recommendations.mindfulness', fallback: 'Mindfulness', icon: Leaf },
  { value: 'sleep', labelKey: 'recommendations.sleep', fallback: 'Sleep', icon: Target },
  { value: 'self-care', labelKey: 'recommendations.selfCare', fallback: 'Self-Care', icon: Star },
];

// ── Recommendation Card ───────────────────────────────────────────────────────
function RecommendationCard({
  item,
  t,
  onPress,
}: {
  item: EnhancedRecommendationItem;
  t: ReturnType<typeof useTranslation>['t'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <Card className="mb-3">
        <CardContent className="p-4">
          <View className="flex-row">
            {/* Thumbnail */}
            {item.thumbnailUrl ? (
              <Image
                source={{ uri: item.thumbnailUrl }}
                className="w-16 h-16 rounded-lg mr-3"
                resizeMode="cover"
              />
            ) : (
              <View className="w-16 h-16 rounded-lg mr-3 bg-primary-100 items-center justify-center">
                <BookOpen size={24} color="#6366f1" />
              </View>
            )}

            {/* Details */}
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text variant="label" className="flex-1" numberOfLines={1}>
                  {item.title}
                </Text>
                {item.immediateRelief && (
                  <View className="bg-green-100 px-2 py-0.5 rounded-full ml-2">
                    <Text variant="caption" className="text-green-700">
                      {t('recommendations.quickRelief', 'Quick Relief')}
                    </Text>
                  </View>
                )}
              </View>

              {item.description && (
                <Text variant="caption" className="text-gray-600 mb-1" numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {/* Reason */}
              {item.reason && (
                <Text variant="caption" className="text-primary-600 italic mb-2" numberOfLines={1}>
                  {item.reason}
                </Text>
              )}

              {/* Meta Row */}
              <View className="flex-row items-center gap-3">
                {item.duration && (
                  <View className="flex-row items-center">
                    <Clock size={12} color="#6b7280" />
                    <Text variant="caption" className="text-gray-500 ml-1">
                      {item.duration} {t('content.min', 'min')}
                    </Text>
                  </View>
                )}
                {item.effectiveness != null && item.effectiveness > 0 && (
                  <View className="flex-row items-center">
                    <Star size={12} color="#eab308" />
                    <Text variant="caption" className="text-gray-500 ml-1">
                      {item.effectiveness.toFixed(1)}
                    </Text>
                  </View>
                )}
                {item.approach && (
                  <View className={`px-2 py-0.5 rounded-full ${
                    item.approach === 'eastern' ? 'bg-amber-100' :
                    item.approach === 'western' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    <Text variant="caption" className={
                      item.approach === 'eastern' ? 'text-amber-700' :
                      item.approach === 'western' ? 'text-blue-700' : 'text-purple-700'
                    }>
                      {item.approach}
                    </Text>
                  </View>
                )}
                {item.category && (
                  <View className="px-2 py-0.5 rounded-full bg-gray-100">
                    <Text variant="caption" className="text-gray-600">
                      {item.category}
                    </Text>
                  </View>
                )}
              </View>

              {/* Focus Areas / Tags */}
              {item.focusAreas && item.focusAreas.length > 0 && (
                <View className="flex-row flex-wrap gap-1 mt-2">
                  {item.focusAreas.slice(0, 3).map((area, i) => (
                    <View key={i} className="bg-indigo-50 px-2 py-0.5 rounded-full">
                      <Text variant="caption" className="text-indigo-600">{area}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
}

// ── Crisis Banner ─────────────────────────────────────────────────────────────
function CrisisBanner({
  crisisLevel,
  t,
}: {
  crisisLevel: CrisisLevel;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  if (crisisLevel === 'NONE' || crisisLevel === 'LOW') return null;

  const isHigh = crisisLevel === 'HIGH' || crisisLevel === 'CRITICAL';

  return (
    <Card className={`mb-4 ${isHigh ? 'border-red-400 bg-red-50' : 'border-amber-400 bg-amber-50'}`}>
      <CardContent className="p-4">
        <View className="flex-row items-center mb-2">
          <AlertTriangle size={20} color={isHigh ? '#dc2626' : '#d97706'} />
          <Text variant="label" className={`ml-2 ${isHigh ? 'text-red-700' : 'text-amber-700'}`}>
            {isHigh
              ? t('recommendations.crisisHighTitle', 'Immediate Support Available')
              : t('recommendations.crisisModTitle', 'We noticed you may need support')}
          </Text>
        </View>
        <Text variant="caption" className={`mb-3 ${isHigh ? 'text-red-600' : 'text-amber-600'}`}>
          {isHigh
            ? t('recommendations.crisisHighDesc', 'If you are in immediate danger, please reach out for help right away.')
            : t('recommendations.crisisModDesc', 'Consider reaching out to a professional or trusted person.')}
        </Text>
        <View className="flex-row gap-2">
          <Button
            variant={isHigh ? 'danger' : 'secondary'}
            size="sm"
            leftIcon={<Phone size={14} color={isHigh ? '#ffffff' : '#6b7280'} />}
            onPress={() => router.push('/help-safety' as any)}
          >
            {t('recommendations.getHelp', 'Help & Safety')}
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

// ── Filter Pill ───────────────────────────────────────────────────────────────
function FilterPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <View className={`px-4 py-2 rounded-full mr-2 ${selected ? 'bg-primary-600' : 'bg-gray-100'}`}>
        <Text variant="caption" className={`font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecommendationsScreen() {
  const { t } = useTranslation();
  const [approachFilter, setApproachFilter] = useState<ApproachFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const {
    data: result,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.recommendations.personalized(),
    queryFn: async () => {
      const res = await recommendationsApi.getPersonalized();
      return res.data as EnhancedRecommendationResult;
    },
  });

  const filteredItems = useMemo(() => {
    if (!result?.items) return [];
    return result.items.filter((item) => {
      if (approachFilter !== 'all' && item.approach !== approachFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [result?.items, approachFilter, categoryFilter]);

  const handleItemPress = useCallback((item: EnhancedRecommendationItem) => {
    if (item.id && (item.type === 'content' || item.type === 'practice')) {
      router.push(`/content/practice/${item.id}` as any);
    }
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <LoadingSpinner size="large" message={t('recommendations.loading', 'Loading recommendations...')} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-gray-50">
        <Stack.Screen options={{ headerShown: false }} />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-6 pt-12 pb-8">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3"
              accessibilityRole="button"
              accessibilityLabel={t('common.back', 'Go back')}
            >
              <ArrowLeft size={24} color="#374151" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text variant="h2" accessibilityRole="header">
                {t('recommendations.title', 'Recommended For You')}
              </Text>
              <Text variant="caption" className="text-gray-600">
                {t('recommendations.subtitle', 'Personalized content based on your wellness journey')}
              </Text>
            </View>
          </View>

          {/* Crisis Banner */}
          {result?.crisisLevel && (
            <CrisisBanner crisisLevel={result.crisisLevel} t={t} />
          )}

          {/* Rationale */}
          {result?.rationale && (
            <Card className="mb-4 bg-indigo-50 border-indigo-200">
              <CardContent className="p-4">
                <View className="flex-row items-center mb-1">
                  <Sparkles size={16} color="#6366f1" />
                  <Text variant="label" className="ml-2 text-indigo-700">
                    {t('recommendations.whyThese', 'Why these recommendations?')}
                  </Text>
                </View>
                <Text variant="caption" className="text-indigo-600">
                  {result.rationale}
                </Text>
              </CardContent>
            </Card>
          )}

          {/* Focus Areas */}
          {result?.focusAreas && result.focusAreas.length > 0 && (
            <View className="mb-4">
              <Text variant="caption" className="text-gray-500 mb-2">
                {t('recommendations.focusAreas', 'Focus Areas')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {result.focusAreas.map((area, i) => (
                  <View key={i} className="bg-purple-100 px-3 py-1 rounded-full">
                    <Text variant="caption" className="text-purple-700 font-medium">{area}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Approach Filters */}
          <View className="mb-3">
            <View className="flex-row items-center mb-2">
              <Filter size={14} color="#6b7280" />
              <Text variant="caption" className="ml-1 text-gray-500">
                {t('recommendations.approach', 'Approach')}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {APPROACH_OPTIONS.map((opt) => (
                  <FilterPill
                    key={opt.value}
                    label={t(opt.labelKey, opt.fallback)}
                    selected={approachFilter === opt.value}
                    onPress={() => setApproachFilter(opt.value)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Category Filters */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <Filter size={14} color="#6b7280" />
              <Text variant="caption" className="ml-1 text-gray-500">
                {t('recommendations.category', 'Category')}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {CATEGORY_OPTIONS.map((opt) => (
                  <FilterPill
                    key={opt.value}
                    label={t(opt.labelKey, opt.fallback)}
                    selected={categoryFilter === opt.value}
                    onPress={() => setCategoryFilter(opt.value)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Results Count */}
          <View className="flex-row items-center justify-between mb-3">
            <Text variant="caption" className="text-gray-500">
              {filteredItems.length} {t('recommendations.results', 'recommendations')}
            </Text>
            {(approachFilter !== 'all' || categoryFilter !== 'all') && (
              <TouchableOpacity
                onPress={() => { setApproachFilter('all'); setCategoryFilter('all'); }}
                accessibilityRole="button"
                accessibilityLabel={t('recommendations.clearFilters', 'Clear filters')}
              >
                <Text variant="caption" className="text-primary-600 font-medium">
                  {t('recommendations.clearFilters', 'Clear filters')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Recommendation Cards */}
          {filteredItems.length > 0 ? (
            <View>
              {filteredItems.map((item, index) => (
                <RecommendationCard
                  key={item.id ?? index}
                  item={item}
                  t={t}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </View>
          ) : (
            <Card>
              <CardContent className="items-center py-12">
                <Sparkles size={48} color="#d1d5db" />
                <Text variant="body" className="text-gray-500 mt-4 text-center">
                  {result?.items?.length === 0
                    ? t('recommendations.noResults', 'No recommendations yet. Complete an assessment to get started!')
                    : t('recommendations.noFilterMatch', 'No recommendations match your filters.')}
                </Text>
                {result?.items && result.items.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onPress={() => { setApproachFilter('all'); setCategoryFilter('all'); }}
                  >
                    {t('recommendations.showAll', 'Show All')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fallback Notice */}
          {result?.fallbackUsed && result.fallbackMessage && (
            <View className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <Text variant="caption" className="text-amber-700">
                ℹ️ {result.fallbackMessage}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
