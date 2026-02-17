import { useState, useEffect, useCallback, useRef } from 'react';
import { View, TouchableOpacity, Alert, Animated } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';

const AFFIRMATIONS = [
  { id: 1, text: '💪 I am strong', match: '🌟 I believe in me' },
  { id: 2, text: '🧘 Stay calm', match: '🌊 Deep breaths' },
  { id: 3, text: '❤️ Self love', match: '🤗 I am enough' },
  { id: 4, text: '🌈 Hope', match: '☀️ Better days ahead' },
  { id: 5, text: '🌱 Growth', match: '📈 Progress > Perfection' },
  { id: 6, text: '🙏 Gratitude', match: '✨ I am blessed' },
];

interface CardItem {
  id: number;
  pairId: number;
  text: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryMatchGame() {
  const { t } = useTranslation();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalPairs = AFFIRMATIONS.length;

  const initGame = useCallback(() => {
    const cardPairs: CardItem[] = [];
    AFFIRMATIONS.forEach((aff, i) => {
      cardPairs.push({ id: i * 2, pairId: aff.id, text: aff.text, isFlipped: false, isMatched: false });
      cardPairs.push({ id: i * 2 + 1, pairId: aff.id, text: aff.match, isFlipped: false, isMatched: false });
    });

    // Shuffle
    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }

    setCards(cardPairs);
    setSelected([]);
    setMoves(0);
    setMatchedCount(0);
    setIsComplete(false);
    setSeconds(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initGame]);

  const handleCardPress = useCallback((index: number) => {
    if (selected.length >= 2) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = cards.map((card, i) =>
      i === index ? { ...card, isFlipped: true } : card
    );
    setCards(newCards);

    const newSelected = [...selected, index];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newSelected;

      if (newCards[first].pairId === newCards[second].pairId) {
        // Match!
        setTimeout(() => {
          setCards(prev => prev.map((card, i) =>
            i === first || i === second ? { ...card, isMatched: true } : card
          ));
          setSelected([]);
          const newMatchedCount = matchedCount + 1;
          setMatchedCount(newMatchedCount);

          if (newMatchedCount === totalPairs) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsComplete(true);
          }
        }, 500);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards(prev => prev.map((card, i) =>
            i === first || i === second ? { ...card, isFlipped: false } : card
          ));
          setSelected([]);
        }, 1000);
      }
    }
  }, [cards, selected, matchedCount, totalPairs]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-purple-600 px-6 pt-12 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white">{t('games.memoryTitle', 'Memory Match')}</Text>
        <TouchableOpacity onPress={initGame}>
          <RotateCcw size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View className="flex-row justify-around px-6 py-3 bg-white border-b border-gray-200">
        <View className="items-center">
          <Text variant="h3" className="text-purple-600">{moves}</Text>
          <Text variant="caption" className="text-gray-500">{t('games.moves', 'Moves')}</Text>
        </View>
        <View className="items-center">
          <Text variant="h3" className="text-purple-600">{matchedCount}/{totalPairs}</Text>
          <Text variant="caption" className="text-gray-500">{t('games.matched', 'Matched')}</Text>
        </View>
        <View className="items-center">
          <Text variant="h3" className="text-purple-600">{formatTime(seconds)}</Text>
          <Text variant="caption" className="text-gray-500">{t('games.time', 'Time')}</Text>
        </View>
      </View>

      {/* Game Board */}
      <View className="flex-1 px-4 py-4">
        {isComplete ? (
          <View className="flex-1 items-center justify-center">
            <Trophy size={64} color="#f59e0b" />
            <Text variant="h2" className="mt-4 mb-2">{t('games.congratulations', 'Congratulations! 🎉')}</Text>
            <Text variant="body" className="text-gray-600 text-center mb-1">
              {t('games.completedIn', 'Completed in')} {moves} {t('games.movesLower', 'moves')}
            </Text>
            <Text variant="body" className="text-gray-600 mb-6">
              {t('games.timeSpent', 'Time')}: {formatTime(seconds)}
            </Text>
            <TouchableOpacity
              onPress={initGame}
              className="bg-purple-600 px-8 py-3 rounded-2xl"
            >
              <Text variant="label" className="text-white">{t('games.playAgain', 'Play Again')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-center gap-2">
            {cards.map((card, index) => (
              <TouchableOpacity
                key={card.id}
                onPress={() => handleCardPress(index)}
                activeOpacity={0.8}
                disabled={card.isFlipped || card.isMatched}
                style={{ width: '30%', aspectRatio: 0.75 }}
                className={`rounded-xl items-center justify-center p-2 ${
                  card.isMatched
                    ? 'bg-green-100 border-2 border-green-400'
                    : card.isFlipped
                    ? 'bg-purple-100 border-2 border-purple-400'
                    : 'bg-purple-600'
                }`}
              >
                {card.isFlipped || card.isMatched ? (
                  <Text variant="caption" className="text-center text-gray-800 font-medium">
                    {card.text}
                  </Text>
                ) : (
                  <Text variant="h2" className="text-white">?</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
