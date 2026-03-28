import { RotateCcw, Smile, Sparkles, Trophy } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { triggerHaptic } from '../../../utils/hapticFeedback';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  thought: string;
  affirmation: string;
  popped: boolean;
}

const anxiousThoughts = [
  { thought: 'What if I fail?', affirmation: 'I am capable and prepared' },
  { thought: 'Everyone is judging me', affirmation: 'Most people are focused on themselves' },
  { thought: 'This is too hard', affirmation: 'I can handle challenges' },
  { thought: 'I\'m not good enough', affirmation: 'I am worthy and enough' },
  { thought: 'Something bad will happen', affirmation: 'I am safe right now' },
  { thought: 'I can\'t do this', affirmation: 'I am stronger than I think' },
  { thought: 'I\'ll embarrass myself', affirmation: 'It\'s okay to make mistakes' },
  { thought: 'Nobody likes me', affirmation: 'I am valued and appreciated' },
];

export const AnxietyBubblePopGame: React.FC = () => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [poppedCount, setPoppedCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [lastAffirmation, setLastAffirmation] = useState<string | null>(null);

  const createBubble = useCallback((): Bubble => {
    const thoughtPair = anxiousThoughts[Math.floor(Math.random() * anxiousThoughts.length)];
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * 80 + 10, // 10-90% of width
      y: 100,
      size: Math.random() * 40 + 60, // 60-100px for better desktop visibility
      speed: Math.random() * 1 + 0.5, // 0.5-1.5% per frame
      thought: thoughtPair.thought,
      affirmation: thoughtPair.affirmation,
      popped: false,
    };
  }, []);

  const startGame = useCallback(() => {
    setBubbles([createBubble(), createBubble(), createBubble()]);
    setScore(0);
    setPoppedCount(0);
    setIsPlaying(true);
    setGameTime(0);
    setLastAffirmation(null);
    triggerHaptic('medium');
  }, [createBubble]);

  const handleBubblePop = useCallback((bubbleId: number) => {
    const bubble = bubbles.find((b) => b.id === bubbleId);
    if (!bubble || bubble.popped) return;

    setBubbles((prev) =>
      prev.map((b) =>
        b.id === bubbleId ? { ...b, popped: true } : b
      )
    );

    setScore((prev) => prev + 10);
    setPoppedCount((prev) => prev + 1);
    setLastAffirmation(bubble.affirmation);
    triggerHaptic('success');

    // Add new bubble after a short delay
    setTimeout(() => {
      setBubbles((prev) => [...prev.filter((b) => b.id !== bubbleId), createBubble()]);
    }, 500);

    // Clear affirmation after 2 seconds
    setTimeout(() => {
      setLastAffirmation(null);
    }, 2000);
  }, [bubbles, createBubble]);

  // Move bubbles upward
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setBubbles((prev) =>
        prev.map((bubble) => ({
          ...bubble,
          y: bubble.y - bubble.speed,
        }))
      );

      // Remove bubbles that reached the top and add new ones
      setBubbles((prev) => {
        const filtered = prev.filter((b) => b.y > -10);
        const newBubblesNeeded = 3 - filtered.length;
        const newBubbles = Array.from({ length: Math.max(0, newBubblesNeeded) }, () => createBubble());
        return [...filtered, ...newBubbles];
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, createBubble]);

  // Game timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setGameTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setBubbles([]);
    setScore(0);
    setPoppedCount(0);
    setGameTime(0);
    setLastAffirmation(null);
    triggerHaptic('medium');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200">
        <div className="flex items-center gap-3 mb-2">
          <Smile className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold">Anxiety Relief Pop</h2>
        </div>
        <p className="text-muted-foreground">
          Pop anxiety bubbles and replace them with positive affirmations. Find your calm!
        </p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Trophy className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Smile className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{poppedCount}</div>
              <div className="text-xs text-muted-foreground">Popped</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground">Time</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Start Screen */}
      {!isPlaying && poppedCount === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <Smile className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold">Ready to Pop Some Anxiety?</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Click on the rising anxiety bubbles to pop them and reveal positive affirmations.
              The more you pop, the calmer you&apos;ll feel!
            </p>
            <Button size="lg" onClick={startGame}>
              Start Popping
            </Button>
          </div>
        </Card>
      )}

      {/* Game Area */}
      {isPlaying && (
        <Card className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-purple-50 to-green-50 dark:from-blue-900 dark:via-purple-900 dark:to-green-900" style={{ height: '600px', maxHeight: '80vh' }}>
          {/* Affirmation Display */}
          {lastAffirmation && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 animate-in slide-in-from-top duration-500">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-full shadow-2xl border-2 border-white/30">
                <p className="text-sm lg:text-base font-bold">✨ {lastAffirmation}</p>
              </div>
            </div>
          )}

          {/* Bubbles */}
          {bubbles.map((bubble) => (
            <button
              key={bubble.id}
              onClick={() => handleBubblePop(bubble.id)}
              disabled={bubble.popped}
              className={`absolute transition-all ${
                bubble.popped ? 'opacity-0 scale-0 duration-300' : 'opacity-100 scale-100 duration-100'
              }`}
              style={{
                left: `${bubble.x}%`,
                bottom: `${bubble.y}%`,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                transform: 'translate(-50%, 50%)',
              }}
            >
              <div
                className="w-full h-full rounded-full bg-gradient-to-br from-red-500/90 via-orange-500/90 to-pink-500/90 backdrop-blur-sm
                         flex items-center justify-center text-white text-xs lg:text-sm font-bold p-2 lg:p-3 text-center
                         hover:scale-125 hover:rotate-3 transition-all duration-200 cursor-pointer shadow-2xl
                         border-3 border-white/40 animate-pulse"
                style={{
                  animation: 'float 3s ease-in-out infinite',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 2px 8px rgba(255, 255, 255, 0.3)',
                }}
              >
                {bubble.thought}
              </div>
            </button>
          ))}

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <Button variant="outline" onClick={handleReset} className="bg-white/90">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </Card>
      )}

      {/* Paused/Ended Screen */}
      {!isPlaying && poppedCount > 0 && (
        <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-900">Great Work!</h3>
            <p className="text-lg text-green-800">
              You popped <strong>{poppedCount} anxiety bubbles</strong> and earned <strong>{score} points</strong>!
            </p>
            <div className="pt-4">
              <Button size="lg" onClick={startGame}>
                Play Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Educational Banner */}
      {!isPlaying && poppedCount === 0 && (
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-green-900">
            <strong>Technique:</strong> This game is based on cognitive restructuring—a therapeutic technique 
            where you identify anxious thoughts and replace them with balanced, realistic affirmations.
          </p>
        </Card>
      )}
    </div>
  );
};
