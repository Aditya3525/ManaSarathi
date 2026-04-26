import { prisma } from '../config/database';
import { progressDetectionService } from './progressDetectionService';
import { recommendationService } from './recommendationService';
import type { UserContext } from '../types/ai';

export type DashboardMode =
  | 'morning-start'
  | 'evening-wind-down'
  | 'post-crisis'
  | 'low-mood-streak'
  | 'improving'
  | 'returning'
  | 'default';

export type OneThingActionType = 'practice' | 'checkin' | 'mood' | 'habit' | 'assessment' | 'chat';

export interface OneThingToday {
  title: string;
  description: string;
  actionType: OneThingActionType;
  actionData?: Record<string, unknown>;
}

export interface DashboardModeResult {
  mode: DashboardMode;
  priorityWidgets: string[];
  collapsedWidgets: string[];
  message?: string;
  oneThingToday?: OneThingToday;
}

type ModeWidgetConfig = {
  priorityWidgets: string[];
  collapsedWidgets: string[];
};

const NEGATIVE_MOODS = new Set(['struggling', 'anxious', 'sad', 'depressed', 'overwhelmed', 'low', 'bad']);
const ASSESSMENT_REMINDER_THRESHOLD_DAYS = 21;

const ALL_WIDGET_IDS = [
  'mood-check',
  'crisis-follow-up',
  'checkins',
  'smart-nudges',
  'community-insights',
  'assessment-reminder',
  'gratitude',
  'habits',
  'intentions-sleep',
  'quick-actions',
  'recommended-next-step',
  'today-practice',
  'assessment-scores',
  'recent-insights',
  'this-week',
  'navigation-shortcuts',
];

const normalizeApproach = (approach?: string | null): 'western' | 'eastern' | 'hybrid' => {
  if (approach === 'western' || approach === 'eastern' || approach === 'hybrid') {
    return approach;
  }
  return 'hybrid';
};

const toStartOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const toDayDiff = (recent: Date, older: Date): number => {
  const oneDayMs = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((toStartOfDay(recent).getTime() - toStartOfDay(older).getTime()) / oneDayMs));
};

const isCompletedToday = (value?: Date | null): boolean => {
  if (!value) {
    return false;
  }
  return toStartOfDay(value).getTime() === toStartOfDay(new Date()).getTime();
};

export class DashboardModeService {
  async computeMode(userId: string): Promise<DashboardModeResult> {
    const now = new Date();
    const startOfDay = toStartOfDay(now);
    const crisisCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [
      user,
      recentSessions,
      sessionsTodayCount,
      recentCrisisEvent,
      recentMoodEntries,
      moodEntriesTodayCount,
      activeHabits,
      latestAssessment,
      progressSignals,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          firstName: true,
          approach: true,
        },
      }),
      prisma.userSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 2,
        select: { startedAt: true },
      }),
      prisma.userSession.count({
        where: {
          userId,
          startedAt: { gte: startOfDay },
        },
      }),
      prisma.crisisEvent.findFirst({
        where: {
          userId,
          resolved: false,
          detectedAt: { gte: crisisCutoff },
        },
        orderBy: { detectedAt: 'desc' },
        select: {
          id: true,
          crisisLevel: true,
          detectedAt: true,
        },
      }),
      prisma.moodEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          mood: true,
          createdAt: true,
        },
      }),
      prisma.moodEntry.count({
        where: {
          userId,
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.userHabit.findMany({
        where: {
          userId,
          active: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          lastCompletedAt: true,
        },
        take: 15,
      }),
      prisma.assessmentResult.findFirst({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        select: {
          completedAt: true,
        },
      }),
      progressDetectionService.detectProgress(userId),
    ]);

    const priorSession = recentSessions.length > 1 ? recentSessions[1] : recentSessions[0];
    const daysSinceLastVisit = priorSession ? toDayDiff(now, priorSession.startedAt) : null;

    const isFirstVisitToday = sessionsTodayCount <= 1;
    const isLowMoodStreak =
      recentMoodEntries.length >= 3 &&
      recentMoodEntries.slice(0, 3).every((entry) => NEGATIVE_MOODS.has(entry.mood.toLowerCase()));

    const improvingSignal = progressSignals.find((signal) => signal.direction === 'improving');

    let mode: DashboardMode = 'default';

    if (recentCrisisEvent) {
      mode = 'post-crisis';
    } else if (daysSinceLastVisit !== null && daysSinceLastVisit >= 5) {
      mode = 'returning';
    } else if (isLowMoodStreak) {
      mode = 'low-mood-streak';
    } else if (improvingSignal) {
      mode = 'improving';
    } else if (isFirstVisitToday && now.getHours() < 12) {
      mode = 'morning-start';
    } else if (isFirstVisitToday && now.getHours() >= 17) {
      mode = 'evening-wind-down';
    }

    const { priorityWidgets, collapsedWidgets } = this.getWidgetConfiguration(mode);

    const oneThingToday = await this.buildOneThingToday({
      userId,
      user,
      recentCrisisEvent,
      moodEntriesTodayCount,
      activeHabits,
      latestAssessment,
      now,
    });

    return {
      mode,
      priorityWidgets,
      collapsedWidgets,
      message: this.getModeMessage(mode, user?.firstName || user?.name || 'there', {
        daysSinceLastVisit,
        improvingSignal: improvingSignal?.detail,
      }),
      oneThingToday,
    };
  }

  private getWidgetConfiguration(mode: DashboardMode): ModeWidgetConfig {
    switch (mode) {
      case 'post-crisis':
        return {
          priorityWidgets: ['crisis-follow-up', 'mood-check', 'checkins', 'today-practice'],
          collapsedWidgets: ['gratitude', 'habits', 'community-insights', 'assessment-reminder', 'navigation-shortcuts', 'assessment-scores'],
        };

      case 'returning': {
        const priorityWidgets = ['mood-check', 'quick-actions', 'recommended-next-step'];
        return {
          priorityWidgets,
          collapsedWidgets: ALL_WIDGET_IDS.filter((widgetId) => !priorityWidgets.includes(widgetId)),
        };
      }

      case 'low-mood-streak':
        return {
          priorityWidgets: ['mood-check', 'today-practice', 'assessment-reminder', 'quick-actions'],
          collapsedWidgets: ['assessment-scores', 'community-insights', 'habits', 'navigation-shortcuts'],
        };

      case 'improving':
        return {
          priorityWidgets: ['recent-insights', 'this-week', 'today-practice', 'assessment-scores'],
          collapsedWidgets: ['crisis-follow-up'],
        };

      case 'morning-start':
        return {
          priorityWidgets: ['checkins', 'mood-check', 'quick-actions', 'today-practice'],
          collapsedWidgets: ['gratitude'],
        };

      case 'evening-wind-down':
        return {
          priorityWidgets: ['checkins', 'intentions-sleep', 'gratitude', 'mood-check'],
          collapsedWidgets: ['quick-actions'],
        };

      default:
        return {
          priorityWidgets: [],
          collapsedWidgets: [],
        };
    }
  }

  private getModeMessage(
    mode: DashboardMode,
    userName: string,
    extras: { daysSinceLastVisit: number | null; improvingSignal?: string }
  ): string | undefined {
    switch (mode) {
      case 'post-crisis':
        return `Welcome back, ${userName}. Let us keep things gentle today and check in with how you are feeling first.`;
      case 'returning':
        return `Welcome back, ${userName}. It has been ${extras.daysSinceLastVisit ?? 'a few'} day(s) since your last visit, so we kept today focused and light.`;
      case 'low-mood-streak':
        return `You have had a tough few days, ${userName}. Let us focus on one supportive step at a time.`;
      case 'improving':
        return extras.improvingSignal
          ? `${extras.improvingSignal}`
          : `Nice momentum, ${userName}. You are showing encouraging progress.`;
      case 'morning-start':
        return `Good morning, ${userName}. Start with a simple check-in and one intentional practice.`;
      case 'evening-wind-down':
        return `Good evening, ${userName}. Let us help you wind down and close the day calmly.`;
      default:
        return undefined;
    }
  }

  private async buildOneThingToday(params: {
    userId: string;
    user: {
      id: string;
      name: string;
      firstName: string | null;
      approach: string | null;
    } | null;
    recentCrisisEvent: {
      id: string;
      crisisLevel: string;
      detectedAt: Date;
    } | null;
    moodEntriesTodayCount: number;
    activeHabits: Array<{
      id: string;
      title: string;
      lastCompletedAt: Date | null;
    }>;
    latestAssessment: {
      completedAt: Date;
    } | null;
    now: Date;
  }): Promise<OneThingToday | undefined> {
    const {
      userId,
      user,
      recentCrisisEvent,
      moodEntriesTodayCount,
      activeHabits,
      latestAssessment,
      now,
    } = params;

    if (recentCrisisEvent) {
      return {
        title: 'Gentle check-in',
        description: 'You recently had a difficult moment. Share how you feel right now, even in one sentence.',
        actionType: 'checkin',
        actionData: {
          crisisEventId: recentCrisisEvent.id,
        },
      };
    }

    if (moodEntriesTodayCount === 0) {
      return {
        title: 'Log today\'s mood',
        description: 'A 10-second mood check helps personalize your dashboard and support plan.',
        actionType: 'mood',
      };
    }

    const pendingHabit = activeHabits.find((habit) => !isCompletedToday(habit.lastCompletedAt));
    if (pendingHabit) {
      return {
        title: `Complete: ${pendingHabit.title}`,
        description: 'Keep your momentum with one tiny habit completion.',
        actionType: 'habit',
        actionData: {
          habitId: pendingHabit.id,
          habitTitle: pendingHabit.title,
        },
      };
    }

    const shouldRemindAssessment =
      !latestAssessment || toDayDiff(now, latestAssessment.completedAt) >= ASSESSMENT_REMINDER_THRESHOLD_DAYS;

    if (shouldRemindAssessment) {
      return {
        title: 'Take a quick assessment',
        description: 'A short assessment helps us calibrate recommendations to your current state.',
        actionType: 'assessment',
      };
    }

    if (user) {
      const recommendation = await this.getPracticeRecommendation(userId, user);
      if (recommendation) {
        return {
          title: recommendation.title,
          description: recommendation.description,
          actionType: 'practice',
          actionData: recommendation.actionData,
        };
      }
    }

    return {
      title: 'Start a supportive chat',
      description: 'A short check-in conversation can help you choose the best next step.',
      actionType: 'chat',
    };
  }

  private async getPracticeRecommendation(
    userId: string,
    user: {
      id: string;
      name: string;
      firstName: string | null;
      approach: string | null;
    }
  ): Promise<{
    title: string;
    description: string;
    actionData?: Record<string, unknown>;
  } | null> {
    try {
      const approach = normalizeApproach(user.approach);
      const userContext: UserContext = {
        id: user.id,
        name: user.name,
        firstName: user.firstName ?? undefined,
        approach,
        assessmentInsights: {
          byType: {},
          recommendations: [],
        },
      };

      const recommendations = await recommendationService.getContentRecommendations({
        userId,
        userContext,
        approach,
        maxItems: 1,
      });

      const item = recommendations.items[0];
      if (!item) {
        return null;
      }

      return {
        title: item.title,
        description: item.description || item.reason,
        actionData: {
          recommendationId: item.id,
          recommendationSource: item.source,
          recommendationType: item.type,
        },
      };
    } catch (error) {
      console.error('Unable to build practice recommendation for one-thing-today:', error);
      return null;
    }
  }
}

export const dashboardModeService = new DashboardModeService();
