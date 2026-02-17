import { useState, useEffect, useCallback, useRef } from 'react';
import { View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ANXIOUS_THOUGHTS = [
  { text: '😰 What if...', calm: '🌊 I can handle this' },
  { text: '😟 I can\'t...', calm: '💪 I\'ll try my best' },
  { text: '😣 Too much...', calm: '🧘 One step at a time' },
  { text: '😨 Scary...', calm: '🌈 This will pass' },
  { text: '😤 Stressed...', calm: '🌿 Breathe and release' },
  { text: '😩 Overwhelmed', calm: '✨ I am enough' },
  { text: '😔 Hopeless...', calm: '☀️ Better days ahead' },
  { text: '😧 Nervous...', calm: '🤗 I believe in me' },
];

interface Bubble {
  id: number;
  x: number;
  y: Animated.Value;
  thought: typeof ANXIOUS_THOUGHTS[0];
  isPopped: boolean;
  showCalm: boolean;
  size: number;
}

export default function AnxietyPopGame() {
  const { t } = useTranslation();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const bubbleIdRef = useRef(0);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spawnBubble = useCallback(() => {
    const thought = ANXIOUS_THOUGHTS[Math.floor(Math.random() * ANXIOUS_THOUGHTS.length)];
    const size = 60 + Math.random() * 30;
    const x = Math.random() * (SCREEN_WIDTH - size - 32) + 16;
    const yValue = new Animated.Value(0);

    const bubble: Bubble = {
      id: bubbleIdRef.current++,
      x,
      y: yValue,
      thought,
      isPopped: false,
      showCalm: false,
      size,
    };

    setBubbles(prev => [...prev, bubble]);

    // Animate floating up
    Animated.timing(yValue, {
      toValue: 1,
      duration: 4000 + Math.random() * 2000,
      useNativeDriver: true,
    }).start(() => {
      // Remove when off screen
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    });
  }, []);

  const startGame = useCallback(() => {
    setBubbles([]);
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setIsComplete(false);
    bubbleIdRef.current = 0;

    // Spawn bubbles periodically
    spawnRef.current = setInterval(() => {
      spawnBubble();
    }, 1200);

    // Timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Game over
          if (spawnRef.current) clearInterval(spawnRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setIsPlaying(false);
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Spawn first bubble immediately
    spawnBubble();
  }, [spawnBubble]);

  useEffect(() => {
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handlePop = useCallback((id: number) => {
    setBubbles(prev =>
      prev.map(b =>
        b.id === id ? { ...b, isPopped: true, showCalm: true } : b
      )
    );
    setScore(s => s + 1);

    // Remove after showing calm thought
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }, 1200);
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-emerald-600 px-6 pt-12 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white">{t('games.anxietyTitle', 'Anxiety Pop')}</Text>
        <TouchableOpacity onPress={startGame}>
          <RotateCcw size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View className="flex-row justify-around px-6 py-3 bg-white border-b border-gray-200">
        <View className="items-center">
          <Text variant="h3" className="text-emerald-600">{score}</Text>
          <Text variant="caption" className="text-gray-500">{t('games.popped', 'Popped')}</Text>
        </View>
        <View className="items-center">
          <Text variant="h3" className={`${timeLeft <= 10 ? 'text-red-600' : 'text-emerald-600'}`}>{timeLeft}s</Text>
          <Text variant="caption" className="text-gray-500">{t('games.timeLeft', 'Time')}</Text>
        </View>
      </View>

      {/* Game Area */}
      <View className="flex-1">
        {!isPlaying && !isComplete ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text style={{ fontSize: 64 }}>🫧</Text>
            <Text variant="h2" className="mt-4 mb-2 text-center">
              {t('games.anxietyPopIntro', 'Pop Anxious Thoughts')}
            </Text>
            <Text variant="body" className="text-gray-600 text-center mb-6">
              {t('games.anxietyPopDesc', 'Tap the bubbles to pop anxious thoughts and replace them with calm affirmations')}
            </Text>
            <TouchableOpacity onPress={startGame} className="bg-emerald-600 px-8 py-3 rounded-2xl">
              <Text variant="label" className="text-white">{t('games.start', 'Start Game')}</Text>
            </TouchableOpacity>
          </View>
        ) : isComplete ? (
          <View className="flex-1 items-center justify-center px-8">
            <Trophy size={64} color="#f59e0b" />
            <Text variant="h2" className="mt-4 mb-2">{t('games.timesUp', 'Time\'s Up! 🎯')}</Text>
            <Text variant="body" className="text-gray-600 text-center mb-1">
              {t('games.youPopped', 'You popped')} {score} {t('games.anxiousBubbles', 'anxious thoughts')}
            </Text>
            <Text variant="body" className="text-gray-500 text-center mb-6">
              {score >= 10
                ? t('games.amazingRelief', 'Amazing anxiety relief! 🌟')
                : t('games.goodStart', 'Good start! Try again to pop more!')}
            </Text>
            <TouchableOpacity onPress={startGame} className="bg-emerald-600 px-8 py-3 rounded-2xl">
              <Text variant="label" className="text-white">{t('games.playAgain', 'Play Again')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1" style={{ overflow: 'hidden' }}>
            {bubbles.map((bubble) => (
              <Animated.View
                key={bubble.id}
                style={{
                  position: 'absolute',
                  left: bubble.x,
                  bottom: 0,
                  transform: [{
                    translateY: bubble.y.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -(Dimensions.get('window').height - 200)],
                    }),
                  }],
                }}
              >
                <TouchableOpacity
                  onPress={() => !bubble.isPopped && handlePop(bubble.id)}
                  disabled={bubble.isPopped}
                  activeOpacity={0.7}
                  style={{
                    width: bubble.size,
                    height: bubble.size,
                    borderRadius: bubble.size / 2,
                    backgroundColor: bubble.isPopped ? '#d1fae5' : '#fee2e2',
                    borderWidth: 2,
                    borderColor: bubble.isPopped ? '#10b981' : '#fca5a5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                  }}
                >
                  <Text
                    variant="caption"
                    className={`text-center ${bubble.isPopped ? 'text-emerald-700' : 'text-red-700'}`}
                    style={{ fontSize: 10 }}
                    numberOfLines={2}
                  >
                    {bubble.showCalm ? bubble.thought.calm : bubble.thought.text}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
