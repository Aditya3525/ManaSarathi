import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Wind, Grid3X3, Palette, Puzzle, CircleDot, Sparkles,
  ArrowLeft, Gamepad2,
} from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';

interface GameInfo {
  id: string;
  route: string;
  icon: any;
  color: string;
  bgColor: string;
  category: string;
}

export default function GamesHubScreen() {
  const { t } = useTranslation();

  const games: GameInfo[] = [
    {
      id: 'breathing',
      route: '/games/breathing',
      icon: Wind,
      color: '#06b6d4',
      bgColor: '#ecfeff',
      category: t('games.relaxation', 'Relaxation'),
    },
    {
      id: 'memory-match',
      route: '/games/memory-match',
      icon: Grid3X3,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
      category: t('games.cognitive', 'Cognitive'),
    },
    {
      id: 'mood-colors',
      route: '/games/mood-colors',
      icon: Palette,
      color: '#ec4899',
      bgColor: '#fdf2f8',
      category: t('games.emotional', 'Emotional'),
    },
    {
      id: 'gratitude-puzzle',
      route: '/games/gratitude-puzzle',
      icon: Puzzle,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      category: t('games.mood', 'Mood'),
    },
    {
      id: 'anxiety-pop',
      route: '/games/anxiety-pop',
      icon: CircleDot,
      color: '#10b981',
      bgColor: '#d1fae5',
      category: t('games.relaxation', 'Relaxation'),
    },
    {
      id: 'mindful-patterns',
      route: '/games/mindful-patterns',
      icon: Sparkles,
      color: '#6366f1',
      bgColor: '#eef2ff',
      category: t('games.cognitive', 'Cognitive'),
    },
  ];

  const gameNames: Record<string, string> = {
    breathing: t('games.breathingTitle', 'Breathing Rhythm'),
    'memory-match': t('games.memoryTitle', 'Wellness Memory Match'),
    'mood-colors': t('games.moodColorsTitle', 'Mood Color Matcher'),
    'gratitude-puzzle': t('games.gratitudeTitle', 'Gratitude Puzzle'),
    'anxiety-pop': t('games.anxietyTitle', 'Anxiety Relief Pop'),
    'mindful-patterns': t('games.patternsTitle', 'Mindful Patterns'),
  };

  const gameDescs: Record<string, string> = {
    breathing: t('games.breathingDesc', 'Practice box breathing, 4-7-8, and calm breath patterns'),
    'memory-match': t('games.memoryDesc', 'Match cards with positive affirmations and coping strategies'),
    'mood-colors': t('games.moodColorsDesc', 'Connect emotions with colors for emotional awareness'),
    'gratitude-puzzle': t('games.gratitudeDesc', 'Complete puzzles by expressing what you\'re grateful for'),
    'anxiety-pop': t('games.anxietyDesc', 'Pop bubbles with anxious thoughts, replace with calm ones'),
    'mindful-patterns': t('games.patternsDesc', 'Recognize calming patterns to train your focus'),
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-200">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Gamepad2 size={28} color="#6366f1" />
          <Text variant="h2" className="ml-2">{t('games.title', 'Wellness Games')}</Text>
        </View>
        <Text variant="body" className="text-gray-600 ml-10">
          {t('games.subtitle', 'Fun activities for your mental wellbeing')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        <View className="gap-3 mb-8">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <TouchableOpacity
                key={game.id}
                onPress={() => router.push(game.route as any)}
                activeOpacity={0.7}
              >
                <Card>
                  <CardContent className="p-4 flex-row items-center">
                    <View className="rounded-2xl p-4 mr-4" style={{ backgroundColor: game.bgColor }}>
                      <Icon size={32} color={game.color} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text variant="label">{gameNames[game.id]}</Text>
                        <View className="bg-gray-100 px-2 py-0.5 rounded-full ml-2">
                          <Text variant="caption" className="text-gray-600">{game.category}</Text>
                        </View>
                      </View>
                      <Text variant="caption" className="text-gray-600" numberOfLines={2}>
                        {gameDescs[game.id]}
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
