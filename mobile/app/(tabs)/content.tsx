import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, TextInput as RNTextInput, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Video, FileText, Headphones, Search, Filter, ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/ErrorState';
import { contentApi, practicesApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';

type ContentTab = 'articles' | 'videos' | 'practices';

export default function ContentScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ContentTab>('articles');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: articles, isLoading: articlesLoading, isError: articlesError, refetch: refetchArticles, isRefetching: articlesRefetching } = useQuery({
    queryKey: queryKeys.content.list({ type: 'article' }),
    queryFn: async () => {
      const response = await contentApi.getContent({ type: 'article' });
      return response.data || [];
    },
    enabled: activeTab === 'articles',
  });

  const { data: videos, isLoading: videosLoading, isError: videosError, refetch: refetchVideos, isRefetching: videosRefetching } = useQuery({
    queryKey: queryKeys.content.list({ type: 'video' }),
    queryFn: async () => {
      const response = await contentApi.getContent({ type: 'video' });
      return response.data || [];
    },
    enabled: activeTab === 'videos',
  });

  const { data: practices, isLoading: practicesLoading, isError: practicesError, refetch: refetchPractices, isRefetching: practicesRefetching } = useQuery({
    queryKey: queryKeys.practices.list(),
    queryFn: async () => {
      const response = await practicesApi.getPractices();
      return response.data || [];
    },
    enabled: activeTab === 'practices',
  });

  const tabs = [
    { id: 'articles' as ContentTab, label: t('content.articles', 'Articles'), icon: FileText },
    { id: 'videos' as ContentTab, label: t('content.videos', 'Videos'), icon: Video },
    { id: 'practices' as ContentTab, label: t('content.practices', 'Practices'), icon: Headphones },
  ];

  const isLoading = articlesLoading || videosLoading || practicesLoading;
  const isRefetching = articlesRefetching || videosRefetching || practicesRefetching;
  const hasError = articlesError || videosError || practicesError;
  
  const currentData = 
    activeTab === 'articles' ? articles :
    activeTab === 'videos' ? videos :
    practices;

  const filteredData = currentData?.filter((item: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.tags?.some((tag: string) => tag.toLowerCase().includes(query))
    );
  });

  const handleRefresh = () => {
    if (activeTab === 'articles') refetchArticles();
    else if (activeTab === 'videos') refetchVideos();
    else refetchPractices();
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return Video;
      case 'audio':
        return Headphones;
      default:
        return FileText;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-4">
        <Text variant="h2" className="mb-4">
          {t('content.title', 'Content Library')}
        </Text>

        {/* Search */}
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3 mb-4">
          <Search size={20} color="#9ca3af" />
          <RNTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('content.search', 'Search content...')}
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 text-base text-gray-900"
          />
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`flex-row items-center px-4 py-2 rounded-full mr-2 ${
                  isActive ? 'bg-primary-600' : 'bg-gray-100'
                }`}
                activeOpacity={0.7}
              >
                <IconComponent
                  size={16}
                  color={isActive ? '#ffffff' : '#6b7280'}
                />
                <Text
                  variant="caption"
                  className={`ml-2 font-semibold ${
                    isActive ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content List */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 py-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-12">
            <LoadingSpinner size="large" />
          </View>
        ) : hasError ? (
          <ErrorState compact onRetry={handleRefresh} />
        ) : filteredData && filteredData.length > 0 ? (
          <View className="gap-3">
            {filteredData.map((item: any) => {
              const TypeIcon = getTypeIcon(item.type || activeTab);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    // Navigate to appropriate detail screen based on content type
                    if (activeTab === 'articles') {
                      router.push(`/content/article/${item.id}` as any);
                    } else if (activeTab === 'videos') {
                      router.push(`/content/video/${item.id}` as any);
                    } else if (activeTab === 'practices') {
                      router.push(`/content/practice/${item.id}` as any);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Card>
                    <CardContent className="p-4">
                      <View className="flex-row">
                        {item.thumbnail ? (
                          <Image
                            source={{ uri: item.thumbnail }}
                            className="w-20 h-20 rounded-lg mr-3"
                            style={{ backgroundColor: '#e5e7eb' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-20 h-20 bg-primary-100 rounded-lg mr-3 items-center justify-center">
                            <TypeIcon size={32} color="#6366f1" />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text variant="label" className="mb-1" numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text variant="caption" className="text-gray-600 mb-2" numberOfLines={2}>
                            {item.description}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            {item.duration && (
                              <Badge variant="default" size="sm">
                                {item.duration}
                              </Badge>
                            )}
                            {item.difficulty && (
                              <Badge 
                                variant={
                                  item.difficulty === 'beginner' ? 'success' :
                                  item.difficulty === 'intermediate' ? 'warning' :
                                  'danger'
                                }
                                size="sm"
                              >
                                {item.difficulty}
                              </Badge>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={20} color="#9ca3af" />
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Card className="p-8">
            <View className="items-center">
              <BookOpen size={48} color="#d1d5db" />
              <Text variant="body" className="text-gray-600 mt-4 text-center">
                {searchQuery
                  ? t('content.noResults', 'No content found')
                  : t('content.noContent', 'No content available')}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
