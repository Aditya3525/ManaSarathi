import { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';

type BreathPattern = {
  name: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
  description: string;
};

const PATTERNS: BreathPattern[] = [
  { name: 'Box Breathing', inhale: 4, hold1: 4, exhale: 4, hold2: 4, description: 'Equal timing for calm focus' },
  { name: '4-7-8 Breathing', inhale: 4, hold1: 7, exhale: 8, hold2: 0, description: 'Promotes deep relaxation' },
  { name: 'Calm Breath', inhale: 4, hold1: 2, exhale: 6, hold2: 0, description: 'Gentle and soothing' },
];

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2' | 'idle';

export default function BreathingGame() {
  const { t } = useTranslation();
  const [selectedPattern, setSelectedPattern] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('idle');

  const pattern = PATTERNS[selectedPattern];

  const getPhaseLabel = useCallback((p: Phase): string => {
    switch (p) {
      case 'inhale': return t('games.inhale', 'Breathe In');
      case 'hold1': return t('games.hold', 'Hold');
      case 'exhale': return t('games.exhale', 'Breathe Out');
      case 'hold2': return t('games.hold', 'Hold');
      default: return t('games.ready', 'Ready');
    }
  }, [t]);

  const getPhaseColor = (p: Phase): string => {
    switch (p) {
      case 'inhale': return '#06b6d4';
      case 'hold1': return '#8b5cf6';
      case 'exhale': return '#10b981';
      case 'hold2': return '#f59e0b';
      default: return '#6366f1';
    }
  };

  const animateCircle = useCallback((p: Phase, duration: number) => {
    const targetScale = p === 'inhale' ? 1.0 : p === 'exhale' ? 0.6 : 0.8;
    Animated.timing(scaleAnim, {
      toValue: targetScale,
      duration: duration * 1000,
      easing: p === 'inhale' ? Easing.out(Easing.ease) : p === 'exhale' ? Easing.in(Easing.ease) : Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const runPhase = useCallback((p: Phase) => {
    const pat = PATTERNS[selectedPattern];
    let duration = 0;
    switch (p) {
      case 'inhale': duration = pat.inhale; break;
      case 'hold1': duration = pat.hold1; break;
      case 'exhale': duration = pat.exhale; break;
      case 'hold2': duration = pat.hold2; break;
    }

    if (duration === 0) {
      // Skip this phase
      const nextPhase = getNextPhase(p);
      if (nextPhase === 'inhale') {
        setCycles(c => c + 1);
      }
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
      return;
    }

    phaseRef.current = p;
    setPhase(p);
    setTimeLeft(duration);
    animateCircle(p, duration);

    // Countdown timer
    if (timerRef.current) clearInterval(timerRef.current);
    let remaining = duration;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        const nextPhase = getNextPhase(p);
        if (nextPhase === 'inhale') {
          setCycles(c => c + 1);
        }
        runPhase(nextPhase);
      }
    }, 1000);
  }, [selectedPattern, animateCircle]);

  function getNextPhase(current: Phase): Phase {
    switch (current) {
      case 'inhale': return 'hold1';
      case 'hold1': return 'exhale';
      case 'exhale': return 'hold2';
      case 'hold2': return 'inhale';
      default: return 'inhale';
    }
  }

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setCycles(0);
    runPhase('inhale');
  }, [runPhase]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    setPhase('idle');
    setTimeLeft(0);
    if (timerRef.current) clearInterval(timerRef.current);
    Animated.timing(scaleAnim, {
      toValue: 0.6,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleReset = useCallback(() => {
    handleStop();
    setCycles(0);
  }, [handleStop]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Stop when switching patterns
  useEffect(() => {
    if (isRunning) handleStop();
  }, [selectedPattern]);

  const phaseColor = getPhaseColor(phase);

  return (
    <View className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="px-6 pt-12 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => { handleStop(); router.back(); }}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white">{t('games.breathingTitle', 'Breathing Rhythm')}</Text>
        <TouchableOpacity onPress={handleReset}>
          <RotateCcw size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Pattern Selector */}
      <View className="px-6 mb-6">
        <View className="flex-row gap-2">
          {PATTERNS.map((pat, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedPattern(i)}
              className={`flex-1 px-3 py-2 rounded-xl ${
                selectedPattern === i ? 'bg-cyan-600' : 'bg-gray-800'
              }`}
            >
              <Text variant="caption" className="text-white text-center font-medium">
                {pat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text variant="caption" className="text-gray-400 text-center mt-2">
          {pattern.description}
        </Text>
      </View>

      {/* Breathing Circle */}
      <View className="flex-1 items-center justify-center">
        <Animated.View
          style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: phaseColor + '30',
            borderWidth: 3,
            borderColor: phaseColor,
            transform: [{ scale: scaleAnim }],
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text variant="h2" className="text-white mb-1">
            {getPhaseLabel(phase)}
          </Text>
          {isRunning && (
            <Text variant="h1" className="text-white" style={{ fontSize: 48, fontVariant: ['tabular-nums'] }}>
              {timeLeft}
            </Text>
          )}
        </Animated.View>
      </View>

      {/* Stats & Controls */}
      <View className="px-6 pb-12">
        {/* Cycle count */}
        <View className="flex-row justify-center mb-6">
          <View className="bg-gray-800 px-4 py-2 rounded-full">
            <Text variant="body" className="text-white">
              {t('games.cycles', 'Cycles')}: {cycles}
            </Text>
          </View>
        </View>

        {/* Pattern timing */}
        <View className="flex-row justify-center gap-3 mb-6">
          <TimingBadge label={t('games.in', 'In')} value={pattern.inhale} active={phase === 'inhale'} />
          {pattern.hold1 > 0 && <TimingBadge label={t('games.holdShort', 'Hold')} value={pattern.hold1} active={phase === 'hold1'} />}
          <TimingBadge label={t('games.out', 'Out')} value={pattern.exhale} active={phase === 'exhale'} />
          {pattern.hold2 > 0 && <TimingBadge label={t('games.holdShort', 'Hold')} value={pattern.hold2} active={phase === 'hold2'} />}
        </View>

        {/* Start/Stop */}
        <TouchableOpacity
          onPress={isRunning ? handleStop : handleStart}
          className={`py-4 rounded-2xl items-center ${isRunning ? 'bg-red-500' : 'bg-cyan-500'}`}
          activeOpacity={0.8}
        >
          <Text variant="h3" className="text-white">
            {isRunning ? t('games.stop', 'Stop') : t('games.start', 'Start')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TimingBadge({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <View className={`px-3 py-1.5 rounded-full ${active ? 'bg-cyan-600' : 'bg-gray-800'}`}>
      <Text variant="caption" className="text-white text-center">
        {label}: {value}s
      </Text>
    </View>
  );
}
