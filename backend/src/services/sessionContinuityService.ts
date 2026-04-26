import { prisma } from '../config/database';
import { contextAwarenessService } from './contextAwarenessService';
import { progressDetectionService } from './progressDetectionService';

export interface SessionOpenerResult {
  greeting: string;
  hasContext: boolean;
  actionItems: string[];
  progressSummary?: string;
}

const DEFAULT_CONVERSATION_METRICS = {
  totalMessages: 0,
  avgMessageLength: 0,
  questionsAsked: 0,
  sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, 6);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return toStringArray(parsed);
    } catch {
      return value
        .split(/[\n,;]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .slice(0, 6);
    }
  }

  return [];
};

const extractTopTopics = (topicsRaw?: string | null): string[] => {
  if (!topicsRaw) {
    return [];
  }

  try {
    const parsed = JSON.parse(topicsRaw) as Record<
      string,
      {
        topic?: string;
        mentions?: number;
        lastMentioned?: string;
      }
    >;

    return Object.values(parsed)
      .sort((a, b) => {
        const byMentions = (b.mentions ?? 0) - (a.mentions ?? 0);
        if (byMentions !== 0) {
          return byMentions;
        }

        const aLast = a.lastMentioned ? new Date(a.lastMentioned).getTime() : 0;
        const bLast = b.lastMentioned ? new Date(b.lastMentioned).getTime() : 0;
        return bLast - aLast;
      })
      .map((entry) => (entry.topic ?? '').trim())
      .filter((topic) => topic.length > 0)
      .slice(0, 2);
  } catch {
    return [];
  }
};

const normalizeSummary = (summary?: string | null): string | undefined => {
  if (!summary) {
    return undefined;
  }

  const cleaned = summary.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return undefined;
  }

  return cleaned.length > 220 ? `${cleaned.slice(0, 217)}...` : cleaned;
};

const buildMetricsPayload = (rawMetrics?: string | null, conversationId?: string): string => {
  let parsedMetrics: Record<string, unknown> = { ...DEFAULT_CONVERSATION_METRICS };

  if (rawMetrics) {
    try {
      const candidate = JSON.parse(rawMetrics) as Record<string, unknown>;
      if (candidate && typeof candidate === 'object') {
        parsedMetrics = {
          ...DEFAULT_CONVERSATION_METRICS,
          ...candidate,
        };
      }
    } catch {
      parsedMetrics = { ...DEFAULT_CONVERSATION_METRICS };
    }
  }

  if (conversationId) {
    parsedMetrics.lastConversationId = conversationId;
  }

  return JSON.stringify(parsedMetrics);
};

export class SessionContinuityService {
  async buildSessionOpener(userId: string): Promise<SessionOpenerResult> {
    const [user, memory, progressSignals, recentEngagements] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          name: true,
        },
      }),
      prisma.conversationMemory.findUnique({
        where: { userId },
        select: {
          topics: true,
          actionItems: true,
          lastSessionSummary: true,
          lastSessionDate: true,
        },
      }),
      progressDetectionService.detectProgress(userId),
      prisma.contentEngagement.count({
        where: {
          userId,
          completed: true,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const displayName = user?.firstName || user?.name || 'there';
    const timeContext = contextAwarenessService.getTimeContext(new Date());
    const baseGreeting = contextAwarenessService.generateGreeting(displayName, timeContext);

    const actionItems = toStringArray(memory?.actionItems as unknown);
    const lastSessionSummary = normalizeSummary(memory?.lastSessionSummary);
    const topTopics = extractTopTopics(memory?.topics);
    const progressSignal = progressSignals.find((signal) => signal.direction === 'improving');
    const progressSummary = progressSignal?.detail;

    const hasContext = Boolean(lastSessionSummary || actionItems.length > 0 || topTopics.length > 0);

    if (!hasContext) {
      const fallbackParts: string[] = [];

      if (progressSummary) {
        fallbackParts.push(progressSummary);
      }

      if (recentEngagements > 0) {
        fallbackParts.push(`You completed ${recentEngagements} wellbeing activit${recentEngagements === 1 ? 'y' : 'ies'} in the last week.`);
      }

      const suffix = fallbackParts.length > 0
        ? ` ${fallbackParts.join(' ')} What would feel most helpful right now?`
        : ' How are you feeling right now?';

      return {
        greeting: `${baseGreeting}${suffix}`,
        hasContext: false,
        actionItems: [],
        progressSummary,
      };
    }

    const contextualSegments: string[] = [];

    if (lastSessionSummary) {
      contextualSegments.push(`Last time we explored: ${lastSessionSummary}`);
    } else if (topTopics.length > 0) {
      contextualSegments.push(`Last time we focused on ${topTopics.join(' and ')}.`);
    }

    if (actionItems.length > 0) {
      contextualSegments.push(`You planned to: ${actionItems[0]}.`);
    }

    if (progressSummary) {
      contextualSegments.push(progressSummary);
    }

    if (recentEngagements > 0) {
      contextualSegments.push(`You completed ${recentEngagements} wellbeing activit${recentEngagements === 1 ? 'y' : 'ies'} in the last week.`);
    }

    const lastSessionDate = memory?.lastSessionDate
      ? new Date(memory.lastSessionDate as unknown as string | Date)
      : null;

    if (lastSessionDate && !Number.isNaN(lastSessionDate.getTime())) {
      const daysSinceLastSession = Math.max(
        0,
        Math.floor((Date.now() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      if (daysSinceLastSession > 0) {
        contextualSegments.push(`It has been ${daysSinceLastSession} day${daysSinceLastSession === 1 ? '' : 's'} since we last talked.`);
      }
    }

    return {
      greeting: `${baseGreeting} ${contextualSegments.join(' ')} Would you like to continue from there, or explore something new today?`,
      hasContext: true,
      actionItems,
      progressSummary,
    };
  }

  async saveSessionClosing(
    userId: string,
    conversationId: string,
    summary: string,
    actionItems: string[]
  ): Promise<void> {
    const normalizedSummary = summary.trim().replace(/\s+/g, ' ').slice(0, 1200);
    const normalizedActionItems = Array.from(
      new Set(
        actionItems
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    ).slice(0, 6);

    const existingMemory = await prisma.conversationMemory.findUnique({
      where: { userId },
      select: {
        conversationMetrics: true,
      },
    });

    const conversationMetrics = buildMetricsPayload(existingMemory?.conversationMetrics, conversationId);

    await prisma.conversationMemory.upsert({
      where: { userId },
      create: {
        userId,
        topics: '{}',
        emotionalPatterns: JSON.stringify({
          predominant: 'stable',
          recentShift: 'stable',
        }),
        importantMoments: '[]',
        conversationMetrics,
        actionItems: normalizedActionItems as unknown as object,
        lastSessionSummary: normalizedSummary || null,
        lastSessionDate: new Date(),
      },
      update: {
        conversationMetrics,
        actionItems: normalizedActionItems as unknown as object,
        lastSessionSummary: normalizedSummary || null,
        lastSessionDate: new Date(),
      },
    });
  }
}

export const sessionContinuityService = new SessionContinuityService();
