import { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';

const EMOTIONS = [
  { id: 1, emotion: 'Joy', emoji: '😊', color: '#fbbf24', colorName: 'Yellow' },
  { id: 2, emotion: 'Calm', emoji: '😌', color: '#60a5fa', colorName: 'Blue' },
  { id: 3, emotion: 'Love', emoji: '🥰', color: '#f472b6', colorName: 'Pink' },
  { id: 4, emotion: 'Energy', emoji: '⚡', color: '#f97316', colorName: 'Orange' },
  { id: 5, emotion: 'Growth', emoji: '🌱', color: '#34d399', colorName: 'Green' },
  { id: 6, emotion: 'Peace', emoji: '🕊️', color: '#c4b5fd', colorName: 'Lavender' },
];

interface RoundState {
  emotion: typeof EMOTIONS[0];
  options: string[];
  correctIndex: number;
}

export default function MoodColorsGame() {
  const { t } = useTranslation();
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [isComplete, setIsComplete] = useState(false);
  const [currentRound, setCurrentRound] = useState<RoundState | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const generateRound = useCallback(() => {
    const emotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
    const correctColor = emotion.color;

    // Pick 3 wrong colors
    const otherColors = EMOTIONS
      .filter(e => e.id !== emotion.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(e => e.color);

    const options = [...otherColors, correctColor].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(correctColor);

    setCurrentRound({ emotion, options, correctIndex });
    setFeedback(null);
  }, []);

  // Initialize first round
  useEffect(() => {
    generateRound();
  }, []);

  const handleColorSelect = useCallback((index: number) => {
    if (!currentRound || feedback) return;

    if (index === currentRound.correctIndex) {
      setFeedback('correct');
      setScore(s => s + 1);
    } else {
      setFeedback('wrong');
    }

    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= totalRounds) {
        setIsComplete(true);
      } else {
        setRound(nextRound);
        generateRound();
      }
    }, 800);
  }, [currentRound, feedback, round, totalRounds, generateRound]);

  const restart = useCallback(() => {
    setScore(0);
    setRound(0);
    setIsComplete(false);
    setFeedback(null);
    generateRound();
  }, [generateRound]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-pink-600 px-6 pt-12 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white">{t('games.moodColorsTitle', 'Mood Colors')}</Text>
        <TouchableOpacity onPress={restart}>
          <RotateCcw size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View className="flex-row justify-around px-6 py-3 bg-white border-b border-gray-200">
        <View className="items-center">
          <Text variant="h3" className="text-pink-600">{score}</Text>
          <Text variant="caption" className="text-gray-500">{t('games.score', 'Score')}</Text>
        </View>
        <View className="items-center">
          <Text variant="h3" className="text-pink-600">{round + 1}/{totalRounds}</Text>
          <Text variant="caption" className="text-gray-500">{t('games.round', 'Round')}</Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        {isComplete ? (
          <View className="items-center">
            <Trophy size={64} color="#f59e0b" />
            <Text variant="h2" className="mt-4 mb-2">{t('games.wellDone', 'Well Done! 🎨')}</Text>
            <Text variant="body" className="text-gray-600 text-center mb-1">
              {t('games.finalScore', 'Score')}: {score}/{totalRounds}
            </Text>
            <Text variant="body" className="text-gray-500 text-center mb-6">
              {score >= totalRounds * 0.8
                ? t('games.emotionalAwareness', 'Great emotional awareness!')
                : t('games.keepPracticing', 'Keep exploring your emotions!')}
            </Text>
            <TouchableOpacity onPress={restart} className="bg-pink-600 px-8 py-3 rounded-2xl">
              <Text variant="label" className="text-white">{t('games.playAgain', 'Play Again')}</Text>
            </TouchableOpacity>
          </View>
        ) : currentRound ? (
          <View className="items-center w-full">
            {/* Emotion Display */}
            <Text style={{ fontSize: 64 }} className="mb-2">{currentRound.emotion.emoji}</Text>
            <Text variant="h2" className="mb-2">{currentRound.emotion.emotion}</Text>
            <Text variant="body" className="text-gray-600 mb-8">
              {t('games.pickColor', 'Which color matches this emotion?')}
            </Text>

            {/* Color Options */}
            <View className="flex-row flex-wrap justify-center gap-4">
              {currentRound.options.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleColorSelect(index)}
                  disabled={feedback !== null}
                  activeOpacity={0.7}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: color,
                    borderWidth: feedback !== null
                      ? index === currentRound.correctIndex ? 4 : feedback === 'wrong' ? 2 : 0
                      : 0,
                    borderColor: feedback !== null && index === currentRound.correctIndex
                      ? '#10b981'
                      : '#ef4444',
                    opacity: feedback === 'wrong' && index !== currentRound.correctIndex ? 0.4 : 1,
                  }}
                />
              ))}
            </View>

            {/* Feedback */}
            {feedback && (
              <View className="mt-6">
                <Text variant="label" className={`text-center ${feedback === 'correct' ? 'text-success-600' : 'text-danger-600'}`}>
                  {feedback === 'correct'
                    ? t('games.correct', '✓ Correct!')
                    : `✗ ${t('games.itWas', 'It was')} ${currentRound.emotion.colorName}`}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
