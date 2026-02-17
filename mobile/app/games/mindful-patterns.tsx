import { useState, useCallback, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Alert, Animated } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw, Trophy, Eye } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';

const PATTERNS = [
  { id: 1, sequence: ['🔵', '🟢', '🔵', '🟢'], label: 'Alternating' },
  { id: 2, sequence: ['🔴', '🔴', '🟡', '🟡'], label: 'Pairs' },
  { id: 3, sequence: ['🟣', '🔵', '🟢', '🟡'], label: 'Rainbow' },
  { id: 4, sequence: ['⭐', '🌙', '⭐', '🌙'], label: 'Day & Night' },
  { id: 5, sequence: ['🌊', '🌊', '🌊', '🏖️'], label: 'Waves' },
  { id: 6, sequence: ['🌸', '🌺', '🌸', '🌺'], label: 'Garden' },
];

interface Round {
  pattern: typeof PATTERNS[0];
  options: string[];
  correctIndex: number;
  nextSymbol: string;
}

export default function MindfulPatternsGame() {
  const { t } = useTranslation();
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalRounds] = useState(12);
  const [isComplete, setIsComplete] = useState(false);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showPattern, setShowPattern] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const generateRound = useCallback(() => {
    const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    const nextSymbol = pattern.sequence[0]; // Pattern repeats, so next is first

    // Generate wrong options from other patterns
    const otherSymbols = PATTERNS
      .filter(p => p.id !== pattern.id)
      .map(p => p.sequence[Math.floor(Math.random() * p.sequence.length)])
      .filter(s => s !== nextSymbol);

    const uniqueWrong = [...new Set(otherSymbols)].slice(0, 2);
    while (uniqueWrong.length < 2) {
      uniqueWrong.push(['❌', '⚡', '💎'][uniqueWrong.length]);
    }

    const options = [...uniqueWrong, nextSymbol].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(nextSymbol);

    setCurrentRound({ pattern, options, correctIndex, nextSymbol });
    setFeedback(null);
    setShowPattern(true);

    // Flash pattern then hide
    fadeAnim.setValue(1);
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowPattern(false));
    }, 2500);
  }, [fadeAnim]);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

  const handleSelect = useCallback((index: number) => {
    if (!currentRound || feedback) return;

    if (index === currentRound.correctIndex) {
      setFeedback('correct');
      setScore(s => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
    } else {
      setFeedback('wrong');
      setStreak(0);
    }

    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= totalRounds) {
        setIsComplete(true);
      } else {
        setRound(nextRound);
        generateRound();
      }
    }, 1000);
  }, [currentRound, feedback, round, totalRounds, streak, bestStreak, generateRound]);

  const restart = useCallback(() => {
    setScore(0);
    setRound(0);
    setStreak(0);
    setBestStreak(0);
    setIsComplete(false);
    setFeedback(null);
    generateRound();
  }, [generateRound]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-indigo-600 px-6 pt-12 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white">{t('games.patternsTitle', 'Mindful Patterns')}</Text>
        <TouchableOpacity onPress={restart}>
          <RotateCcw size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View className="flex-row justify-around px-6 py-3 bg-white border-b border-gray-200">
        <View className="items-center">
          <Text variant="h3" className="text-indigo-600">{score}/{totalRounds}</Text>
          <Text variant="caption" className="text-gray-500">{t('games.score', 'Score')}</Text>
        </View>
        <View className="items-center">
          <Text variant="h3" className="text-indigo-600">{streak}🔥</Text>
          <Text variant="caption" className="text-gray-500">{t('games.streak', 'Streak')}</Text>
        </View>
        <View className="items-center">
          <Text variant="h3" className="text-indigo-600">{round + 1}</Text>
          <Text variant="caption" className="text-gray-500">{t('games.round', 'Round')}</Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        {isComplete ? (
          <View className="items-center">
            <Trophy size={64} color="#f59e0b" />
            <Text variant="h2" className="mt-4 mb-2">{t('games.patternMaster', 'Pattern Master! 🧠')}</Text>
            <Text variant="body" className="text-gray-600 text-center mb-1">
              {t('games.finalScore', 'Score')}: {score}/{totalRounds}
            </Text>
            <Text variant="body" className="text-gray-500 text-center mb-1">
              {t('games.bestStreak', 'Best Streak')}: {bestStreak}🔥
            </Text>
            <Text variant="body" className="text-gray-500 text-center mb-6">
              {score >= totalRounds * 0.8
                ? t('games.sharpMind', 'Incredible focus and mindfulness!')
                : t('games.keepObserving', 'Keep observing — patterns are everywhere!')}
            </Text>
            <TouchableOpacity onPress={restart} className="bg-indigo-600 px-8 py-3 rounded-2xl">
              <Text variant="label" className="text-white">{t('games.playAgain', 'Play Again')}</Text>
            </TouchableOpacity>
          </View>
        ) : currentRound ? (
          <View className="items-center w-full">
            {/* Instruction */}
            <View className="flex-row items-center mb-4">
              <Eye size={20} color="#6366f1" />
              <Text variant="body" className="text-gray-700 ml-2">
                {showPattern
                  ? t('games.observePattern', 'Observe the pattern...')
                  : t('games.whatComesNext', 'What comes next?')}
              </Text>
            </View>

            {/* Pattern Display */}
            <Animated.View
              className="flex-row items-center justify-center mb-2"
              style={{ opacity: showPattern ? fadeAnim : 1 }}
            >
              {currentRound.pattern.sequence.map((symbol, i) => (
                <View
                  key={i}
                  className="bg-white rounded-xl w-16 h-16 items-center justify-center mx-1 border border-gray-200"
                  style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 }}
                >
                  <Text style={{ fontSize: 28 }}>{symbol}</Text>
                </View>
              ))}
              <View className="bg-indigo-100 rounded-xl w-16 h-16 items-center justify-center mx-1 border-2 border-dashed border-indigo-400">
                <Text variant="h2" className="text-indigo-400">?</Text>
              </View>
            </Animated.View>

            {/* Pattern Label */}
            <Text variant="caption" className="text-gray-400 mb-8">
              {currentRound.pattern.label}
            </Text>

            {/* Options */}
            <View className="flex-row gap-4">
              {currentRound.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelect(index)}
                  disabled={feedback !== null || showPattern}
                  activeOpacity={0.7}
                  className={`rounded-2xl w-20 h-20 items-center justify-center border-2 ${
                    feedback !== null && index === currentRound.correctIndex
                      ? 'bg-green-100 border-green-500'
                      : feedback === 'wrong' && index !== currentRound.correctIndex
                      ? 'bg-gray-100 border-gray-200 opacity-40'
                      : showPattern
                      ? 'bg-gray-100 border-gray-200'
                      : 'bg-white border-indigo-200'
                  }`}
                  style={!showPattern ? { elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 } : undefined}
                >
                  <Text style={{ fontSize: 32 }}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Feedback */}
            {feedback && (
              <View className="mt-6">
                <Text variant="label" className={`text-center ${feedback === 'correct' ? 'text-success-600' : 'text-danger-600'}`}>
                  {feedback === 'correct'
                    ? `✓ ${t('games.mindful', 'Mindful!')} ${streak > 1 ? `${streak}🔥` : ''}`
                    : `✗ ${t('games.thePatternWas', 'Next was')} ${currentRound.nextSymbol}`}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
