import { Brain, Clock, RotateCcw, Target, Trophy } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { triggerHaptic } from '../../../utils/hapticFeedback';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';

interface Pattern {
  sequence: string[];
  nextItem: string;
  options: string[];
}

const patternTypes = [
  { type: 'color', items: ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'] },
  { type: 'shape', items: ['⭐', '🔷', '🔶', '⬛', '⬜', '🔘'] },
  { type: 'nature', items: ['🌸', '🌺', '🌼', '🌻', '🌷', '🌹'] },
];

const generatePattern = (difficulty: number): Pattern => {
  const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
  const sequenceLength = Math.min(3 + difficulty, 6);
  
  // Create a simple repeating pattern
  const basePattern = patternType.items.slice(0, Math.min(3 + Math.floor(difficulty / 2), 4));
  const sequence: string[] = [];
  
  for (let i = 0; i < sequenceLength; i++) {
    sequence.push(basePattern[i % basePattern.length]);
  }
  
  const nextItem = basePattern[sequenceLength % basePattern.length];
  
  // Create options with the correct answer and random distractors
  const options = [nextItem];
  while (options.length < 4) {
    const randomItem = patternType.items[Math.floor(Math.random() * patternType.items.length)];
    if (!options.includes(randomItem)) {
      options.push(randomItem);
    }
  }
  
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  return { sequence, nextItem, options };
};

export const MindfulPatternGame: React.FC = () => {
  const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null);
  const [difficulty, setDifficulty] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [gameTime, setGameTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const startGame = useCallback(() => {
    const pattern = generatePattern(0);
    setCurrentPattern(pattern);
    setDifficulty(0);
    setScore(0);
    setStreak(0);
    setTotalAttempts(0);
    setCorrectAnswers(0);
    setFeedback(null);
    setGameTime(0);
    setIsPlaying(true);
    triggerHaptic('medium');
  }, []);

  const handleAnswer = useCallback((selected: string) => {
    if (!currentPattern) return;

    setTotalAttempts((prev) => prev + 1);

    if (selected === currentPattern.nextItem) {
      // Correct!
      const points = 10 + (streak * 5) + (difficulty * 2);
      setScore((prev) => prev + points);
      setStreak((prev) => prev + 1);
      setCorrectAnswers((prev) => prev + 1);
      setFeedback('correct');
      triggerHaptic('success');

      // Increase difficulty after every 3 correct answers
      const newDifficulty = Math.floor((correctAnswers + 1) / 3);
      
      setTimeout(() => {
        setDifficulty(newDifficulty);
        setCurrentPattern(generatePattern(newDifficulty));
        setFeedback(null);
      }, 1000);
    } else {
      // Incorrect
      setStreak(0);
      setFeedback('incorrect');
      triggerHaptic('error');

      setTimeout(() => {
        setFeedback(null);
      }, 1500);
    }
  }, [currentPattern, streak, difficulty, correctAnswers]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentPattern(null);
    setDifficulty(0);
    setScore(0);
    setStreak(0);
    setTotalAttempts(0);
    setCorrectAnswers(0);
    setFeedback(null);
    setGameTime(0);
    triggerHaptic('medium');
  }, []);

  // Game timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setGameTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const accuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200">
        <div className="flex items-center gap-3 mb-2">
          <Target className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-bold">Mindful Pattern Recognition</h2>
        </div>
        <p className="text-muted-foreground">
          Train your focus and attention by recognizing patterns. Build mindfulness through observation!
        </p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100">
              <Trophy className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{streak} 🔥</div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
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
      </div>

      {/* Start Screen */}
      {!isPlaying && totalAttempts === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
              <Target className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold">Ready to Train Your Focus?</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Look at the pattern sequence and choose what comes next. 
              The patterns will get more complex as you progress!
            </p>
            <Button size="lg" onClick={startGame}>
              Start Training
            </Button>
          </div>
        </Card>
      )}

      {/* Game Area */}
      {isPlaying && currentPattern && (
        <Card className="p-8">
          <div className="space-y-8">
            {/* Difficulty Level */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium">Level {difficulty + 1}</span>
              </div>
              {streak >= 3 && (
                <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold animate-pulse">
                  🔥 On Fire! +{streak * 5} bonus
                </div>
              )}
            </div>

            {/* Pattern Sequence */}
            <div>
              <h3 className="text-center text-xl lg:text-2xl font-bold mb-6 text-indigo-900 dark:text-indigo-100">What comes next?</h3>
              <div className="flex items-center justify-center gap-3 lg:gap-5 mb-6 flex-wrap">
                {currentPattern.sequence.map((item, idx) => (
                  <div
                    key={idx}
                    className="w-20 h-20 lg:w-28 lg:h-28 flex items-center justify-center text-5xl lg:text-7xl bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-3 border-indigo-200 shadow-lg animate-in zoom-in"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {item}
                  </div>
                ))}
                <div className="w-20 h-20 lg:w-28 lg:h-28 flex items-center justify-center text-5xl lg:text-7xl bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl border-3 border-indigo-400 shadow-xl animate-pulse">
                  ?
                </div>
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`p-4 rounded-lg text-center font-semibold ${
                  feedback === 'correct'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {feedback === 'correct' ? '✓ Correct! Great focus!' : '✗ Not quite. Keep trying!'}
              </div>
            )}

            {/* Options */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-3xl mx-auto">
              {currentPattern.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  disabled={feedback !== null}
                  className="aspect-square flex items-center justify-center text-6xl lg:text-7xl bg-gradient-to-br from-white to-gray-100 rounded-2xl border-3 border-gray-300 hover:border-indigo-500 hover:scale-110 hover:shadow-2xl hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Reset Button */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Game
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Paused Screen */}
      {!isPlaying && totalAttempts > 0 && (
        <Card className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
              <Trophy className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-indigo-900">Session Complete!</h3>
            <div className="space-y-2 text-indigo-800">
              <p>Final Score: <strong>{score}</strong></p>
              <p>Correct Answers: <strong>{correctAnswers}/{totalAttempts}</strong></p>
              <p>Best Streak: <strong>{streak}</strong></p>
            </div>
            <div className="pt-4">
              <Button size="lg" onClick={startGame}>
                Play Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Educational Banner */}
      {!isPlaying && totalAttempts === 0 && (
        <Card className="p-4 bg-indigo-50 border-indigo-200">
          <p className="text-sm text-indigo-900">
            <strong>Benefits:</strong> Pattern recognition exercises improve focus, working memory, 
            and cognitive flexibility—key skills for managing stress and anxiety effectively.
          </p>
        </Card>
      )}
    </div>
  );
};
