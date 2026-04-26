import { prisma } from '../config/database';

export type AdaptiveNudgeType = 'milestone' | 'nudge';

export interface AdaptiveNudge {
  id: string;
  type: AdaptiveNudgeType;
  message: string;
  ctaLabel?: string;
  ctaPage?: string;
  createdAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toStartOfDay = (input: Date): Date => {
  const start = new Date(input);
  start.setHours(0, 0, 0, 0);
  return start;
};

const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const createId = (prefix: string): string => {
  return `${prefix}-${Date.now()}`;
};

const getHabitModel = () => {
  return (prisma as any).userHabit;
};

const extractTopicFromMessage = (content?: string | null): string | null => {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  const firstSentence = normalized.split(/[.!?]/).map((chunk) => chunk.trim()).find(Boolean) ?? normalized;
  if (!firstSentence) {
    return null;
  }

  if (firstSentence.length <= 90) {
    return firstSentence;
  }

  return `${firstSentence.slice(0, 87)}...`;
};

const calculateMoodStreak = async (userId: string): Promise<number> => {
  const entries = await prisma.moodEntry.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 120,
  });

  if (entries.length === 0) {
    return 0;
  }

  const uniqueDays = new Set(
    entries.map((entry) => toStartOfDay(new Date(entry.createdAt)).toISOString())
  );

  let streak = 0;
  const today = toStartOfDay(new Date());

  for (let offset = 0; offset < 120; offset += 1) {
    const targetDay = new Date(today);
    targetDay.setDate(targetDay.getDate() - offset);

    if (uniqueDays.has(targetDay.toISOString())) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
};

const getLastConversationFollowUp = async (userId: string): Promise<{ topic: string | null; lastMessageAt: Date } | null> => {
  const conversation = await prisma.conversation.findFirst({
    where: {
      userId,
      isArchived: false,
    },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      messages: {
        where: { type: 'user' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  const latestUserMessage = conversation.messages[0]?.content ?? null;
  const topic = extractTopicFromMessage(latestUserMessage) || conversation.title || null;

  return {
    topic,
    lastMessageAt: conversation.lastMessageAt,
  };
};

type HabitSnapshot = {
  id: string;
  title: string;
  cue: string;
  active: boolean;
  streak: number;
  lastCompletedAt: Date | null;
};

const getActiveHabits = async (userId: string): Promise<HabitSnapshot[]> => {
  const habitModel = getHabitModel();
  if (!habitModel) {
    return [];
  }

  const habits = await habitModel.findMany({
    where: {
      userId,
      active: true,
    },
    orderBy: [
      { streak: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: 6,
    select: {
      id: true,
      title: true,
      cue: true,
      active: true,
      streak: true,
      lastCompletedAt: true,
    },
  });

  return habits;
};

const buildHabitNudge = (habits: HabitSnapshot[]): AdaptiveNudge | null => {
  if (habits.length === 0) {
    return null;
  }

  const today = new Date();
  const pendingHabit = habits.find((habit) => {
    if (!habit.lastCompletedAt) {
      return true;
    }
    return !isSameDay(new Date(habit.lastCompletedAt), today);
  });

  if (!pendingHabit) {
    return null;
  }

  return {
    id: createId('habit-nudge'),
    type: 'nudge',
    message: `${pendingHabit.cue}: keep your "${pendingHabit.title}" loop alive with a quick check-in.`,
    ctaLabel: 'Mark habit complete',
    ctaPage: 'dashboard',
    createdAt: new Date().toISOString(),
  };
};

export const getAdaptiveNudges = async (userId: string): Promise<AdaptiveNudge[]> => {
  const nudges: AdaptiveNudge[] = [];

  const [streak, followUp, habits] = await Promise.all([
    calculateMoodStreak(userId),
    getLastConversationFollowUp(userId),
    getActiveHabits(userId),
  ]);

  if (streak > 0 && streak % 7 === 0) {
    nudges.push({
      id: createId('milestone'),
      type: 'milestone',
      message: `Amazing work! ${streak} day streak of prioritizing yourself. Keep this momentum going.`,
      ctaLabel: 'Log today\'s mood',
      ctaPage: 'dashboard',
      createdAt: new Date().toISOString(),
    });
  }

  const habitMilestone = habits.find((habit) => habit.streak > 0 && habit.streak % 7 === 0);
  if (habitMilestone) {
    nudges.push({
      id: createId('habit-milestone'),
      type: 'milestone',
      message: `Habit milestone unlocked: ${habitMilestone.streak} days of "${habitMilestone.title}".`,
      ctaLabel: 'View habit loops',
      ctaPage: 'dashboard',
      createdAt: new Date().toISOString(),
    });
  }

  if (followUp) {
    const elapsedMs = Date.now() - new Date(followUp.lastMessageAt).getTime();
    if (elapsedMs >= DAY_MS) {
      const topicSnippet = followUp.topic ? `"${followUp.topic}"` : 'what was on your mind';
      nudges.push({
        id: createId('conversation-nudge'),
        type: 'nudge',
        message: `Yesterday you shared ${topicSnippet}. Want to continue the conversation?`,
        ctaLabel: 'Continue in chat',
        ctaPage: 'chatbot',
        createdAt: new Date().toISOString(),
      });
    }
  }

  const habitNudge = buildHabitNudge(habits);
  if (habitNudge) {
    nudges.push(habitNudge);
  }

  if (streak === 0 && habits.length === 0) {
    nudges.push({
      id: createId('checkin-nudge'),
      type: 'nudge',
      message: 'A quick mood check-in today can sharpen your recommendations and track your progress.',
      ctaLabel: 'Check in now',
      ctaPage: 'dashboard',
      createdAt: new Date().toISOString(),
    });
  }

  return nudges.slice(0, 3);
};
