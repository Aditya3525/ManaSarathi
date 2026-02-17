import { View, ScrollView, Linking, Alert, Dimensions, Image, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Clock, Tag, Calendar, BookmarkPlus, BookmarkCheck, Share2, ExternalLink } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { LoadingSpinner as Loading } from '@/components/ui/Loading';
import { contentApi } from '@/services/api';
import { QUERY_KEYS, queryClient } from '@/config/queryClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.6;

export default function ArticleDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: article, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.content.article(id!),
    queryFn: () => contentApi.getArticleById(id!),
    enabled: !!id,
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => contentApi.bookmarkContent(id!, 'article'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.content.article(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.content.bookmarks() });
    },
  });

  const handleShare = async () => {
    try {
      await Share.share({
        title: article?.title || '',
        message: `${article?.title}\n\n${article?.summary || article?.description || ''}\n\nRead more on MaanSarathi`,
      });
    } catch (error) {
      // User cancelled or share failed
    }
  };

  const handleOpenExternal = () => {
    if (article?.externalUrl) {
      Linking.openURL(article.externalUrl);
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

  if (error || !article) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text variant="h3" className="mb-2">
          {t('content.notFound', 'Article not found')}
        </Text>
        <Text variant="body" className="text-gray-600 mb-6 text-center">
          {t('content.notFoundDescription', 'The article you are looking for could not be found')}
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          {t('common.goBack', 'Go Back')}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Hero Image */}
      {article.imageUrl && (
        <View style={{ height: IMAGE_HEIGHT }}>
          <Image 
            source={{ uri: article.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      )}

      <View className="px-6 py-8">
        {/* Meta Info */}
        <View className="flex-row flex-wrap gap-3 mb-4">
          {article.category && (
            <View className="flex-row items-center">
              <Tag size={16} color="#6b7280" />
              <Text variant="caption" className="ml-1 text-gray-600">
                {article.category}
              </Text>
            </View>
          )}
          {article.readTime && (
            <View className="flex-row items-center">
              <Clock size={16} color="#6b7280" />
              <Text variant="caption" className="ml-1 text-gray-600">
                {article.readTime} {t('content.minRead', 'min read')}
              </Text>
            </View>
          )}
          {article.publishedAt && (
            <View className="flex-row items-center">
              <Calendar size={16} color="#6b7280" />
              <Text variant="caption" className="ml-1 text-gray-600">
                {new Date(article.publishedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text variant="h1" className="mb-4">
          {article.title}
        </Text>

        {/* Author */}
        {article.author && (
          <Text variant="body" className="text-gray-600 mb-6">
            {t('content.by', 'By')} {article.author}
          </Text>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-3 mb-6">
          <Button
            variant={article.isBookmarked ? 'primary' : 'outline'}
            size="sm"
            onPress={() => bookmarkMutation.mutate()}
            disabled={bookmarkMutation.isPending}
            leftIcon={
              article.isBookmarked ? (
                <BookmarkCheck size={18} color="#ffffff" />
              ) : (
                <BookmarkPlus size={18} color="#6366f1" />
              )
            }
          >
            {article.isBookmarked
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
          {article.externalUrl && (
            <Button
              variant="ghost"
              size="sm"
              onPress={handleOpenExternal}
              leftIcon={<ExternalLink size={18} color="#6b7280" />}
            >
              {t('content.openExternal', 'Open')}
            </Button>
          )}
        </View>

        <Separator className="mb-6" />

        {/* Content */}
        <View className="mb-8">
          {article.summary && (
            <Card className="mb-6 bg-primary-50 border-primary-200">
              <CardContent className="p-4">
                <Text variant="body" className="text-primary-900 font-medium mb-2">
                  {t('content.summary', 'Summary')}
                </Text>
                <Text variant="body" className="text-primary-800">
                  {article.summary}
                </Text>
              </CardContent>
            </Card>
          )}

          <Text variant="body" className="text-gray-800 leading-relaxed">
            {article.content || article.description}
          </Text>
        </View>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <View className="mb-8">
            <Text variant="h3" className="mb-3">
              {t('content.tags', 'Tags')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {article.tags.map((tag: string, index: number) => (
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

        {/* Related Articles */}
        {article.relatedArticles && article.relatedArticles.length > 0 && (
          <View>
            <Text variant="h3" className="mb-3">
              {t('content.relatedArticles', 'Related Articles')}
            </Text>
            <View className="gap-3">
              {article.relatedArticles.slice(0, 3).map((related: any) => (
                <Card key={related.id}>
                  <CardContent className="p-4">
                    <Text variant="body" className="font-medium mb-1">
                      {related.title}
                    </Text>
                    <Text variant="caption" className="text-gray-600">
                      {related.readTime} {t('content.minRead', 'min read')}
                    </Text>
                  </CardContent>
                </Card>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
