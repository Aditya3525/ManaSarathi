import { useState, useRef, useCallback, useMemo } from 'react';
import { View, ScrollView, Alert, Dimensions, Share, TouchableOpacity, Image, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Clock, Tag, Calendar, BookmarkPlus, BookmarkCheck, Share2, Play, Pause, ExternalLink } from 'lucide-react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as WebBrowser from 'expo-web-browser';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { LoadingSpinner as Loading } from '@/components/ui/Loading';
import { contentApi } from '@/services/api';
import { QUERY_KEYS, queryClient } from '@/config/queryClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * 0.5625; // 16:9 aspect ratio

// Detect YouTube URLs and extract video ID for thumbnail
const isYouTubeUrl = (url: string): boolean => {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
};

const getYouTubeThumbnail = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^?&#]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
};

export default function VideoDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const { data: video, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.content.video(id!),
    queryFn: () => contentApi.getVideoById(id!),
    enabled: !!id,
  });

  const isYouTube = useMemo(() => video?.videoUrl ? isYouTubeUrl(video.videoUrl) : false, [video?.videoUrl]);
  const ytThumbnail = useMemo(() => video?.videoUrl && isYouTube ? getYouTubeThumbnail(video.videoUrl) : null, [video?.videoUrl, isYouTube]);

  const handleOpenYouTube = useCallback(async () => {
    if (!video?.videoUrl) return;
    try {
      await WebBrowser.openBrowserAsync(video.videoUrl);
    } catch {
      // Fallback to external browser
      Linking.openURL(video.videoUrl);
    }
  }, [video?.videoUrl]);

  const bookmarkMutation = useMutation({
    mutationFn: () => contentApi.bookmarkContent(id!, 'video'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.content.video(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.content.bookmarks() });
    },
  });

  const handleShare = async () => {
    try {
      await Share.share({
        title: video?.title || '',
        message: `${video?.title}\n\n${video?.description || ''}\n\nWatch on MaanSarathi`,
      });
    } catch (error) {
      // User cancelled or share failed
    }
  };

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  }, [isPlaying]);

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

  if (error || !video) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text variant="h3" className="mb-2">
          {t('content.notFound', 'Video not found')}
        </Text>
        <Text variant="body" className="text-gray-600 mb-6 text-center">
          {t('content.videoNotFoundDescription', 'The video you are looking for could not be found')}
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          {t('common.goBack', 'Go Back')}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Video Player */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => isYouTube ? handleOpenYouTube() : setShowControls(!showControls)}
        style={{ height: VIDEO_HEIGHT }}
        className="bg-black"
      >
        {video.videoUrl && isYouTube ? (
          /* YouTube videos: show thumbnail with play button, open in browser */
          <View className="flex-1">
            <Image
              source={{ uri: ytThumbnail || video.thumbnailUrl || '' }}
              style={{ width: SCREEN_WIDTH, height: VIDEO_HEIGHT }}
              resizeMode="cover"
            />
            <View
              className="absolute inset-0 items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <View className="bg-red-600 rounded-2xl px-6 py-4 flex-row items-center">
                <Play size={28} color="#ffffff" />
                <Text variant="label" className="text-white ml-2">
                  {t('content.watchOnYouTube', 'Watch on YouTube')}
                </Text>
              </View>
            </View>
          </View>
        ) : video.videoUrl ? (
          <>
            <Video
              ref={videoRef}
              source={{ uri: video.videoUrl }}
              style={{ width: SCREEN_WIDTH, height: VIDEO_HEIGHT }}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              posterSource={video.thumbnailUrl ? { uri: video.thumbnailUrl } : undefined}
              usePoster={!!video.thumbnailUrl}
            />
            {showControls && (
              <TouchableOpacity
                onPress={togglePlayPause}
                className="absolute inset-0 items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <View className="bg-white/30 rounded-full p-4">
                  {isPlaying ? (
                    <Pause size={36} color="#ffffff" />
                  ) : (
                    <Play size={36} color="#ffffff" />
                  )}
                </View>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View className="flex-1 items-center justify-center">
            {video.thumbnailUrl ? (
              <Image
                source={{ uri: video.thumbnailUrl }}
                style={{ width: SCREEN_WIDTH, height: VIDEO_HEIGHT }}
                resizeMode="cover"
              />
            ) : (
              <View className="items-center">
                <View className="bg-white/20 rounded-full p-6 mb-4">
                  <Play size={48} color="#ffffff" />
                </View>
                <Text variant="body" className="text-white">
                  {t('content.videoUnavailable', 'Video unavailable')}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      <View className="px-6 py-8">
        {/* Meta Info */}
        <View className="flex-row flex-wrap gap-3 mb-4">
          {video.category && (
            <View className="flex-row items-center">
              <Tag size={16} color="#6b7280" />
              <Text variant="caption" className="ml-1 text-gray-600">
                {video.category}
              </Text>
            </View>
          )}
          {video.duration && (
            <View className="flex-row items-center">
              <Clock size={16} color="#6b7280" />
              <Text variant="caption" className="ml-1 text-gray-600">
                {video.duration}
              </Text>
            </View>
          )}
          {video.publishedAt && (
            <View className="flex-row items-center">
              <Calendar size={16} color="#6b7280" />
              <Text variant="caption" className="ml-1 text-gray-600">
                {new Date(video.publishedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text variant="h2" className="mb-4">
          {video.title}
        </Text>

        {/* Instructor */}
        {video.instructor && (
          <Text variant="body" className="text-gray-600 mb-6">
            {t('content.instructedBy', 'Instructed by')} {video.instructor}
          </Text>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-3 mb-6">
          <Button
            variant={video.isBookmarked ? 'primary' : 'outline'}
            size="sm"
            onPress={() => bookmarkMutation.mutate()}
            disabled={bookmarkMutation.isPending}
            leftIcon={
              video.isBookmarked ? (
                <BookmarkCheck size={18} color="#ffffff" />
              ) : (
                <BookmarkPlus size={18} color="#6366f1" />
              )
            }
          >
            {video.isBookmarked
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

        <Separator className="mb-6" />

        {/* Description */}
        <View className="mb-8">
          <Text variant="h3" className="mb-3">
            {t('content.about', 'About this video')}
          </Text>
          <Text variant="body" className="text-gray-800 leading-relaxed">
            {video.description}
          </Text>
        </View>

        {/* What You'll Learn */}
        {video.learningPoints && video.learningPoints.length > 0 && (
          <View className="mb-8">
            <Text variant="h3" className="mb-3">
              {t('content.whatYoullLearn', "What you'll learn")}
            </Text>
            <Card>
              <CardContent className="p-4">
                <View className="gap-3">
                  {video.learningPoints.map((point: string, index: number) => (
                    <View key={index} className="flex-row">
                      <Text variant="body" className="text-primary-600 mr-2">
                        •
                      </Text>
                      <Text variant="body" className="flex-1 text-gray-800">
                        {point}
                      </Text>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* Stats */}
        {(video.views || video.likes || video.completions) && (
          <View className="flex-row gap-3 mb-8">
            {video.views && (
              <Card className="flex-1">
                <CardContent className="p-3 items-center">
                  <Text variant="h3" className="text-primary-600 mb-1">
                    {video.views.toLocaleString()}
                  </Text>
                  <Text variant="caption" className="text-gray-600">
                    {t('content.views', 'Views')}
                  </Text>
                </CardContent>
              </Card>
            )}
            {video.completions && (
              <Card className="flex-1">
                <CardContent className="p-3 items-center">
                  <Text variant="h3" className="text-success-600 mb-1">
                    {video.completions.toLocaleString()}
                  </Text>
                  <Text variant="caption" className="text-gray-600">
                    {t('content.completed', 'Completed')}
                  </Text>
                </CardContent>
              </Card>
            )}
          </View>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <View>
            <Text variant="h3" className="mb-3">
              {t('content.tags', 'Tags')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {video.tags.map((tag: string, index: number) => (
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
  );
}
