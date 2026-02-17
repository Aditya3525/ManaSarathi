import { useState, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, TextInput as RNTextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw, Trophy, Check, Puzzle } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';

const PROMPTS = [
  'Something that made me smile today',
  'A person I appreciate',
  'A skill or ability I have',
  'A place that makes me happy',
  'Something I am looking forward to',
  'A challenge I overcame',
  'Something beautiful I noticed today',
  'A memory that makes me happy',
  'Something about my body I appreciate',
  'An act of kindness I experienced',
];

export default function GratitudePuzzleGame() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const shuffledPrompts = useState(() => {
    return [...PROMPTS].sort(() => Math.random() - 0.5).slice(0, 5);
  })[0];

  const handleSubmit = useCallback(() => {
    if (!currentAnswer.trim()) return;

    const newAnswers = [...answers, currentAnswer.trim()];
    setAnswers(newAnswers);
    setCurrentAnswer('');

    if (currentIndex + 1 >= shuffledPrompts.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [currentAnswer, answers, currentIndex, shuffledPrompts.length]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setAnswers([]);
    setCurrentAnswer('');
    setIsComplete(false);
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-amber-500 px-6 pt-12 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white">{t('games.gratitudeTitle', 'Gratitude Puzzle')}</Text>
        <TouchableOpacity onPress={restart}>
          <RotateCcw size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View className="px-6 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          <Text variant="caption" className="text-gray-500">
            {t('games.prompt', 'Prompt')} {Math.min(currentIndex + 1, shuffledPrompts.length)}/{shuffledPrompts.length}
          </Text>
          <Text variant="caption" className="text-gray-500">
            {answers.length} {t('games.completed', 'completed')}
          </Text>
        </View>
        <View className="bg-gray-200 rounded-full h-2">
          <View
            className="bg-amber-500 rounded-full h-2"
            style={{ width: `${(answers.length / shuffledPrompts.length) * 100}%` }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {isComplete ? (
          <View className="items-center py-8">
            <Trophy size={64} color="#f59e0b" />
            <Text variant="h2" className="mt-4 mb-2">{t('games.gratitudeComplete', 'Beautiful! 🙏')}</Text>
            <Text variant="body" className="text-gray-600 text-center mb-6">
              {t('games.gratitudeMessage', 'You found gratitude in your day. Here are your reflections:')}
            </Text>

            <View className="w-full gap-3 mb-8">
              {shuffledPrompts.map((prompt, i) => (
                <Card key={i} className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <Text variant="caption" className="text-amber-700 mb-1">{prompt}</Text>
                    <Text variant="body" className="text-amber-900">{answers[i]}</Text>
                  </CardContent>
                </Card>
              ))}
            </View>

            <TouchableOpacity onPress={restart} className="bg-amber-500 px-8 py-3 rounded-2xl">
              <Text variant="label" className="text-white">{t('games.playAgain', 'Play Again')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Puzzle Piece Visual */}
            <View className="items-center mb-6">
              <View className="bg-amber-100 rounded-full p-6">
                <Puzzle size={48} color="#f59e0b" />
              </View>
            </View>

            {/* Current Prompt */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <Text variant="h3" className="text-center text-gray-800 leading-relaxed">
                  {shuffledPrompts[currentIndex]}
                </Text>
              </CardContent>
            </Card>

            {/* Answer Input */}
            <View className="bg-white rounded-2xl px-4 py-3 border border-gray-200 mb-4">
              <RNTextInput
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
                placeholder={t('games.typeGratitude', 'What comes to mind...')}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="text-base text-gray-900"
                style={{ minHeight: 80 }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!currentAnswer.trim()}
              className={`flex-row items-center justify-center py-3 rounded-2xl ${
                currentAnswer.trim() ? 'bg-amber-500' : 'bg-gray-300'
              }`}
            >
              <Check size={20} color="#ffffff" />
              <Text variant="label" className="text-white ml-2">
                {currentIndex + 1 >= shuffledPrompts.length
                  ? t('games.finish', 'Finish')
                  : t('games.next', 'Next Prompt')}
              </Text>
            </TouchableOpacity>

            {/* Previous answers */}
            {answers.length > 0 && (
              <View className="mt-6">
                <Text variant="caption" className="text-gray-500 mb-2">
                  {t('games.previousAnswers', 'Your gratitude so far:')}
                </Text>
                {answers.map((ans, i) => (
                  <View key={i} className="flex-row items-center mb-2">
                    <View className="bg-amber-400 rounded-full w-6 h-6 items-center justify-center mr-2">
                      <Text variant="caption" className="text-white font-bold">{i + 1}</Text>
                    </View>
                    <Text variant="body" className="text-gray-700 flex-1" numberOfLines={1}>{ans}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
