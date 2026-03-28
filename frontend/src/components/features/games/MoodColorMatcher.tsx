import { Heart, Info, RotateCcw, Trophy } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import { triggerHaptic } from '../../../utils/hapticFeedback';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';

interface ColorMood {
  color: string;
  gradient: string;
  mood: string;
  description: string;
  psychology: string;
}

const colorMoods: ColorMood[] = [
  {
    color: 'Red',
    gradient: 'from-red-400 to-rose-500',
    mood: 'Energetic',
    description: 'Feeling energetic, passionate, or intense',
    psychology: 'Red increases heart rate and creates a sense of urgency',
  },
  {
    color: 'Blue',
    gradient: 'from-blue-400 to-cyan-500',
    mood: 'Calm',
    description: 'Feeling calm, peaceful, and tranquil',
    psychology: 'Blue lowers blood pressure and promotes relaxation',
  },
  {
    color: 'Yellow',
    gradient: 'from-yellow-400 to-amber-500',
    mood: 'Happy',
    description: 'Feeling joyful, optimistic, and cheerful',
    psychology: 'Yellow stimulates mental activity and generates positive energy',
  },
  {
    color: 'Green',
    gradient: 'from-green-400 to-emerald-500',
    mood: 'Balanced',
    description: 'Feeling balanced, harmonious, and grounded',
    psychology: 'Green represents growth and creates a calming effect',
  },
  {
    color: 'Purple',
    gradient: 'from-purple-400 to-violet-500',
    mood: 'Creative',
    description: 'Feeling creative, inspired, and imaginative',
    psychology: 'Purple stimulates imagination and spiritual awareness',
  },
  {
    color: 'Orange',
    gradient: 'from-orange-400 to-amber-600',
    mood: 'Enthusiastic',
    description: 'Feeling enthusiastic, excited, and motivated',
    psychology: 'Orange combines energy of red with happiness of yellow',
  },
];

export const MoodColorMatcher: React.FC = () => {
  const [currentMood, setCurrentMood] = useState<ColorMood | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startNewRound = useCallback(() => {
    const randomMood = colorMoods[Math.floor(Math.random() * colorMoods.length)];
    setCurrentMood(randomMood);
    setFeedback(null);
    setShowInfo(false);
  }, []);

  const handleColorSelect = useCallback((selectedColor: string) => {
    if (!currentMood) return;

    setAttempts((prev) => prev + 1);

    if (selectedColor === currentMood.color) {
      setScore((prev) => prev + 10);
      setFeedback('correct');
      triggerHaptic('success');
      setShowInfo(true);
    } else {
      setFeedback('incorrect');
      triggerHaptic('error');
      setTimeout(() => {
        setFeedback(null);
      }, 1500);
    }
  }, [currentMood]);

  const handleReset = useCallback(() => {
    setScore(0);
    setAttempts(0);
    setCurrentMood(null);
    setFeedback(null);
    setShowInfo(false);
    triggerHaptic('medium');
  }, []);

  const accuracy = attempts > 0 ? Math.round((score / (attempts * 10)) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-200">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-6 w-6 text-pink-600" />
          <h2 className="text-2xl font-bold">Mood Color Matcher</h2>
        </div>
        <p className="text-muted-foreground">
          Match emotions with their associated colors and learn about color psychology!
        </p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-100">
              <Trophy className="h-5 w-5 text-pink-600" />
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
              <Heart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{attempts}</div>
              <div className="text-xs text-muted-foreground">Attempts</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Trophy className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Game Area */}
      {!currentMood && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 mb-4">
              <Heart className="h-8 w-8 text-pink-600" />
            </div>
            <h3 className="text-2xl font-bold">Ready to Match?</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You&apos;ll be shown an emotion. Match it with the color that best represents it!
            </p>
            <Button size="lg" onClick={startNewRound}>
              Start Matching
            </Button>
          </div>
        </Card>
      )}

      {currentMood && feedback !== 'correct' && (
        <Card className="p-8">
          <div className="text-center space-y-6">
            <h3 className="text-3xl font-bold">How does this feel?</h3>
            <div className="text-6xl font-bold text-primary">{currentMood.mood}</div>
            <p className="text-lg text-muted-foreground">{currentMood.description}</p>

            {feedback === 'incorrect' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold">Not quite! Try again.</p>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 pt-4 max-w-3xl mx-auto">
              {colorMoods.map((mood) => (
                <button
                  key={mood.color}
                  onClick={() => handleColorSelect(mood.color)}
                  disabled={feedback === 'correct'}
                  className={`group relative h-32 lg:h-40 rounded-2xl bg-gradient-to-br ${mood.gradient} transition-all duration-300 transform hover:scale-110 hover:-translate-y-2 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden`}
                >
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-xl lg:text-2xl group-hover:scale-125 transition-transform duration-300 drop-shadow-lg">
                      {mood.color}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Info Screen */}
      {showInfo && currentMood && (
        <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${currentMood.gradient} flex-shrink-0`} />
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-green-900 mb-2">
                  Correct! {currentMood.color} = {currentMood.mood}
                </h3>
                <p className="text-green-800 mb-4">{currentMood.description}</p>
                <div className="flex items-start gap-2 p-3 bg-white/50 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    <strong>Color Psychology:</strong> {currentMood.psychology}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="lg" onClick={startNewRound} className="flex-1">
                Next Match
              </Button>
              <Button size="lg" variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Educational Banner */}
      {!currentMood && (
        <Card className="p-4 bg-pink-50 border-pink-200">
          <p className="text-sm text-pink-900">
            <strong>Did you know?</strong> Colors can significantly affect our mood and emotions. 
            This game helps you develop emotional awareness and understand color-emotion connections!
          </p>
        </Card>
      )}
    </div>
  );
};
