import { useQuery } from '@tanstack/react-query';
import { Award, Bell, BookOpen, Brain, Calendar, CheckCircle, ChevronRight, Headphones, Heart, Lightbulb, MessageCircle, Mic, Moon, MoreVertical, Play, Sparkles, Sun, Sunrise, Target, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccessibility } from '../../../contexts/AccessibilityContext';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useDevice } from '../../../hooks/use-device';
import {
  usePullToRefresh,
  useSaveMood,
} from '../../../hooks/useDashboardData';
import {
  dashboardApi,
  gratitudeApi,
  habitsApi,
  type AdaptiveNudge,
  type AssessmentReminder,
  type CommunityInsightsPayload,
  type DashboardUnifiedData,
  type DailyIntention,
  type GratitudeEntry,
  type MicroCheckin,
  type OneThingActionType,
  type SleepLog,
  type SleepStats,
  type UserHabit,
} from '../../../services/api';
import type { StoredUser } from '../../../services/auth';
import { Badge } from '../../ui/badge';
import { BottomNavigation, BottomNavigationSpacer } from '../../ui/bottom-navigation';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Input } from '../../ui/input';
import { Progress } from '../../ui/progress';
import {
  HorizontalScrollContainer,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack
} from '../../ui/responsive-layout';
import { StaggerContainer, StaggerItem } from '../../ui/motion-wrapper';
import { MotionCard } from '../../ui/motion-enhanced';
import { EveningCheckin, MorningCheckin } from '../checkins';

import { DashboardCollapsibleSection } from './CollapsibleSection';
import { CrisisFollowUp } from './CrisisFollowUp';
import { DailyIntentionCard } from './DailyIntentionCard';
import {
  DashboardLoadingSkeleton,
  ErrorMessage,
  NetworkStatus,
  PullToRefreshIndicator,
  useOnlineStatus
} from './DashboardLoadingStates';
import { EnhancedInsightsCard } from './EnhancedInsightsCard';
import { GreetingHeader } from './GreetingHeader';
import { MoodSelector } from './MoodSelector';
import { OneThingToday } from './OneThingToday';
import { SleepLogCard } from './SleepLogCard';
import { StatsRow } from './StatsRow';

import {
  DashboardCustomizer,
  DashboardTourPrompt,
  useWidgetVisibility
} from './';

interface DashboardProps {
  user: StoredUser | null;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
  showTour?: boolean;
  onTourDismiss?: () => void;
  onTourComplete?: () => void;
}

type MoodSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type MoodSpeechRecognitionCtor = new () => MoodSpeechRecognition;

type MoodSpeechWindow = Window & {
  SpeechRecognition?: MoodSpeechRecognitionCtor;
  webkitSpeechRecognition?: MoodSpeechRecognitionCtor;
};
const DASHBOARD_PRACTICE_AUTOSTART_KEY = 'mw-practice-autostart';

export function Dashboard({ user: userProp, onNavigate, onLogout, showTour = false, onTourDismiss, onTourComplete }: DashboardProps) {
  const [todayMood, setTodayMood] = useState<string>('');
  const [isMoodListening, setIsMoodListening] = useState(false);
  const [isMoodVoiceSupported, setIsMoodVoiceSupported] = useState(false);
  const [moodVoiceStatus, setMoodVoiceStatus] = useState('');
  const [moodVoiceFallbackPrompt, setMoodVoiceFallbackPrompt] = useState('');
  const [gratitudeInput, setGratitudeInput] = useState<string>('');
  const [gratitudeNote, setGratitudeNote] = useState<string>('');
  const [isSavingGratitude, setIsSavingGratitude] = useState(false);
  const [habitTitleInput, setHabitTitleInput] = useState<string>('');
  const [habitCueInput, setHabitCueInput] = useState<string>('');
  const [isSavingHabit, setIsSavingHabit] = useState(false);
  const [isCompletingHabitId, setIsCompletingHabitId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [showCollapsedModeWidgets, setShowCollapsedModeWidgets] = useState(false);
  const moodCheckRef = useRef<HTMLDivElement>(null);
  const habitsSectionRef = useRef<HTMLDivElement>(null);
  const moodRecognitionRef = useRef<MoodSpeechRecognition | null>(null);
  const activeUserId = userProp?.id ?? null;
  const { t } = useTranslation();
  const { settings: accessibilitySettings, setSetting: setAccessibilitySetting } = useAccessibility();
  const { checkIsUserAdmin } = useAdminAuth();
  const { visibility, updateVisibility, isVisible } = useWidgetVisibility(activeUserId);
  const device = useDevice();

  // Fetch dashboard data
  const {
    data: unifiedDashboardResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'unified', activeUserId],
    queryFn: () => dashboardApi.getUnified(),
    enabled: Boolean(activeUserId),
    staleTime: 60 * 1000,
  });

  const unifiedDashboardData: DashboardUnifiedData | null = unifiedDashboardResponse?.success
    ? (unifiedDashboardResponse.data ?? null)
    : null;
  const dashboardData = unifiedDashboardData?.summary ?? null;
  const weeklyData = unifiedDashboardData?.weeklyProgress ?? null;
  const dashboardLoadError = useMemo(() => {
    if (error instanceof Error) {
      return error.message;
    }

    if (unifiedDashboardResponse && !unifiedDashboardResponse.success) {
      return unifiedDashboardResponse.error || 'Failed to load dashboard data';
    }

    return null;
  }, [error, unifiedDashboardResponse]);

  const saveMood = useSaveMood();
  const isOnline = useOnlineStatus();

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const isAdmin = await checkIsUserAdmin();
      setIsUserAdmin(isAdmin);
    };
    checkAdmin();
  }, [checkIsUserAdmin]);

  // Pull-to-refresh for mobile
  const { isRefreshing, pullProgress, shouldTrigger } = usePullToRefresh(async () => {
    await refetch();
  });

  const handleTourSkip = useCallback(() => {
    onTourDismiss?.();
  }, [onTourDismiss]);

  const handleTourComplete = useCallback(() => {
    onTourComplete?.();
    onTourDismiss?.();
  }, [onTourComplete, onTourDismiss]);

  // Guard against cross-user cache bleed if stale summary payload doesn't match active session.
  const summaryUser = dashboardData?.user;
  const user = summaryUser && userProp && summaryUser.id !== userProp.id
    ? userProp
    : (summaryUser || userProp);
  const assessmentScores = dashboardData?.assessmentScores;
  const weeklyProgress = weeklyData || dashboardData?.weeklyProgress;
  const recommendedPractice = dashboardData?.recommendedPractice;

  // Helper to get streak info from either weeklyProgress format
  const getStreakInfo = () => {
    if (!weeklyProgress) return { current: 0, message: 'Start your journey today!' };
    if ('streak' in weeklyProgress) {
      return weeklyProgress.streak;
    }
    return {
      current: weeklyProgress.currentStreak || 0,
      message: weeklyProgress.currentStreak > 0
        ? `${weeklyProgress.currentStreak} day${weeklyProgress.currentStreak !== 1 ? 's' : ''} strong! 🔥`
        : 'Start your journey today!'
    };
  };

  const streakInfo = getStreakInfo();
  const currentHour = new Date().getHours();

  const isHabitCompletedToday = useCallback((lastCompletedAt?: string | null) => {
    if (!lastCompletedAt) {
      return false;
    }

    const completed = new Date(lastCompletedAt);
    return completed.toDateString() === new Date().toDateString();
  }, []);

  const checkins = useMemo(
    () => (unifiedDashboardData?.checkins?.checkins ?? []) as MicroCheckin[],
    [unifiedDashboardData?.checkins?.checkins]
  );

  const { hasMorningCheckin, hasEveningCheckin } = useMemo(() => {
    const today = new Date();
    const isToday = (input: string | Date): boolean => {
      const date = new Date(input);
      return date.toDateString() === today.toDateString();
    };

    return {
      hasMorningCheckin: checkins.some((entry) => entry.type === 'morning' && isToday(entry.createdAt)),
      hasEveningCheckin: checkins.some((entry) => entry.type === 'evening' && isToday(entry.createdAt)),
    };
  }, [checkins]);

  const recentCrisisEvent = unifiedDashboardData?.crisisEvents?.[0];

  const todayIntention: DailyIntention | null = unifiedDashboardData?.intention ?? null;

  const latestSleepLog: SleepLog | null = unifiedDashboardData?.sleep?.history?.logs?.[0] ?? null;

  const sleepStats: SleepStats | null = unifiedDashboardData?.sleep?.stats ?? null;

  const gratitudeEntries: GratitudeEntry[] = unifiedDashboardData?.gratitude?.entries ?? [];

  const adaptiveNudges: AdaptiveNudge[] = unifiedDashboardData?.nudges?.nudges ?? [];

  const assessmentReminder: AssessmentReminder | null = unifiedDashboardData?.assessmentReminder ?? null;

  const habits: UserHabit[] = useMemo(
    () => unifiedDashboardData?.habits?.habits ?? [],
    [unifiedDashboardData?.habits?.habits]
  );

  const communityInsights: CommunityInsightsPayload | null = unifiedDashboardData?.communityInsights ?? null;

  const dashboardMode = unifiedDashboardData?.mode ?? null;

  const isModeDefault = !dashboardMode || dashboardMode.mode === 'default';

  const collapsedWidgetIds = useMemo(
    () => new Set(dashboardMode?.collapsedWidgets ?? []),
    [dashboardMode]
  );

  const priorityWidgetIds = useMemo(
    () => new Set(dashboardMode?.priorityWidgets ?? []),
    [dashboardMode]
  );

  useEffect(() => {
    setShowCollapsedModeWidgets(false);
  }, [dashboardMode?.mode]);

  const isModeSectionVisible = useCallback((sectionId: string, baseVisible = true) => {
    if (!baseVisible) {
      return false;
    }

    if (isModeDefault) {
      return true;
    }

    if (priorityWidgetIds.has(sectionId)) {
      return true;
    }

    if (collapsedWidgetIds.has(sectionId)) {
      return showCollapsedModeWidgets;
    }

    return true;
  }, [collapsedWidgetIds, isModeDefault, priorityWidgetIds, showCollapsedModeWidgets]);

  const gratitudeItemsPreview = useMemo(() => {
    return gratitudeInput
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 3);
  }, [gratitudeInput]);

  const handleSaveGratitude = useCallback(async () => {
    if (isSavingGratitude) {
      return;
    }

    const items = gratitudeItemsPreview;
    if (items.length === 0) {
      return;
    }

    setIsSavingGratitude(true);
    try {
      const response = await gratitudeApi.createEntry({
        items,
        note: gratitudeNote.trim().length > 0 ? gratitudeNote.trim() : undefined,
      });

      if (!response.success) {
        throw new Error(response.error || 'Unable to save gratitude entry');
      }

      setGratitudeInput('');
      setGratitudeNote('');

      await refetch();
    } catch (error) {
      console.error('Failed to save gratitude entry:', error);
    } finally {
      setIsSavingGratitude(false);
    }
  }, [
    gratitudeItemsPreview,
    gratitudeNote,
    isSavingGratitude,
    refetch,
  ]);

  const handleCreateHabit = useCallback(async () => {
    if (isSavingHabit) {
      return;
    }

    const title = habitTitleInput.trim();
    const cue = habitCueInput.trim();
    if (!title || !cue) {
      return;
    }

    setIsSavingHabit(true);
    try {
      const response = await habitsApi.createHabit({ title, cue });
      if (!response.success) {
        throw new Error(response.error || 'Unable to create habit');
      }

      setHabitTitleInput('');
      setHabitCueInput('');

      await refetch();
    } catch (error) {
      console.error('Failed to create habit loop:', error);
    } finally {
      setIsSavingHabit(false);
    }
  }, [
    habitCueInput,
    habitTitleInput,
    isSavingHabit,
    refetch,
  ]);

  const handleCompleteHabit = useCallback(async (habitId: string) => {
    if (isCompletingHabitId) {
      return;
    }

    setIsCompletingHabitId(habitId);
    try {
      const response = await habitsApi.completeHabit(habitId);
      if (!response.success) {
        throw new Error(response.error || 'Unable to complete habit');
      }

      await refetch();
    } catch (error) {
      console.error('Failed to complete habit loop:', error);
    } finally {
      setIsCompletingHabitId(null);
    }
  }, [isCompletingHabitId, refetch]);

  const handleCheckinComplete = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Mood selection handler with API call
  const handleMoodSelect = useCallback(async (mood: string) => {
    setTodayMood(mood);
    try {
      await Promise.all([
        saveMood.mutateAsync({ mood }),
        refetch(),
      ]);
    } catch (error) {
      console.error('Failed to save mood:', error);
    }
  }, [refetch, saveMood]);

  const launchPracticeFromDashboard = useCallback((practice?: { id?: string | null; title?: string | null }) => {
    const practiceId = typeof practice?.id === 'string' ? practice.id : null;
    const practiceTitle = typeof practice?.title === 'string' ? practice.title : null;

    if (typeof window !== 'undefined') {
      const payload = JSON.stringify({
        id: practiceId,
        title: practiceTitle,
        source: 'dashboard',
        createdAt: Date.now(),
      });
      window.sessionStorage.setItem(DASHBOARD_PRACTICE_AUTOSTART_KEY, payload);
    }

    onNavigate('practices');
  }, [onNavigate]);

  const handleOneThingAction = useCallback(async (actionType: OneThingActionType, actionData?: Record<string, unknown>) => {
    if (actionType === 'mood') {
      const mood = typeof actionData?.mood === 'string' ? actionData.mood : null;
      if (mood) {
        await handleMoodSelect(mood);
      } else {
        moodCheckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (actionType === 'habit') {
      const habitId = typeof actionData?.habitId === 'string' ? actionData.habitId : null;
      if (habitId) {
        await handleCompleteHabit(habitId);
      }
      habitsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (actionType === 'checkin') {
      moodCheckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (actionType === 'assessment') {
      onNavigate('assessments');
      return;
    }

    if (actionType === 'chat') {
      onNavigate('chatbot');
      return;
    }

    if (actionType === 'practice') {
      launchPracticeFromDashboard({
        id: typeof actionData?.practiceId === 'string' ? actionData.practiceId : null,
        title: typeof actionData?.title === 'string' ? actionData.title : null,
      });
      return;
    }

    onNavigate('practices');
  }, [handleCompleteHabit, handleMoodSelect, launchPracticeFromDashboard, onNavigate]);

  const mapTranscriptToMood = useCallback((transcript: string): string | null => {
    const normalized = transcript.toLowerCase();

    if (/(great|excellent|amazing|awesome|fantastic|happy|joyful|mast|badiya|badhiya|jhakkas|superb|ekdum badhiya)/.test(normalized)) {
      return 'Great';
    }
    if (/(good|fine|okay-ish|all right|alright|pretty well|thik thak|theek thak|theek hai|thik hai|kaafi theek)/.test(normalized)) {
      return 'Good';
    }
    if (/(okay|neutral|so so|soso|average|normal|manageable|just okay|thoda theek|thoda thik)/.test(normalized)) {
      return 'Okay';
    }
    if (/(struggling|low|down|sad|upset|hard day|difficult|mood off|not great|feeling low|thoda low|heavy lag raha)/.test(normalized)) {
      return 'Struggling';
    }
    if (/(anxious|anxiety|panic|worried|nervous|stressed|overwhelmed|tensed|tension|ghabrahat|pareshan|dimag kharab|bahut pressure)/.test(normalized)) {
      return 'Anxious';
    }

    return null;
  }, []);

  const getVoiceErrorMessage = useCallback((errorCode?: string): string => {
    switch (errorCode) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone permission was blocked. Allow mic access in browser settings and try again.';
      case 'no-speech':
        return 'No speech was detected. Try again and speak after listening starts.';
      case 'network':
        return 'Network issue during voice recognition. Please check your connection and retry.';
      case 'audio-capture':
        return 'No microphone input detected. Check your mic device and browser input source.';
      case 'aborted':
        return 'Voice check-in was stopped before completion. Tap again to restart.';
      case 'bad-grammar':
        return 'Speech could not be interpreted clearly. Try a short phrase like "I feel anxious".';
      case 'language-not-supported':
        return 'Current language is not supported for speech recognition. Try English (en-US).';
      default:
        return 'Voice check-in failed. You can still set your mood manually below.';
    }
  }, []);

  const setVoiceFallbackSuggestion = useCallback((message: string) => {
    setMoodVoiceFallbackPrompt(`${message} Fallback: type or tap one of these moods: Great, Good, Okay, Struggling, Anxious.`);
  }, []);

  useEffect(() => {
    const speechWindow = window as MoodSpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsMoodVoiceSupported(false);
      moodRecognitionRef.current = null;
      return;
    }

    setIsMoodVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = document.documentElement.lang || 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || '';
      if (!transcript) {
        setMoodVoiceStatus('I did not catch that. Please try again.');
        setVoiceFallbackSuggestion('I could not hear your response.');
        setIsMoodListening(false);
        return;
      }

      const mappedMood = mapTranscriptToMood(transcript);
      if (mappedMood) {
        setMoodVoiceStatus(`Heard "${transcript}". Mood logged as ${mappedMood}.`);
        setMoodVoiceFallbackPrompt('');
        void handleMoodSelect(mappedMood);
      } else {
        setMoodVoiceStatus(
          `Heard "${transcript}". Try saying words like great, good, okay, struggling, or anxious.`
        );
        setVoiceFallbackSuggestion('Voice input was captured but did not match a mood confidently.');
      }

      setIsMoodListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Mood voice recognition error:', event.error);
      const message = getVoiceErrorMessage(event.error);
      setMoodVoiceStatus(message);
      setVoiceFallbackSuggestion(message);
      setIsMoodListening(false);
    };

    recognition.onend = () => {
      setIsMoodListening(false);
    };

    moodRecognitionRef.current = recognition;

    return () => {
      recognition.stop();
      moodRecognitionRef.current = null;
    };
  }, [getVoiceErrorMessage, handleMoodSelect, mapTranscriptToMood, setVoiceFallbackSuggestion]);

  const handleVoiceMoodCheckIn = useCallback(() => {
    const recognition = moodRecognitionRef.current;
    if (!recognition || !isMoodVoiceSupported) {
      setMoodVoiceStatus('Voice check-in is not available in this browser.');
      setVoiceFallbackSuggestion('Voice recognition is unavailable in this browser.');
      return;
    }

    if (isMoodListening) {
      recognition.stop();
      setIsMoodListening(false);
      return;
    }

    try {
      recognition.start();
      setIsMoodListening(true);
      setMoodVoiceStatus('Listening... say how you feel.');
      setMoodVoiceFallbackPrompt('');
    } catch (error) {
      console.error('Failed to start mood voice check-in:', error);
      setIsMoodListening(false);
      setMoodVoiceStatus('Could not start voice check-in. Please try again.');
      setVoiceFallbackSuggestion('Voice capture could not start.');
    }
  }, [isMoodListening, isMoodVoiceSupported, setVoiceFallbackSuggestion]);

  const getProfileCompletion = () => {
    if (!user) return 0;
    // Use profileCompletion from API if available
    if ('profileCompletion' in user && typeof user.profileCompletion === 'number') {
      return user.profileCompletion;
    }
    return 0;
  };

  const profileCompletion = getProfileCompletion();

  // Format score to whole number (no decimals)
  const formatScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return '0';
    return Math.round(score).toString();
  };

  // Get interpretation from backend data or fallback to simple label
  const getScoreInterpretation = (type: string, score: number): string => {
    // Try to get interpretation from backend byType data
    if (assessmentScores?.byType) {
      const typeData = assessmentScores.byType[type] || assessmentScores.byType[`${type}_assessment`];
      if (typeData?.interpretation) {
        return typeData.interpretation;
      }
    }

    // Fallback to simple labels if no interpretation available
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Moderate';
    return 'Needs attention';
  };

  // Use recommended practice from AI engine or fallback to approach-based defaults
  const practiceTitle = recommendedPractice?.title || (() => {
    switch (user?.approach) {
      case 'western': return "CBT Reflection Exercise";
      case 'eastern': return "Guided Mindful Breathing";
      case 'hybrid': return "Blended Mindfulness & CBT Practice";
      default: return "10-Minute Calm Breathing";
    }
  })();

  const practiceDescription = recommendedPractice?.description || "Begin your wellness journey with this practice";
  const practiceDuration = typeof recommendedPractice?.duration === 'number'
    ? recommendedPractice.duration
    : (recommendedPractice?.duration ? parseInt(String(recommendedPractice.duration)) : 10);

  const practiceType = recommendedPractice?.type || (() => {
    switch (user?.approach) {
      case 'western': return "CBT";
      case 'eastern': return "Meditation";
      case 'hybrid': return "Mindfulness";
      default: return "Breathing";
    }
  })();

  const practiceTags = recommendedPractice?.tags || (() => {
    switch (user?.approach) {
      case 'western': return ['CBT technique', 'Thought tracking', '5–10 min'];
      case 'eastern': return ['Meditation', 'Breathwork', 'Grounding'];
      case 'hybrid': return ['Mindfulness', 'Cognitive reframing', 'Balanced'];
      default: return ['Anxiety relief', 'Beginner friendly', '10 min'];
    }
  })();

  const handleToggleDarkMode = () => {
    const next = !accessibilitySettings.darkMode;
    setAccessibilitySetting('darkMode', next, {
      announce: `Dark mode ${next ? 'enabled' : 'disabled'}`
    });
  };

  const recommendedAction = useMemo(() => {
    if (!todayMood) {
      return {
        title: 'Log today\'s mood',
        description: 'A quick check-in helps personalize your practices and insights.',
        cta: 'Check in now',
        onAction: () => moodCheckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      };
    }

    if (weeklyProgress && weeklyProgress.practices.completed < weeklyProgress.practices.goal) {
      const remaining = weeklyProgress.practices.goal - weeklyProgress.practices.completed;
      return {
        title: 'Complete today\'s practice',
        description: `${remaining} practice${remaining === 1 ? '' : 's'} left to hit your weekly goal.`,
        cta: 'Start a practice',
        onAction: () => launchPracticeFromDashboard({
          id: recommendedPractice?.id,
          title: recommendedPractice?.title || practiceTitle,
        })
      };
    }

    if (profileCompletion < 100) {
      return {
        title: 'Finish your profile setup',
        description: `You are ${profileCompletion}% complete. Add a few details for better recommendations.`,
        cta: 'Complete profile',
        onAction: () => onNavigate('profile')
      };
    }

    if (!assessmentScores) {
      return {
        title: 'Take your first assessment',
        description: 'Unlock tailored guidance based on your current wellbeing baseline.',
        cta: 'Start assessment',
        onAction: () => onNavigate('assessments')
      };
    }

    return {
      title: 'Reflect with your AI coach',
      description: 'Turn today\'s momentum into a focused plan with guided conversation.',
      cta: 'Open AI chat',
      onAction: () => onNavigate('chatbot')
    };
  }, [
    todayMood,
    weeklyProgress,
    profileCompletion,
    assessmentScores,
    onNavigate,
    launchPracticeFromDashboard,
    recommendedPractice?.id,
    recommendedPractice?.title,
    practiceTitle,
  ]);

  const isLoggingMood = saveMood.isPending;
  const currentStreak = streakInfo.current;
  const wellnessScore = assessmentScores?.wellnessScore != null
    ? Math.round(assessmentScores.wellnessScore)
    : null;
  const wellnessTrend = useMemo(() => {
    const trend = assessmentScores?.overallTrend?.toLowerCase();
    if (!trend) {
      return null;
    }

    if (trend.includes('improv') || trend.includes('up')) {
      return 5;
    }

    if (trend.includes('declin') || trend.includes('down')) {
      return -5;
    }

    return null;
  }, [assessmentScores?.overallTrend]);
  const weeklyCheckInCount = weeklyProgress?.moodCheckins?.completed ?? 0;
  const completedHabitsCount = useMemo(
    () => habits.filter((habit) => isHabitCompletedToday(habit.lastCompletedAt)).length,
    [habits, isHabitCompletedToday],
  );
  const totalHabitsCount = habits.length;
  const insightCount = (dashboardData?.recentInsights?.length ?? 0) + adaptiveNudges.length + (communityInsights?.metrics.length ?? 0);
  const oneThingTitle = dashboardMode?.oneThingToday?.title || recommendedAction.title;
  const oneThingDescription = dashboardMode?.oneThingToday?.description || recommendedAction.description;
  const oneThingDuration = useMemo(() => {
    const value = dashboardMode?.oneThingToday?.actionData?.duration;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `${value} min`;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return '5 min';
  }, [dashboardMode?.oneThingToday?.actionData]);

  const handleOneThingStart = useCallback(() => {
    if (dashboardMode?.oneThingToday) {
      void handleOneThingAction(
        dashboardMode.oneThingToday.actionType,
        dashboardMode.oneThingToday.actionData,
      );
      return;
    }
    recommendedAction.onAction();
  }, [dashboardMode, handleOneThingAction, recommendedAction]);

  const handleStatClick = useCallback((stat: string) => {
    if (stat === 'habits') {
      habitsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (stat === 'checkins' || stat === 'streak') {
      moodCheckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (stat === 'wellness') {
      onNavigate('assessments');
    }
  }, [onNavigate]);

  const showInsightsWidget = isModeSectionVisible('recent-insights', isVisible('recent-insights'));
  const showThisWeekWidget = isModeSectionVisible('this-week', isVisible('this-week'));
  const hasCollapsedModeWidgets = !isModeDefault && (dashboardMode?.collapsedWidgets?.length ?? 0) > 0;

  // Loading state
  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  // Error state
  if (dashboardLoadError) {
    return (
      <ErrorMessage
        title="Failed to load dashboard"
        message={dashboardLoadError}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <>
      <DashboardTourPrompt
        open={showTour}
        onSkip={handleTourSkip}
        onComplete={handleTourComplete}
      />

      {/* Pull-to-refresh indicator for mobile */}
      <PullToRefreshIndicator
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
        shouldTrigger={shouldTrigger}
      />

      {/* Network status banner when offline */}
      {!isOnline && <NetworkStatus isOnline={isOnline} />}

      <div className="min-h-screen bg-background pb-safe page-enter">
        {/* Header - Responsive */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-start mb-4 md:mb-6">
              {/* Header title */}
              <div className="space-y-1 md:space-y-2 flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold truncate">
                  Your Wellbeing Dashboard
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  {t('dashboard.howFeeling')}
                </p>
                {!isModeDefault && dashboardMode?.message && (
                  <p className="text-xs md:text-sm text-primary font-medium">
                    {dashboardMode.message}
                  </p>
                )}
              </div>

              {/* Header Actions - Responsive */}
              <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                {/* Mobile: Overflow menu */}
                {device.isMobile ? (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleToggleDarkMode}
                      aria-label={accessibilitySettings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                      className="h-9 w-9 rounded-full"
                    >
                      {accessibilitySettings.darkMode ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onNavigate('profile')}>
                          Profile
                        </DropdownMenuItem>
                        {profileCompletion < 100 && (
                          <DropdownMenuItem onClick={() => onNavigate('profile')}>
                            Complete profile ({profileCompletion}%)
                          </DropdownMenuItem>
                        )}
                        {isUserAdmin && (
                          <DropdownMenuItem onClick={() => onNavigate('admin')}>
                            Admin Dashboard
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <div className="w-full">
                            <DashboardCustomizer
                              visibility={visibility}
                              onVisibilityChange={updateVisibility}
                            />
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (onLogout) onLogout();
                          }}
                          className="text-red-600"
                        >
                          Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  /* Desktop: Full buttons */
                  <>
                    <DashboardCustomizer
                      visibility={visibility}
                      onVisibilityChange={updateVisibility}
                    />
                    {profileCompletion < 100 && (
                      <div className="text-right">
                        <p className="text-sm font-medium">Profile {profileCompletion}% complete</p>
                        <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => onNavigate('profile')}>
                          Complete setup →
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleToggleDarkMode}
                      aria-label={accessibilitySettings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                      className="h-9 w-9 rounded-full"
                    >
                      {accessibilitySettings.darkMode ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => onNavigate('profile')}>
                      Profile
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (onLogout) onLogout();
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Logout
                    </Button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <ResponsiveContainer spacing="medium">
            {/* Tier 1: The Breathe Zone - Always visible */}
            <div className="space-y-4 page-enter">
              {isModeSectionVisible('greeting-header', isVisible('greeting-header')) && (
                <GreetingHeader userName={user?.name || user?.firstName || undefined} />
              )}

              {isModeSectionVisible('mood-check', isVisible('mood-check')) && (
                <div ref={moodCheckRef}>
                  <Card className="border-primary/10 shadow-[var(--shadow-card)]">
                    <CardContent className="p-4 sm:p-6">
                      <p className="text-center text-sm text-muted-foreground mb-3">
                        How are you feeling right now?
                      </p>
                      <MoodSelector
                        onSelect={(mood) => {
                          void handleMoodSelect(mood);
                        }}
                        selectedMood={todayMood}
                        disabled={isLoggingMood}
                      />
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[40px]"
                          onClick={handleVoiceMoodCheckIn}
                          disabled={!isMoodVoiceSupported}
                          aria-label={isMoodListening ? 'Stop voice mood check-in' : 'Start voice mood check-in'}
                        >
                          <Mic className="mr-2 h-4 w-4" />
                          {isMoodListening ? 'Listening...' : 'Voice mood check-in'}
                        </Button>
                        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                          {isLoggingMood
                            ? 'Saving your check-in...'
                            : todayMood
                              ? `Mood saved as ${todayMood}. Recommendations will adapt for today.`
                              : 'Choose a mood to personalize your dashboard.'}
                        </p>
                      </div>
                      {moodVoiceStatus ? (
                        <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
                          {moodVoiceStatus}
                        </p>
                      ) : null}
                      {moodVoiceFallbackPrompt ? (
                        <div className="mt-3 space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                            {moodVoiceFallbackPrompt}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(['Great', 'Good', 'Okay', 'Struggling', 'Anxious'] as const).map((moodOption) => (
                              <Button
                                key={moodOption}
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => {
                                  setMoodVoiceFallbackPrompt('');
                                  void handleMoodSelect(moodOption);
                                }}
                              >
                                {moodOption}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              )}

              {isModeSectionVisible('one-thing-today', isVisible('one-thing-today')) && (
                <OneThingToday
                  title={oneThingTitle}
                  description={oneThingDescription}
                  duration={oneThingDuration}
                  onStart={handleOneThingStart}
                />
              )}
            </div>

            {/* Tier 2: The Pulse - Compact stats */}
            {isModeSectionVisible('stats-row', isVisible('stats-row')) && (
              <StatsRow
                streak={currentStreak}
                wellnessScore={wellnessScore}
                wellnessTrend={wellnessTrend}
                weeklyCheckIns={weeklyCheckInCount}
                habitsCompleted={completedHabitsCount}
                habitsTotal={totalHabitsCount}
                onStatClick={handleStatClick}
              />
            )}

            {/* Tier 3: The Depth - Existing widgets */}
            <div className="space-y-2">
              {false && !isModeDefault && dashboardMode && isModeSectionVisible('adaptive-mode-banner', isVisible('adaptive-mode-banner')) && (
                <Card className="border-primary/25 bg-primary/5">
                  <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide font-semibold text-primary">Adaptive mode</p>
                      <p className="text-sm text-foreground">
                        {dashboardMode.message || 'Dashboard is focused to reduce overload right now.'}
                      </p>
                    </div>
                    {hasCollapsedModeWidgets && (
                      <Button
                        variant="outline"
                        onClick={() => setShowCollapsedModeWidgets((prev) => !prev)}
                      >
                        {showCollapsedModeWidgets ? 'Hide extra widgets' : 'See more widgets'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {isModeSectionVisible('crisis-follow-up', isVisible('crisis-follow-up')) && recentCrisisEvent && (
                <CrisisFollowUp
                  event={recentCrisisEvent}
                  onRespond={() => {
                    void refetch();
                  }}
                  onNavigate={onNavigate}
                />
              )}

              {isModeSectionVisible('checkins', isVisible('checkins')) && currentHour < 12 && (
                <DashboardCollapsibleSection
                  title="Morning Check-in"
                  summary={hasMorningCheckin ? 'Completed' : 'Start your day with a pulse-check'}
                  icon={<Sunrise className="h-4 w-4" />}
                  defaultOpen={!hasMorningCheckin}
                >
                  {hasMorningCheckin ? (
                    <p className="text-sm text-muted-foreground">Morning check-in already completed today.</p>
                  ) : (
                    <MorningCheckin onComplete={() => void handleCheckinComplete()} />
                  )}
                </DashboardCollapsibleSection>
              )}

              {isModeSectionVisible('checkins', isVisible('checkins')) && currentHour >= 17 && (
                <DashboardCollapsibleSection
                  title="Evening Reflection"
                  summary={hasEveningCheckin ? 'Completed' : 'Wind down with a quick reflection'}
                  icon={<Moon className="h-4 w-4" />}
                  defaultOpen={!hasEveningCheckin}
                >
                  {hasEveningCheckin ? (
                    <p className="text-sm text-muted-foreground">Evening reflection already completed today.</p>
                  ) : (
                    <EveningCheckin onComplete={() => void handleCheckinComplete()} />
                  )}
                </DashboardCollapsibleSection>
              )}

              {(
                (isModeSectionVisible('smart-nudges', isVisible('smart-nudges')) && adaptiveNudges.length > 0)
                || (isModeSectionVisible('community-insights', isVisible('community-insights')) && Boolean(communityInsights?.metrics.length))
                || (isModeSectionVisible('assessment-reminder', isVisible('assessment-reminder')) && Boolean(assessmentReminder?.shouldRemind))
              ) && (
                  <DashboardCollapsibleSection
                    title="Insights & Nudges"
                    summary={`${insightCount} recent signals`}
                    icon={<Lightbulb className="h-4 w-4" />}
                    badge={insightCount > 0 ? insightCount : undefined}
                  >
                    <div className="space-y-3">
                      {isModeSectionVisible('smart-nudges', isVisible('smart-nudges')) && adaptiveNudges.length > 0 && (
                        <Card className="border-primary/30 bg-primary/5">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              Smart Nudges
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <StaggerContainer staggerDelay={0.08}>
                              {adaptiveNudges.map((nudge) => (
                                <StaggerItem key={nudge.id}>
                                  <div className="rounded-md border bg-background p-3">
                                    <p className="text-sm text-foreground">{nudge.message}</p>
                                    {nudge.ctaLabel && nudge.ctaPage && (
                                      <Button
                                        variant="link"
                                        className="px-0 h-auto mt-1"
                                        onClick={() => onNavigate(nudge.ctaPage)}
                                      >
                                        {nudge.ctaLabel}
                                      </Button>
                                    )}
                                  </div>
                                </StaggerItem>
                              ))}
                            </StaggerContainer>
                          </CardContent>
                        </Card>
                      )}

                      {isModeSectionVisible('community-insights', isVisible('community-insights')) && communityInsights && communityInsights.metrics.length > 0 && (
                        <Card className="border-slate-300/70 bg-slate-50/60">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-slate-700" />
                              Community Insights
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Anonymous trends from the community to reduce isolation and normalize progress.
                            </p>

                            <div className="grid gap-3 md:grid-cols-3">
                              <StaggerContainer staggerDelay={0.12}>
                                {communityInsights.metrics.map((metric) => (
                                  <StaggerItem key={metric.id}>
                                    <div className="rounded-md border bg-background p-3 space-y-1">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {metric.label}
                                      </p>
                                      <p className="text-xl font-semibold text-foreground">
                                        {metric.value}{metric.unit === 'percent' ? '%' : ''}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {metric.description}
                                      </p>
                                    </div>
                                  </StaggerItem>
                                ))}
                              </StaggerContainer>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Updated {new Date(communityInsights.generatedAt).toLocaleString()} • sample size up to {Math.max(...communityInsights.metrics.map((metric) => metric.sampleSize), 0)} users
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {isModeSectionVisible('assessment-reminder', isVisible('assessment-reminder')) && assessmentReminder?.shouldRemind && (
                        <Card className="border-amber-300/70 bg-amber-50/60">
                          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Assessment Reminder</p>
                              <h3 className="text-base font-semibold text-foreground">Time for a check-in</h3>
                              <p className="text-sm text-muted-foreground">
                                {assessmentReminder.message}
                              </p>
                            </div>
                            <Button
                              className={device.isMobile ? 'w-full min-h-[44px] touch-manipulation' : ''}
                              onClick={() => onNavigate('assessments')}
                            >
                              <Bell className="h-4 w-4 mr-2" />
                              Retake Assessment
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </DashboardCollapsibleSection>
                )}

              {isModeSectionVisible('gratitude', isVisible('gratitude')) && (
                <Card className="border-emerald-300/70 bg-emerald-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2">
                      <Heart className="h-5 w-5 text-emerald-600" />
                      Daily Gratitude Prompt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Name 3 things you&apos;re grateful for today.
                    </p>
                    <Input
                      value={gratitudeInput}
                      onChange={(event) => setGratitudeInput(event.target.value)}
                      placeholder="coffee, sunshine, a kind conversation"
                    />
                    <Input
                      value={gratitudeNote}
                      onChange={(event) => setGratitudeNote(event.target.value)}
                      placeholder="Optional note"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        {gratitudeItemsPreview.length > 0
                          ? `${gratitudeItemsPreview.length}/3 items ready`
                          : 'Tip: separate items with commas'}
                      </p>
                      <Button
                        onClick={() => void handleSaveGratitude()}
                        disabled={isSavingGratitude || gratitudeItemsPreview.length === 0}
                        className={device.isMobile ? 'w-full min-h-[44px] touch-manipulation' : ''}
                      >
                        {isSavingGratitude ? 'Saving...' : 'Save gratitude entry'}
                      </Button>
                    </div>

                    {gratitudeEntries.length > 0 && (
                      <div className="pt-2 border-t space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent gratitude</p>
                        <StaggerContainer staggerDelay={0.1}>
                          {gratitudeEntries.slice(0, 2).map((entry) => (
                            <StaggerItem key={entry.id}>
                              <p className="text-sm text-foreground">
                                {entry.items.slice(0, 3).join(', ')}
                              </p>
                            </StaggerItem>
                          ))}
                        </StaggerContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {isModeSectionVisible('habits', isVisible('habits')) && (
                <div ref={habitsSectionRef}>
                  <DashboardCollapsibleSection
                    title="My Habits"
                    summary={`${completedHabitsCount}/${totalHabitsCount} completed today`}
                    icon={<CheckCircle className="h-4 w-4" />}
                    badge={`${completedHabitsCount}/${totalHabitsCount}`}
                    defaultOpen={totalHabitsCount === 0}
                  >
                    <Card className="border-cyan-300/70 bg-cyan-50/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base md:text-lg flex items-center gap-2">
                          <Target className="h-5 w-5 text-cyan-700" />
                          Habit Loops
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Build cue-based habits you can complete in under five minutes.
                        </p>

                        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                          <Input
                            value={habitTitleInput}
                            onChange={(event) => setHabitTitleInput(event.target.value)}
                            placeholder="Habit title (e.g. 3 calming breaths)"
                          />
                          <Input
                            value={habitCueInput}
                            onChange={(event) => setHabitCueInput(event.target.value)}
                            placeholder="Cue (e.g. After morning coffee)"
                          />
                          <Button
                            onClick={() => void handleCreateHabit()}
                            disabled={isSavingHabit || habitTitleInput.trim().length < 3 || habitCueInput.trim().length < 3}
                            className={device.isMobile ? 'min-h-[44px] touch-manipulation' : ''}
                          >
                            {isSavingHabit ? 'Saving...' : 'Add loop'}
                          </Button>
                        </div>

                        {habits.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No active habit loops yet. Add one cue and one tiny action to get started.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <StaggerContainer>
                              {habits.slice(0, 4).map((habit) => {
                                const completedToday = isHabitCompletedToday(habit.lastCompletedAt);
                                return (
                                  <StaggerItem key={habit.id}>
                                    <div className="rounded-md border bg-background p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium text-foreground">{habit.title}</p>
                                        <p className="text-xs text-muted-foreground">Cue: {habit.cue}</p>
                                        <p className="text-xs text-muted-foreground">Streak: {habit.streak} day{habit.streak === 1 ? '' : 's'}</p>
                                      </div>
                                      <Button
                                        variant={completedToday ? 'secondary' : 'outline'}
                                        onClick={() => void handleCompleteHabit(habit.id)}
                                        disabled={completedToday || isCompletingHabitId === habit.id}
                                        className={device.isMobile ? 'w-full min-h-[44px] touch-manipulation md:w-auto' : ''}
                                      >
                                        {completedToday
                                          ? 'Completed today'
                                          : isCompletingHabitId === habit.id
                                            ? 'Saving...'
                                            : 'Mark complete'}
                                      </Button>
                                    </div>
                                  </StaggerItem>
                                );
                              })}
                            </StaggerContainer>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </DashboardCollapsibleSection>
                </div>
              )}

              {isModeSectionVisible('intentions-sleep', isVisible('intentions-sleep')) && (
                <ResponsiveGrid columns="custom" className="lg:grid-cols-2" gap="medium">
                  <DailyIntentionCard
                    intention={todayIntention}
                    currentHour={currentHour}
                    onUpdated={() => {
                      void refetch();
                    }}
                  />

                  <SleepLogCard
                    latestLog={latestSleepLog}
                    stats={sleepStats}
                    onLogged={() => {
                      void refetch();
                    }}
                  />
                </ResponsiveGrid>
              )}

              {/* Priority 1: Quick Actions (Visible on all devices) */}
              {isModeSectionVisible('quick-actions', isVisible('quick-actions')) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {device.isMobile ? (
                      <StaggerContainer>
                        <ResponsiveStack spacing="compact">
                          <StaggerItem>
                            <Button
                              className="w-full justify-between h-auto py-3 text-left"
                              onClick={() => onNavigate('assessments')}
                            >
                              <div className="flex items-center gap-3">
                                <Brain className="h-5 w-5" />
                                <div>
                                  <div className="font-medium">Take Assessment</div>
                                  <div className="text-xs opacity-90">Get personalized insights</div>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </StaggerItem>

                          <StaggerItem>
                            <Button
                              variant="outline"
                              className="w-full justify-between h-auto py-3 text-left touch-manipulation min-h-[44px]"
                              onClick={() => onNavigate('chatbot')}
                            >
                              <div className="flex items-center gap-3">
                                <MessageCircle className="h-5 w-5" />
                                <span className="font-medium">Chat with AI</span>
                              </div>
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </StaggerItem>

                          <StaggerItem>
                            <Button
                              variant="outline"
                              className="w-full justify-between h-auto py-3 text-left touch-manipulation min-h-[44px]"
                              onClick={() => onNavigate('library')}
                            >
                              <div className="flex items-center gap-3">
                                <BookOpen className="h-5 w-5" />
                                <span className="font-medium">Browse Library</span>
                              </div>
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </StaggerItem>

                          <StaggerItem>
                            <Button
                              variant="outline"
                              className="w-full justify-between h-auto py-3 text-left touch-manipulation min-h-[44px]"
                              onClick={() => onNavigate('journal')}
                            >
                              <div className="flex items-center gap-3">
                                <BookOpen className="h-5 w-5" />
                                <span className="font-medium">Journal</span>
                              </div>
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </StaggerItem>

                          <StaggerItem>
                            <Button
                              variant="outline"
                              className="w-full justify-between h-auto py-3 text-left touch-manipulation min-h-[44px]"
                              onClick={() => onNavigate('progress')}
                            >
                              <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5" />
                                <span className="font-medium">View Progress</span>
                              </div>
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </StaggerItem>
                        </ResponsiveStack>
                      </StaggerContainer>
                    ) : (
                      <StaggerContainer>
                        <div className="grid md:grid-cols-2 gap-3">
                          <StaggerItem>
                            <Button
                              className="justify-start h-auto py-4 px-4"
                              onClick={() => onNavigate('assessments')}
                            >
                              <div className="flex items-center gap-3">
                                <Brain className="h-5 w-5" />
                                <div className="text-left">
                                  <div className="font-medium">Take Assessment</div>
                                  <div className="text-xs opacity-90">Get personalized insights</div>
                                </div>
                              </div>
                            </Button>
                          </StaggerItem>

                          <StaggerItem>
                            <Button
                              variant="outline"
                              className="justify-start h-auto py-4 px-4"
                              onClick={() => onNavigate('chatbot')}
                            >
                              <div className="flex items-center gap-3">
                                <MessageCircle className="h-5 w-5" />
                                <span className="font-medium">Chat with AI</span>
                              </div>
                            </Button>
                          </StaggerItem>

                          <StaggerItem>
                            <Button
                              variant="outline"
                              className="justify-start h-auto py-4 px-4"
                              onClick={() => onNavigate('library')}
                            >
                              <div className="flex items-center gap-3">
                                <BookOpen className="h-5 w-5" />
                                <span className="font-medium">Browse Library</span>
                              </div>
                            </Button>
                          </StaggerItem>

                          <StaggerItem>
                            <Button
                              variant="outline"
                              className="justify-start h-auto py-4 px-4"
                              onClick={() => onNavigate('journal')}
                            >
                              <div className="flex items-center gap-3">
                                <BookOpen className="h-5 w-5" />
                                <span className="font-medium">Journal</span>
                              </div>
                            </Button>
                          </StaggerItem>

                          <StaggerItem>
                            <Button
                              variant="outline"
                              className="justify-start h-auto py-4 px-4"
                              onClick={() => onNavigate('progress')}
                            >
                              <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5" />
                                <span className="font-medium">View Progress</span>
                              </div>
                            </Button>
                          </StaggerItem>
                        </div>
                      </StaggerContainer>
                    )}
                  </CardContent>
                </Card>
              )}

              {isModeSectionVisible('recommended-next-step', isVisible('recommended-next-step')) && (
                <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10">
                  <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:gap-6 md:p-5">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recommended next step</p>
                      <h2 className="text-base font-semibold text-foreground md:text-lg">{recommendedAction.title}</h2>
                      <p className="text-sm text-muted-foreground">{recommendedAction.description}</p>
                    </div>
                    <Button
                      className={device.isMobile ? 'w-full min-h-[44px] touch-manipulation' : ''}
                      onClick={recommendedAction.onAction}
                    >
                      {recommendedAction.cta}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Priority 2: Today's Practice */}
              {isModeSectionVisible('today-practice', isVisible('today-practice')) && (
                <DashboardCollapsibleSection
                  title="Recommended Practices"
                  summary="Personalized for your mood"
                  icon={<Headphones className="h-4 w-4" />}
                  defaultOpen={!device.isMobile}
                >
                  <Card className={device.isMobile ? '' : 'lg:col-span-2'}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <Play className="h-5 w-5 text-primary" />
                        Today&apos;s Practice
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Primary Practice - Prominent CTA */}
                      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4">
                        <div className={device.isMobile ? "space-y-3" : "flex items-start justify-between"}>
                          <div className="space-y-2 flex-1">
                            <h3 className="font-semibold text-base md:text-lg">{practiceTitle}</h3>
                            <p className="text-sm text-muted-foreground">
                              {practiceDescription}
                            </p>
                            <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground flex-wrap">
                              {practiceType && <span className="font-medium">{practiceType}</span>}
                              {practiceDuration && <span>{practiceDuration} min</span>}
                              {(() => {
                                const normalizedTags = Array.isArray(practiceTags)
                                  ? practiceTags
                                  : typeof practiceTags === 'string' && practiceTags.trim().length > 0
                                    ? [practiceTags]
                                    : [];

                                return normalizedTags
                                  .slice(0, device.isSmallPhone ? 1 : 2)
                                  .map((tag) => <span key={tag}>• {tag}</span>);
                              })()}
                              {(() => {
                                const normalizedTags = Array.isArray(practiceTags)
                                  ? practiceTags
                                  : typeof practiceTags === 'string' && practiceTags.trim().length > 0
                                    ? [practiceTags]
                                    : [];

                                return device.isSmallPhone && normalizedTags.length > 1 ? (
                                  <span>+{normalizedTags.length - 1}</span>
                                ) : null;
                              })()}
                            </div>
                            {recommendedPractice?.reason && (
                              <p className="text-xs text-primary/80 italic mt-2">
                                💡 {recommendedPractice.reason}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => launchPracticeFromDashboard({
                              id: recommendedPractice?.id,
                              title: practiceTitle,
                            })}
                            className={device.isMobile ? "w-full min-h-[44px] touch-manipulation" : ""}
                          >
                            Start Practice
                          </Button>
                        </div>
                      </div>

                      {/* Secondary Practices - Collapsible on mobile */}
                      {device.isMobile ? (
                        <DashboardCollapsibleSection
                          title="More Practices"
                          icon={<Heart className="h-4 w-4" />}
                          defaultOpen={false}
                          summary="2 additional practices available"
                        >
                          <ResponsiveStack spacing="compact">
                            <Button
                              variant="outline"
                              className="justify-start h-auto p-3 text-left w-full min-h-[44px] touch-manipulation"
                              onClick={() => launchPracticeFromDashboard({ title: '5-min Mindfulness' })}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Heart className="h-4 w-4" />
                                  <span className="font-medium text-sm">5-min Mindfulness</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Quick reset for busy days</p>
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              className="justify-start h-auto p-3 text-left w-full min-h-[44px] touch-manipulation"
                              onClick={() => launchPracticeFromDashboard({ title: 'Gentle Yoga' })}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4" />
                                  <span className="font-medium text-sm">Gentle Yoga</span>
                                </div>
                                <p className="text-xs text-muted-foreground">15-min body & mind</p>
                              </div>
                            </Button>
                          </ResponsiveStack>
                        </DashboardCollapsibleSection>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          <Button
                            variant="outline"
                            className="justify-start h-auto p-4"
                            onClick={() => launchPracticeFromDashboard({ title: '5-min Mindfulness' })}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4" />
                                <span className="font-medium">5-min Mindfulness</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Quick reset for busy days</p>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="justify-start h-auto p-4"
                            onClick={() => launchPracticeFromDashboard({ title: 'Gentle Yoga' })}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                <span className="font-medium">Gentle Yoga</span>
                              </div>
                              <p className="text-xs text-muted-foreground">15-min body & mind</p>
                            </div>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </DashboardCollapsibleSection>
              )}

              {/* Priority 3-4: Key Metrics - Horizontal carousel on mobile */}
              {false && isModeSectionVisible('assessment-scores', isVisible('assessment-scores')) && assessmentScores && (
                <>
                  {device.isMobile ? (
                    <div>
                      <h2 className="text-lg font-semibold mb-3 px-1">Your Metrics</h2>
                      <HorizontalScrollContainer snap={true}>
                        {/* Anxiety Card */}
                        <Card
                          role="img"
                          aria-label={`Anxiety level ${formatScore(assessmentScores.anxiety)} percent. ${getScoreInterpretation('anxiety', assessmentScores.anxiety || 0)}.`}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Brain className="h-5 w-5 text-primary" />
                              Anxiety Level
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-3xl font-bold">
                                  {formatScore(assessmentScores.anxiety)}%
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {getScoreInterpretation('anxiety', assessmentScores.anxiety || 0)}
                                </Badge>
                              </div>
                              <Progress value={assessmentScores.anxiety || 0} className="h-3" />
                              <p className="text-sm text-muted-foreground">
                                Based on your latest assessment
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Stress Card */}
                        <Card
                          role="img"
                          aria-label={`Stress level ${formatScore(assessmentScores.stress)} percent. ${getScoreInterpretation('stress', assessmentScores.stress || 0)}.`}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Target className="h-5 w-5 text-primary" />
                              Stress Level
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-3xl font-bold">
                                  {formatScore(assessmentScores.stress)}%
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {getScoreInterpretation('stress', assessmentScores.stress || 0)}
                                </Badge>
                              </div>
                              <Progress value={assessmentScores.stress || 0} className="h-3" />
                              <p className="text-sm text-muted-foreground">
                                Trending down this week
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Emotional Intelligence Card */}
                        <Card
                          role="img"
                          aria-label={`Emotional intelligence ${formatScore(assessmentScores.emotionalIntelligence)} percent. ${getScoreInterpretation('emotionalIntelligence', assessmentScores.emotionalIntelligence || 0)}.`}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-primary" />
                              Emotional Intelligence
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-3xl font-bold">
                                  {formatScore(assessmentScores.emotionalIntelligence)}%
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {getScoreInterpretation('emotionalIntelligence', assessmentScores.emotionalIntelligence || 0)}
                                </Badge>
                              </div>
                              <Progress value={assessmentScores.emotionalIntelligence || 0} className="h-3" />
                              <p className="text-sm text-muted-foreground">
                                Strong foundation to build on
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </HorizontalScrollContainer>
                    </div>
                  ) : (
                    /* Desktop & Tablet: Grid layout */
                    <ResponsiveGrid columns="custom" className="md:grid-cols-3" gap="medium">
                      <Card
                        role="img"
                        aria-label={`Anxiety level ${formatScore(assessmentScores.anxiety)} percent. ${getScoreInterpretation('anxiety', assessmentScores.anxiety || 0)}.`}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="h-5 w-5 text-primary" />
                            Anxiety Level
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-2xl font-semibold">
                                {formatScore(assessmentScores.anxiety)}%
                              </span>
                              <Badge variant="secondary">
                                {getScoreInterpretation('anxiety', assessmentScores.anxiety || 0)}
                              </Badge>
                            </div>
                            <Progress value={assessmentScores.anxiety || 0} className="h-2" />
                            <p className="text-sm text-muted-foreground">
                              Based on your latest assessment
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        role="img"
                        aria-label={`Stress level ${formatScore(assessmentScores.stress)} percent. ${getScoreInterpretation('stress', assessmentScores.stress || 0)}.`}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Stress Level
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-2xl font-semibold">
                                {formatScore(assessmentScores.stress)}%
                              </span>
                              <Badge variant="secondary">
                                {getScoreInterpretation('stress', assessmentScores.stress || 0)}
                              </Badge>
                            </div>
                            <Progress value={assessmentScores.stress || 0} className="h-2" />
                            <p className="text-sm text-muted-foreground">
                              Trending down this week
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        role="img"
                        aria-label={`Emotional intelligence ${formatScore(assessmentScores.emotionalIntelligence)} percent. ${getScoreInterpretation('emotionalIntelligence', assessmentScores.emotionalIntelligence || 0)}.`}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Emotional Intelligence
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-2xl font-semibold">
                                {formatScore(assessmentScores.emotionalIntelligence)}%
                              </span>
                              <Badge variant="secondary">
                                {getScoreInterpretation('emotionalIntelligence', assessmentScores.emotionalIntelligence || 0)}
                              </Badge>
                            </div>
                            <Progress value={assessmentScores.emotionalIntelligence || 0} className="h-2" />
                            <p className="text-sm text-muted-foreground">
                              Strong foundation to build on
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </ResponsiveGrid>
                  )}
                </>
              )}

              {/* Priority 5: Enhanced AI Insights & This Week */}
              {(showInsightsWidget || showThisWeekWidget) && (
                <ResponsiveGrid columns="custom" className="lg:grid-cols-2" gap="medium">
                  {showInsightsWidget && <EnhancedInsightsCard onNavigate={onNavigate} />}

                  {showThisWeekWidget && (
                    <>
                      {device.isMobile ? (
                        <DashboardCollapsibleSection
                          title="This Week"
                          icon={<Calendar className="h-5 w-5 text-primary" />}
                          defaultOpen={false}
                          summary={weeklyProgress ? `${weeklyProgress.practices.completed}/${weeklyProgress.practices.goal} practices • ${streakInfo.current}-day streak` : 'Loading...'}
                        >
                          {weeklyProgress ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm">Daily practices</span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {weeklyProgress.practices.completed}/{weeklyProgress.practices.goal}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="text-sm">Mood check-ins</span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {weeklyProgress.moodCheckins.completed}/{weeklyProgress.moodCheckins.goal}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className="text-sm">Assessments</span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {weeklyProgress.assessments.completed} completed
                                </Badge>
                              </div>

                              <div className="pt-3 border-t">
                                <div className="flex items-center gap-2 text-sm">
                                  <Award className={`h-4 w-4 ${streakInfo.current > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                                  <span className="text-muted-foreground">{streakInfo.message}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Loading progress...</p>
                          )}
                        </DashboardCollapsibleSection>
                      ) : (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-primary" />
                              This Week
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {weeklyProgress ? (
                              <>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-sm">Daily practices</span>
                                    </div>
                                    <Badge variant="secondary">
                                      {weeklyProgress.practices.completed}/{weeklyProgress.practices.goal}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <span className="text-sm">Mood check-ins</span>
                                    </div>
                                    <Badge variant="secondary">
                                      {weeklyProgress.moodCheckins.completed}/{weeklyProgress.moodCheckins.goal}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                      <span className="text-sm">Assessments</span>
                                    </div>
                                    <Badge variant="secondary">
                                      {weeklyProgress.assessments.completed} completed
                                    </Badge>
                                  </div>
                                </div>

                                <div className="pt-3 border-t">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Award className={`h-4 w-4 ${streakInfo.current > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                                    <span className="text-muted-foreground">{streakInfo.message}</span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">Loading progress...</p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </ResponsiveGrid>
              )}

              {/* Navigation Shortcuts - Hide on mobile (use bottom nav instead) */}
              {isModeSectionVisible('navigation-shortcuts', isVisible('navigation-shortcuts')) && !device.isMobile && (
                <ResponsiveGrid columns="custom" className="grid-cols-2 md:grid-cols-4" gap="small">
                  <Button
                    variant="ghost"
                    className="h-20 flex-col gap-2"
                    onClick={() => onNavigate('assessments')}
                  >
                    <Brain className="h-6 w-6 text-primary" />
                    <span className="text-sm">Assessments</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="h-20 flex-col gap-2"
                    onClick={() => onNavigate('practices')}
                  >
                    <Heart className="h-6 w-6 text-primary" />
                    <span className="text-sm">Practices</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="h-20 flex-col gap-2"
                    onClick={() => onNavigate('library')}
                  >
                    <BookOpen className="h-6 w-6 text-primary" />
                    <span className="text-sm">Library</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="h-20 flex-col gap-2"
                    onClick={() => onNavigate('help')}
                  >
                    <Heart className="h-6 w-6 text-primary" />
                    <span className="text-sm">Help</span>
                  </Button>
                </ResponsiveGrid>
              )}

            </div>

            {/* Spacer for bottom navigation on mobile */}
            <BottomNavigationSpacer />
          </ResponsiveContainer>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <BottomNavigation
          currentPage="dashboard"
          onNavigate={onNavigate}
        />
      </div>
    </>
  );
}
