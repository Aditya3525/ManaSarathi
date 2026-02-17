import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, Clock, RotateCcw, Trophy } from 'lucide-react';

import { triggerHaptic } from '../../../utils/hapticFeedback';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';

interface CardData {
  id: number;
  content: string;
  emoji: string;
  matched: boolean;
  flipped: boolean;
}

const cardPairs = [
  { content: 'Self-Care', emoji: '🌸' },
  { content: 'Mindfulness', emoji: '🧘' },
  { content: 'Gratitude', emoji: '🙏' },
  { content: 'Breathing', emoji: '💨' },
  { content: 'Joy', emoji: '😊' },
  { content: 'Peace', emoji: '☮️' },
  { content: 'Growth', emoji: '🌱' },
  { content: 'Balance', emoji: '⚖️' },
];

export const MemoryMatchGame: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const totalPairs = cardPairs.length;

  const initializeGame = useCallback(() => {
    // Create pairs and shuffle
    const gameCards = [...cardPairs, ...cardPairs].map((card, index) => ({
      id: index,
      content: card.content,
      emoji: card.emoji,
      matched: false,
      flipped: false,
    }));

    // Shuffle cards
    for (let i = gameCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gameCards[i], gameCards[j]] = [gameCards[j], gameCards[i]];
    }

    setCards(gameCards);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setGameStarted(true);
    setGameTime(0);
    setIsComplete(false);
    triggerHaptic('medium');
  }, []);

  const handleCardClick = useCallback((cardId: number) => {
    if (flippedCards.length === 2 || flippedCards.includes(cardId)) return;

    const card = cards.find((c) => c.id === cardId);
    if (card?.matched) return;

    triggerHaptic('light');
    setFlippedCards((prev) => [...prev, cardId]);
  }, [cards, flippedCards]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [firstId, secondId] = flippedCards;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = cards.find((c) => c.id === secondId);

      setMoves((prev) => prev + 1);

      if (firstCard?.content === secondCard?.content) {
        // Match found!
        triggerHaptic('success');
        setCards((prev) =>
          prev.map((card) =>
            card.id === firstId || card.id === secondId
              ? { ...card, matched: true, flipped: true }
              : card
          )
        );
        setMatches((prev) => prev + 1);
        setFlippedCards([]);

        // Check if game is complete
        if (matches + 1 === totalPairs) {
          setIsComplete(true);
          setGameStarted(false);
        }
      } else {
        // No match
        triggerHaptic('error');
        setTimeout(() => {
          setFlippedCards([]);
        }, 1000);
      }
    }
  }, [flippedCards, cards, matches, totalPairs]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && !isComplete) {
      interval = setInterval(() => {
        setGameTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, isComplete]);

  const accuracy = useMemo(() => {
    if (moves === 0) return 100;
    return Math.round((matches / moves) * 100);
  }, [moves, matches]);

  const score = useMemo(() => {
    const timeBonus = Math.max(0, 300 - gameTime);
    const moveBonus = Math.max(0, (totalPairs * 2 - moves) * 10);
    return matches * 100 + timeBonus + moveBonus;
  }, [gameTime, moves, matches, totalPairs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold">Wellness Memory Match</h2>
        </div>
        <p className="text-muted-foreground">
          Match pairs of mental wellness concepts. Train your memory and reinforce positive thinking!
        </p>
      </Card>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{moves}</div>
              <div className="text-xs text-muted-foreground">Moves</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Trophy className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{matches}/{totalPairs}</div>
              <div className="text-xs text-muted-foreground">Matches</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground">Time</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Trophy className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Game Board */}
      {!gameStarted && !isComplete && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold">Ready to Play?</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Click cards to flip them and find matching pairs. Try to complete the game with the fewest moves!
            </p>
            <Button size="lg" onClick={initializeGame}>
              Start Game
            </Button>
          </div>
        </Card>
      )}

      {gameStarted && !isComplete && (
        <Card className="p-6 lg:p-8">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 lg:gap-6 max-w-4xl mx-auto">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={flippedCards.length === 2}
                className={`aspect-square rounded-xl lg:rounded-2xl transition-all duration-500 transform hover:scale-110 hover:-translate-y-1 ${flippedCards.includes(card.id) || card.matched
                    ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-white shadow-2xl rotate-y-180'
                    : 'bg-gradient-to-br from-gray-200 to-gray-300 hover:from-purple-100 hover:to-pink-100 shadow-lg'
                  } disabled:cursor-not-allowed`}
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div className="flex flex-col items-center justify-center h-full p-2 lg:p-4">
                  {(flippedCards.includes(card.id) || card.matched) ? (
                    <div className="animate-in zoom-in duration-300">
                      <div className="text-4xl lg:text-6xl mb-1 lg:mb-2">{card.emoji}</div>
                      <div className="text-xs lg:text-sm font-bold text-center">{card.content}</div>
                    </div>
                  ) : (
                    <div className="text-4xl lg:text-6xl">❓</div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <Button variant="outline" onClick={initializeGame} size="lg">
              <RotateCcw className="h-5 w-5 mr-2" />
              Restart Game
            </Button>
          </div>
        </Card>
      )}

      {/* Completion Screen */}
      {isComplete && (
        <Card className="p-12 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4 animate-bounce">
              <Trophy className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-green-900">Congratulations! 🎉</h3>
            <p className="text-lg text-green-800">
              You completed the game in <strong>{moves} moves</strong> and{' '}
              <strong>{Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}</strong>!
            </p>
            <div className="flex items-center justify-center gap-2 text-green-700">
              <Trophy className="h-5 w-5" />
              <span className="text-2xl font-bold">Score: {score}</span>
            </div>
            <div className="pt-4">
              <Button size="lg" onClick={initializeGame}>
                Play Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tips */}
      {!gameStarted && !isComplete && (
        <Card className="p-4 bg-purple-50 border-purple-200">
          <p className="text-sm text-purple-900">
            <strong>Tip:</strong> Take your time to remember card positions. Fewer moves mean a higher score!
          </p>
        </Card>
      )}
    </div>
  );
};
