import { PrismaClient } from '@prisma/client';
import { LLMService } from './llmProvider';
import { buildAssessmentInsights } from './assessmentInsightsService';
import { chatbotService } from './chatbotService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const llmService = new LLMService();
const serviceLogger = logger.child({ module: 'EnhancedInsightsService' });

interface AssessmentData {
  scores: Array<{
    type: string;
    score: number;
    interpretation?: string;
    createdAt: Date;
  }>;
  insights: string[];
  lastDate: Date | null;
}

interface ChatbotData {
  summaries: string[];
  emotionalStates: string[];
  keyTopics: string[];
  lastDate: Date | null;
}

interface CombinedInsightsData {
  assessments: AssessmentData;
  chatbot: ChatbotData;
  aiSummary: string;
  generatedAt: Date;
}

export class EnhancedInsightsService {
  /**
   * Get or generate dashboard insights with caching
   */
  async getDashboardInsights(userId: string, forceRefresh: boolean = false): Promise<CombinedInsightsData | null> {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = await this.getCachedInsights(userId);
        if (cached && new Date(cached.expiresAt) > new Date()) {
          serviceLogger.info({ userId, cached: true }, 'Using cached dashboard insights');
          return JSON.parse(cached.insightsData) as CombinedInsightsData;
        }
      }

      serviceLogger.info({ userId, forceRefresh }, 'Generating fresh dashboard insights');
      return await this.generateFreshInsights(userId);
    } catch (error) {
      serviceLogger.error({ error, userId }, 'Failed to get dashboard insights');
      throw error;
    }
  }

  /**
   * Check if user has new interactions since last cache
   */
  async hasNewInteractions(userId: string): Promise<boolean> {
    try {
      const cached = await prisma.dashboardInsights.findUnique({
        where: { userId },
      });

      if (!cached) {
        serviceLogger.debug({ userId }, 'No cache found, returning true');
        return true;
      }

      // Check for new assessments
      const newAssessments = await prisma.assessmentResult.count({
        where: {
          userId,
          completedAt: { gt: cached.lastAssessmentDate || new Date(0) },
        },
      });

      // Check for new completed chats
      const newChats = await prisma.chatbotConversation.count({
        where: {
          userId,
          endedAt: {
            not: null,
            gt: cached.lastChatDate || new Date(0),
          },
        },
      });

      const hasNew = newAssessments > 0 || newChats > 0;
      serviceLogger.debug(
        { userId, newAssessments, newChats, hasNew },
        'Checked for new interactions'
      );

      return hasNew;
    } catch (error) {
      serviceLogger.error({ error, userId }, 'Failed to check for new interactions');
      return true; // Assume new data on error
    }
  }

  /**
   * Generate fresh insights from assessments and chatbot data
   */
  private async generateFreshInsights(userId: string): Promise<CombinedInsightsData | null> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch assessment data (last 30 days)
    const assessments = await prisma.assessmentResult.findMany({
      where: {
        userId,
        completedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Fetch user info for personalization
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.firstName || user?.name || 'there';

    // Build assessment insights
    const assessmentInsights = assessments.length > 0
      ? await buildAssessmentInsights(assessments as any, { userName })
      : null;

    // Fetch chatbot conversations (last 30 days)
    const conversations = await prisma.chatbotConversation.findMany({
      where: {
        userId,
        endedAt: {
          not: null,
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { endedAt: 'desc' },
      take: 20, // Limit to recent 20 conversations
    });

    // No data at all → clean up stale cache and return null (don't generate generic insights)
    if (assessments.length === 0 && conversations.length === 0) {
      serviceLogger.info({ userId }, 'No assessments or conversations found, skipping insights generation');
      // Delete any stale cache so it won't be served on the next request
      try {
        await prisma.dashboardInsights.deleteMany({ where: { userId } });
        serviceLogger.debug({ userId }, 'Cleared stale cache for user with no data');
      } catch (cleanupError) {
        serviceLogger.error({ error: cleanupError, userId }, 'Failed to clear stale cache');
      }
      return null;
    }

    // Extract assessment data
    const assessmentData: AssessmentData = {
      scores: assessments.map((a: any) => ({
        type: a.assessmentType,
        score: a.score,
        interpretation: assessmentInsights?.insights?.byType?.[a.assessmentType]?.interpretation,
        createdAt: a.completedAt,
      })),
      insights: assessmentInsights?.insights?.byType
        ? Object.values(assessmentInsights.insights.byType).map((i: any) => i.interpretation)
        : [],
      lastDate: assessments[0]?.completedAt || null,
    };

    // Extract chatbot data
    const chatbotData: ChatbotData = {
      summaries: conversations.map((c: any) => c.summary).filter(Boolean) as string[],
      emotionalStates: conversations.map((c: any) => c.emotionalState).filter(Boolean) as string[],
      keyTopics: conversations.flatMap((c: any) => {
        try {
          return JSON.parse(c.keyTopics) as string[];
        } catch {
          return [];
        }
      }),
      lastDate: conversations[0]?.endedAt || null,
    };

    // Generate combined AI summary
    const aiSummary = await this.generateCombinedAISummary(
      assessmentInsights,
      chatbotData,
      userName
    );

    const insightsData: CombinedInsightsData = {
      assessments: assessmentData,
      chatbot: chatbotData,
      aiSummary,
      generatedAt: new Date(),
    };

    // Cache the insights
    await this.cacheInsights(userId, insightsData, assessments, conversations);

    serviceLogger.info(
      {
        userId,
        assessmentCount: assessments.length,
        chatCount: conversations.length,
        hasAISummary: !!aiSummary,
      },
      'Generated fresh insights successfully'
    );

    return insightsData;
  }

  /**
   * Generate combined AI summary from all data sources
   */
  private async generateCombinedAISummary(
    assessmentInsights: any,
    chatbotData: ChatbotData,
    userName: string
  ): Promise<string> {
    const context = this.buildCombinedContext(assessmentInsights, chatbotData, userName);

    try {
      serviceLogger.debug({ userName, contextLength: context.length }, 'Generating combined AI summary');

      const response = await llmService.generateResponse(
        [
          {
            role: 'system',
            content: `You are a compassionate wellbeing coach. Create a concise, holistic wellbeing summary (10-12 lines max) combining assessment results and chat conversations. Be warm, encouraging, and insightful. Focus on patterns, progress, and gentle next steps. Avoid repetition and keep it actionable and easy to read.`,
          },
          { role: 'user', content: context },
        ],
        {
          maxTokens: 300,
          temperature: 0.6,
          model: 'gpt-oss:20b-cloud',
        }
      );

      // Handle AIResponse object
      const summaryText = typeof response === 'string' ? response : response?.content || '';

      if (summaryText && summaryText.trim().length > 0) {
        serviceLogger.info('Combined AI summary generated successfully');
        return summaryText.trim();
      }

      serviceLogger.warn('AI returned empty summary, using fallback');
      return this.generateFallbackSummary(assessmentInsights, chatbotData);
    } catch (error) {
      serviceLogger.error({ error }, 'Failed to generate AI summary, using fallback');
      return this.generateFallbackSummary(assessmentInsights, chatbotData);
    }
  }

  /**
   * Build context string for AI summary generation
   */
  private buildCombinedContext(
    assessmentInsights: any,
    chatbotData: ChatbotData,
    userName: string
  ): string {
    let context = `Create a holistic wellbeing summary for ${userName}.\n\n`;

    // Add assessment context
    if (assessmentInsights?.insights?.byType) {
      context += `ASSESSMENT INSIGHTS:\n`;
      Object.entries(assessmentInsights.insights.byType).forEach(([type, data]: [string, any]) => {
        const label = this.formatAssessmentLabel(type);
        context += `- ${label}: ${data.interpretation} (trend: ${data.trend})\n`;
      });
      context += `\n`;
    }

    // Add chatbot conversation context
    if (chatbotData.summaries.length > 0) {
      context += `RECENT CONVERSATIONS:\n`;
      chatbotData.summaries.slice(0, 3).forEach((summary, i) => {
        context += `${i + 1}. ${summary}\n`;
      });
      context += `\n`;
    }

    // Add emotional patterns
    if (chatbotData.emotionalStates.length > 0) {
      const stateFrequency = this.countFrequency(chatbotData.emotionalStates);
      const topStates = Object.entries(stateFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([state]) => state);

      if (topStates.length > 0) {
        context += `Emotional patterns: ${topStates.join(', ')}\n`;
      }
    }

    // Add key topics
    if (chatbotData.keyTopics.length > 0) {
      const uniqueTopics = [...new Set(chatbotData.keyTopics)];
      context += `Key themes: ${uniqueTopics.slice(0, 5).join(', ')}\n`;
    }

    context += `\nProvide a warm, insightful summary (150-200 words) that:
1. Acknowledges their current wellbeing state
2. Highlights any progress or positive patterns
3. Notes areas needing attention (gently)
4. Offers one actionable suggestion
5. Ends with encouragement

Be compassionate, specific, and actionable.`;

    return context;
  }

  /**
   * Generate fallback summary when AI is unavailable
   */
  private generateFallbackSummary(assessmentInsights: any, chatbotData: ChatbotData): string {
    let summary = 'Here\'s an overview of your recent wellbeing journey: ';

    // Add assessment insights
    if (assessmentInsights?.insights?.byType) {
      const interpretations = Object.values(assessmentInsights.insights.byType)
        .map((i: any) => i.interpretation)
        .slice(0, 3)
        .join(', ');
      summary += interpretations + '. ';
    }

    // Add chat engagement
    if (chatbotData.summaries.length > 0) {
      summary += `You've engaged in ${chatbotData.summaries.length} meaningful conversations about your wellbeing. `;
    }

    // Add topics
    if (chatbotData.keyTopics.length > 0) {
      const uniqueTopics = [...new Set(chatbotData.keyTopics)];
      summary += `Recent focus areas include ${uniqueTopics.slice(0, 3).join(', ')}. `;
    }

    summary += 'Keep nurturing your wellbeing with consistent self-care practices. You\'re making important progress by staying engaged with your wellbeing.';

    return summary;
  }

  /**
   * Cache insights in database
   */
  private async cacheInsights(
    userId: string,
    insightsData: CombinedInsightsData,
    assessments: any[],
    conversations: any[]
  ): Promise<void> {
    try {
      // Set expiration to next midnight
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      await prisma.dashboardInsights.upsert({
        where: { userId },
        create: {
          userId,
          insightsData: JSON.stringify(insightsData),
          aiSummary: insightsData.aiSummary,
          assessmentCount: assessments.length,
          chatCount: conversations.length,
          lastAssessmentDate: assessments[0]?.completedAt || null,
          lastChatDate: conversations[0]?.endedAt || null,
          expiresAt: tomorrow,
        },
        update: {
          insightsData: JSON.stringify(insightsData),
          aiSummary: insightsData.aiSummary,
          assessmentCount: assessments.length,
          chatCount: conversations.length,
          lastAssessmentDate: assessments[0]?.completedAt || null,
          lastChatDate: conversations[0]?.endedAt || null,
          expiresAt: tomorrow,
          updatedAt: new Date(),
        },
      });

      serviceLogger.debug({ userId, expiresAt: tomorrow }, 'Cached insights successfully');
    } catch (error) {
      serviceLogger.error({ error, userId }, 'Failed to cache insights');
      // Non-critical error, don't throw
    }
  }

  /**
   * Get cached insights from database
   */
  private async getCachedInsights(userId: string) {
    try {
      return await prisma.dashboardInsights.findUnique({
        where: { userId },
      });
    } catch (error) {
      serviceLogger.error({ error, userId }, 'Failed to get cached insights');
      return null;
    }
  }

  /**
   * Helper: Format assessment type label
   */
  private formatAssessmentLabel(type: string): string {
    const labels: Record<string, string> = {
      anxiety: 'Anxiety',
      anxiety_assessment: 'Anxiety',
      stress: 'Stress',
      emotionalIntelligence: 'Emotional Intelligence',
      emotional_intelligence: 'Emotional Intelligence',
      overthinking: 'Overthinking',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Helper: Count frequency of items in array
   */
  private countFrequency(items: string[]): Record<string, number> {
    return items.reduce((acc: Record<string, number>, item: string) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get insights summary for dashboard display
   */
  async getInsightsSummary(userId: string): Promise<{
    totalAssessments: number;
    totalConversations: number;
    lastUpdated: Date | null;
    hasNewData: boolean;
  }> {
    try {
      const cached = await prisma.dashboardInsights.findUnique({
        where: { userId },
      });

      const hasNew = await this.hasNewInteractions(userId);

      return {
        totalAssessments: cached?.assessmentCount || 0,
        totalConversations: cached?.chatCount || 0,
        lastUpdated: cached?.generatedAt || null,
        hasNewData: hasNew,
      };
    } catch (error) {
      serviceLogger.error({ error, userId }, 'Failed to get insights summary');
      throw error;
    }
  }

  /**
   * Manually invalidate cache (force refresh on next request)
   */
  async invalidateCache(userId: string): Promise<void> {
    try {
      await prisma.dashboardInsights.deleteMany({
        where: { userId },
      });
      serviceLogger.info({ userId }, 'Cache invalidated manually');
    } catch (error) {
      serviceLogger.error({ error, userId }, 'Failed to invalidate cache');
      throw error;
    }
  }

  /**
   * Clean up expired caches (can be run as scheduled job)
   */
  async cleanupExpiredCaches(): Promise<number> {
    try {
      const result = await prisma.dashboardInsights.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      serviceLogger.info({ deletedCount: result.count }, 'Cleaned up expired caches');
      return result.count;
    } catch (error) {
      serviceLogger.error({ error }, 'Failed to cleanup expired caches');
      return 0;
    }
  }
}

export const enhancedInsightsService = new EnhancedInsightsService();
