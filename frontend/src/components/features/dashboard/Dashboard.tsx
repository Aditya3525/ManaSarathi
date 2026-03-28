import { Award, BookOpen, Brain, Calendar, ChevronRight, Heart, MessageCircle, Moon, MoreVertical, Play, Sparkles, Sun, Target, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccessibility } from '../../../contexts/AccessibilityContext';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useDevice } from '../../../hooks/use-device';
import {
  useDashboardData,
  usePullToRefresh,
  useSaveMood,
  useWeeklyProgress
} from '../../../hooks/useDashboardData';
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
import { Progress } from '../../ui/progress';
import {
  CollapsibleSection,
  HorizontalScrollContainer,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack
} from '../../ui/responsive-layout';

import {
  DashboardLoadingSkeleton,
  ErrorMessage,
  NetworkStatus,
  PullToRefreshIndicator,
  useOnlineStatus
} from './DashboardLoadingStates';
import { EnhancedInsightsCard } from './EnhancedInsightsCard';

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

export function Dashboard({ user: userProp, onNavigate, onLogout, showTour = false, onTourDismiss, onTourComplete }: DashboardProps) {
  const [todayMood, setTodayMood] = useState<string>('');
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const moodCheckRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { settings: accessibilitySettings, setSetting: setAccessibilitySetting } = useAccessibility();
  const { checkIsUserAdmin } = useAdminAuth();
  const { visibility, updateVisibility, isVisible } = useWidgetVisibility();
  const device = useDevice();

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const { data: weeklyData } = useWeeklyProgress();
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

  // Use dashboard data or fallback to prop
  const user = dashboardData?.user || userProp;
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

  // Mood selection handler with API call
  const handleMoodSelect = async (mood: string) => {
    setTodayMood(mood);
    try {
      await saveMood.mutateAsync({ mood });
    } catch (error) {
      console.error('Failed to save mood:', error);
    }
  };

  const moodOptions = [
    { mood: 'Great', emoji: '😊', color: 'bg-green-100 text-green-800' },
    { mood: 'Good', emoji: '🙂', color: 'bg-blue-100 text-blue-800' },
    { mood: 'Okay', emoji: '😐', color: 'bg-yellow-100 text-yellow-800' },
    { mood: 'Struggling', emoji: '😔', color: 'bg-orange-100 text-orange-800' },
    { mood: 'Anxious', emoji: '😰', color: 'bg-red-100 text-red-800' },
  ];

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour < 12) timeGreeting = t('dashboard.goodMorning');
    else if (hour < 17) timeGreeting = t('dashboard.goodAfternoon');
    else timeGreeting = t('dashboard.goodEvening');

    // Personalized greeting based on user profile completeness
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'there';
    return `${timeGreeting}, ${fullName}! 👋`;
  };

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
        onAction: () => onNavigate('practices')
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
  }, [todayMood, weeklyProgress, profileCompletion, assessmentScores, onNavigate]);

  // Loading state
  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <ErrorMessage
        title="Failed to load dashboard"
        message="We couldn't load your dashboard data. Please check your connection and try again."
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

      <div className="min-h-screen bg-background pb-safe">
        {/* Header - Responsive */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-start mb-4 md:mb-6">
              {/* Greeting - Compact on mobile */}
              <div className="space-y-1 md:space-y-2 flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold truncate">
                  {getWelcomeMessage()}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  {t('dashboard.howFeeling')}
                </p>
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

            {/* Quick Mood Check - Horizontal scroll on mobile */}
            {isVisible('mood-check') && (
              <div ref={moodCheckRef}>
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Heart className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="font-medium text-sm md:text-base">Quick mood check</span>
                    </div>
                    <div className={device.isMobile ? "flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 snap-x snap-mandatory" : "flex gap-2 flex-wrap"}>
                      {moodOptions.map(({ mood, emoji, color }) => {
                        const isSelected = todayMood === mood;
                        return (
                          <Button
                            key={mood}
                            variant="outline"
                            size="sm"
                            className={`${isSelected ? `${color} border-transparent shadow-sm` : ''} ${device.isMobile ? 'flex-shrink-0 snap-start min-h-[44px]' : ''} touch-manipulation`}
                            onClick={() => handleMoodSelect(mood)}
                            disabled={saveMood.isPending}
                            aria-pressed={isSelected}
                            aria-label={`Set mood to ${mood}`}
                          >
                            <span className="mr-2">{emoji}</span>
                            {mood}
                          </Button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
                      {saveMood.isPending
                        ? 'Saving your check-in...'
                        : todayMood
                          ? `Mood saved as ${todayMood}. Recommendations will adapt for today.`
                          : 'Choose a mood to personalize your dashboard.'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <ResponsiveContainer spacing="medium">
            {/* Priority 1: Quick Actions (Visible on all devices) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                {device.isMobile ? (
                  <ResponsiveStack spacing="compact">
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
                  </ResponsiveStack>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
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
                  </div>
                )}
              </CardContent>
            </Card>

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

            {/* Priority 2: Today's Practice */}
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
                      onClick={() => onNavigate('practices')}
                      className={device.isMobile ? "w-full min-h-[44px] touch-manipulation" : ""}
                    >
                      Start Practice
                    </Button>
                  </div>
                </div>

                {/* Secondary Practices - Collapsible on mobile */}
                {device.isMobile ? (
                  <CollapsibleSection
                    title="More Practices"
                    icon={<Heart className="h-4 w-4" />}
                    defaultOpen={false}
                    summary="2 additional practices available"
                  >
                    <ResponsiveStack spacing="compact">
                      <Button
                        variant="outline"
                        className="justify-start h-auto p-3 text-left w-full min-h-[44px] touch-manipulation"
                        onClick={() => onNavigate('practices')}
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
                        onClick={() => onNavigate('practices')}
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
                  </CollapsibleSection>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="justify-start h-auto p-4"
                      onClick={() => onNavigate('practices')}
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
                      onClick={() => onNavigate('practices')}
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

            {/* Priority 3-4: Key Metrics - Horizontal carousel on mobile */}
            {isVisible('assessment-scores') && assessmentScores && (
              <>
                {device.isMobile ? (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 px-1">Your Metrics</h2>
                    <HorizontalScrollContainer snap={true}>
                      {/* Anxiety Card */}
                      <Card>
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
                      <Card>
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
                      <Card>
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
                    <Card>
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

                    <Card>
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

                    <Card>
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
            <ResponsiveGrid columns="custom" className="lg:grid-cols-2" gap="medium">
              {/* Enhanced Insights Card - replaces old Recent Insights */}
              <EnhancedInsightsCard onNavigate={onNavigate} />

              {device.isMobile ? (
                <CollapsibleSection
                  title="This Week"
                  icon={<Calendar className="h-5 w-5 text-primary" />}
                  defaultOpen={false}
                  summary={weeklyProgress ? `${weeklyProgress.practices.completed}/${weeklyProgress.practices.goal} practices • ${streakInfo.current}-day streak` : "Loading..."}
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
                </CollapsibleSection>
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
            </ResponsiveGrid>

            {/* Navigation Shortcuts - Hide on mobile (use bottom nav instead) */}
            {isVisible('navigation-shortcuts') && !device.isMobile && (
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
