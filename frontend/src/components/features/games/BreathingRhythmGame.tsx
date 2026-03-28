import { Clock, Pause, Play, RotateCcw, Trophy, Wind } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { triggerHaptic } from '../../../utils/hapticFeedback';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'pause';

interface BreathPattern {
  name: string;
  inhale: number;
  hold: number;
  exhale: number;
  pause: number;
  description: string;
}

const patterns: BreathPattern[] = [
  { name: 'Box Breathing', inhale: 4, hold: 4, exhale: 4, pause: 4, description: 'Equal timing for calm focus' },
  { name: '4-7-8 Breathing', inhale: 4, hold: 7, exhale: 8, pause: 0, description: 'Deep relaxation technique' },
  { name: 'Calm Breath', inhale: 4, hold: 0, exhale: 6, pause: 0, description: 'Simple stress relief' },
];

export const BreathingRhythmGame: React.FC = () => {
  const [selectedPattern, setSelectedPattern] = useState(patterns[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [countdown, setCountdown] = useState(selectedPattern.inhale);
  const [cycles, setCycles] = useState(0);
  const [score, setScore] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const phaseOrder = useMemo<BreathPhase[]>(() => ['inhale', 'hold', 'exhale', 'pause'], []);
  const phaseDurations = useMemo(() => ({
    inhale: selectedPattern.inhale,
    hold: selectedPattern.hold,
    exhale: selectedPattern.exhale,
    pause: selectedPattern.pause,
  }), [selectedPattern]);

  const getNextPhase = useCallback((currentPhase: BreathPhase): BreathPhase => {
    let nextIndex = phaseOrder.indexOf(currentPhase) + 1;
    while (nextIndex < phaseOrder.length) {
      const nextPhase = phaseOrder[nextIndex];
      if (phaseDurations[nextPhase] > 0) {
        return nextPhase;
      }
      nextIndex++;
    }
    return 'inhale'; // Complete cycle
  }, [phaseOrder, phaseDurations]);

  const getCircleScale = () => {
    const progress = 1 - countdown / phaseDurations[phase];
    
    if (phase === 'inhale') {
      return 0.5 + progress * 0.5; // 0.5 to 1
    } else if (phase === 'exhale') {
      return 1 - progress * 0.5; // 1 to 0.5
    }
    return phase === 'hold' ? 1 : 0.5;
  };

  const getCircleColor = () => {
    switch (phase) {
      case 'inhale': return 'from-blue-500 to-cyan-600';
      case 'hold': return 'from-purple-500 to-indigo-600';
      case 'exhale': return 'from-green-500 to-emerald-600';
      case 'pause': return 'from-amber-500 to-orange-600';
    }
  };

  const getInstructions = () => {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'pause': return 'Pause';
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            const nextPhase = getNextPhase(phase);
            
            if (nextPhase === 'inhale') {
              setCycles((c) => c + 1);
              setScore((s) => s + 10);
              triggerHaptic('success');
            } else {
              triggerHaptic('light');
            }
            
            setPhase(nextPhase);
            return phaseDurations[nextPhase];
          }
          return prev - 1;
        });

        setTotalTime((t) => t + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, phase, selectedPattern, getNextPhase, phaseDurations]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
    triggerHaptic('medium');
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setPhase('inhale');
    setCountdown(selectedPattern.inhale);
    setCycles(0);
    setScore(0);
    setTotalTime(0);
    triggerHaptic('medium');
  }, [selectedPattern]);

  const handlePatternChange = useCallback((pattern: BreathPattern) => {
    setSelectedPattern(pattern);
    setIsPlaying(false);
    setPhase('inhale');
    setCountdown(pattern.inhale);
    setCycles(0);
    setScore(0);
    setTotalTime(0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-200">
        <div className="flex items-center gap-3 mb-2">
          <Wind className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Breathing Rhythm Game</h2>
        </div>
        <p className="text-muted-foreground">
          Follow the breathing circle to find your calm. Synchronize your breath with the visual guide.
        </p>
      </Card>

      {/* Pattern Selection */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">Choose Your Pattern</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {patterns.map((pattern) => (
            <Button
              key={pattern.name}
              variant={selectedPattern.name === pattern.name ? 'default' : 'outline'}
              className="h-auto py-3 px-4 justify-start"
              onClick={() => handlePatternChange(pattern)}
              disabled={isPlaying}
            >
              <div className="text-left">
                <div className="font-semibold">{pattern.name}</div>
                <div className="text-xs opacity-80">{pattern.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Breathing Circle */}
      <Card className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center justify-center min-h-[500px] lg:min-h-[600px] space-y-8">
          {/* Main Circle */}
          <div className="relative flex items-center justify-center">
            {/* Outer glow */}
            <div
              className={`absolute w-72 h-72 lg:w-96 lg:h-96 rounded-full bg-gradient-to-br ${getCircleColor()} opacity-30 blur-2xl transition-all duration-1000 ease-in-out`}
              style={{
                transform: `scale(${getCircleScale()})`,
              }}
            />
            {/* Middle layer */}
            <div
              className={`absolute w-64 h-64 lg:w-80 lg:h-80 rounded-full bg-gradient-to-br ${getCircleColor()} opacity-40 blur-md transition-all duration-1000 ease-in-out`}
              style={{
                transform: `scale(${getCircleScale()})`,
              }}
            />
            {/* Main circle */}
            <div
              className={`relative w-56 h-56 lg:w-72 lg:h-72 rounded-full bg-gradient-to-br ${getCircleColor()} shadow-2xl flex items-center justify-center transition-all duration-1000 ease-in-out border-4 border-white/30`}
              style={{
                transform: `scale(${getCircleScale()})`,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 2px 4px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="text-center text-white drop-shadow-lg">
                <div className="text-7xl lg:text-8xl font-bold mb-2 animate-pulse">{countdown}</div>
                <div className="text-xl lg:text-2xl font-semibold uppercase tracking-wider">
                  {getInstructions()}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={handlePlayPause}
              className="w-32"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleReset}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Wind className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{cycles}</div>
              <div className="text-xs text-muted-foreground">Cycles</div>
            </div>
          </div>
        </Card>
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
            <div className="p-2 rounded-lg bg-purple-100">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}</div>
              <div className="text-xs text-muted-foreground">Time</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tips */}
      {!isPlaying && cycles === 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Find a comfortable seated position. Focus on the circle and 
            breathe naturally with the rhythm. Don&apos;t force your breath—let it flow smoothly.
          </p>
        </Card>
      )}
    </div>
  );
};
