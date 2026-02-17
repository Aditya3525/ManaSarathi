import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const memoryLogger = logger.child({ module: 'ConversationMemory' });

/**
 * Types for Conversation Memory
 */
export interface ConversationTopic {
  topic: string;
  mentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  firstMentioned: Date;
  lastMentioned: Date;
  relatedKeywords: string[];
}

export interface ConversationContext {
  userId: string;
  recentTopics: ConversationTopic[];
  recurringThemes: string[];
  emotionalPatterns: EmotionalPattern[];
  importantMoments: ImportantMoment[];
  conversationStyle: ConversationStyle;
  averageSessionsPerWeek?: number;
}

export interface EmotionalPattern {
  emotion: string;
  frequency: number;
  triggers: string[];
  copingStrategies: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface ImportantMoment {
  id: string;
  timestamp: Date;
  summary: string;
  topic: string;
  emotionalImpact: 'high' | 'medium' | 'low';
  userMessage: string;
  aiResponse: string;
}

export interface ConversationStyle {
  preferredLength: 'brief' | 'moderate' | 'detailed';
  responsiveness: 'high' | 'medium' | 'low';
  topicDepth: 'surface' | 'moderate' | 'deep';
  questionAsking: number; // frequency of user asking questions
}

/**
 * Conversation Memory Service
 * Tracks conversation topics, patterns, and context across sessions
 */
export class ConversationMemoryService {
  
  /**
   * Extract topics from a message using keyword matching and NLP
   */
  private extractTopics(message: string): string[] {
    const topicKeywords: Record<string, string[]> = {
      anxiety: ['anxious', 'anxiety', 'worry', 'worried', 'panic', 'nervous', 'fear', 'afraid'],
      depression: ['depressed', 'depression', 'sad', 'sadness', 'hopeless', 'empty', 'numb', 'down'],
      stress: ['stress', 'stressed', 'pressure', 'overwhelmed', 'tension', 'stressful'],
      sleep: ['sleep', 'sleeping', 'insomnia', 'tired', 'exhausted', 'fatigue', 'rest'],
      work: ['work', 'job', 'career', 'office', 'boss', 'colleague', 'deadline', 'project'],
      relationships: ['relationship', 'partner', 'spouse', 'dating', 'marriage', 'breakup', 'divorce'],
      family: ['family', 'mother', 'father', 'parent', 'child', 'children', 'sibling', 'mom', 'dad'],
      social: ['friend', 'friends', 'social', 'lonely', 'alone', 'isolated', 'connection'],
      health: ['health', 'healthy', 'sick', 'illness', 'pain', 'medical', 'doctor', 'hospital'],
      self_esteem: ['confidence', 'self-esteem', 'worth', 'worthless', 'failure', 'success', 'achievement'],
      mindfulness: ['meditation', 'mindfulness', 'breathing', 'yoga', 'relaxation', 'calm'],
      exercise: ['exercise', 'workout', 'fitness', 'running', 'gym', 'physical activity'],
      diet: ['food', 'eating', 'diet', 'nutrition', 'appetite', 'weight'],
      trauma: ['trauma', 'traumatic', 'ptsd', 'flashback', 'trigger', 'abuse'],
      grief: ['grief', 'loss', 'death', 'died', 'mourning', 'bereavement'],
      substance: ['alcohol', 'drinking', 'drugs', 'substance', 'addiction', 'smoking']
    };

    const lowerMessage = message.toLowerCase();
    const extractedTopics: string[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        extractedTopics.push(topic);
      }
    }

    return extractedTopics;
  }

  /**
   * Analyze sentiment of a message
   */
  private analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['better', 'good', 'great', 'happy', 'hopeful', 'relief', 'progress', 'improving', 'calm', 'grateful', 'peaceful'];
    const negativeWords = ['bad', 'worse', 'terrible', 'awful', 'anxious', 'worried', 'sad', 'depressed', 'stressed', 'overwhelmed', 'hopeless'];

    const lowerMessage = message.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (lowerMessage.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerMessage.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Update conversation memory with new message
   */
  async updateMemory(userId: string, message: string, messageType: 'user' | 'bot'): Promise<void> {
    try {
      if (messageType !== 'user') return; // Only analyze user messages for memory

      const topics = this.extractTopics(message);
      const sentiment = this.analyzeSentiment(message);
      const now = new Date();

      // Get or create memory record
      let memory = await prisma.conversationMemory.findUnique({
        where: { userId }
      });

      if (!memory) {
        memory = await prisma.conversationMemory.create({
          data: {
            userId,
            topics: JSON.stringify({}),
            emotionalPatterns: JSON.stringify({
              predominant: 'stable',
              recentShift: 'stable'
            }),
            importantMoments: JSON.stringify([]),
            conversationMetrics: JSON.stringify({
              totalMessages: 0,
              avgMessageLength: 0,
              questionsAsked: 0,
              sentimentCounts: { positive: 0, neutral: 0, negative: 0 }
            })
          }
        });
      }

      // Update topics
      const currentTopics = JSON.parse(memory.topics as string) || {};
      topics.forEach(topic => {
        if (!currentTopics[topic]) {
          currentTopics[topic] = {
            topic,
            mentions: 0,
            sentiment,
            firstMentioned: now.toISOString(),
            lastMentioned: now.toISOString(),
            relatedKeywords: []
          };
        }
        currentTopics[topic].mentions++;
        currentTopics[topic].lastMentioned = now.toISOString();
        currentTopics[topic].sentiment = sentiment;
      });

      // Update conversation metrics
      const metrics = JSON.parse(memory.conversationMetrics as string) || { 
        totalMessages: 0, 
        avgMessageLength: 0, 
        questionsAsked: 0,
        sentimentCounts: { positive: 0, neutral: 0, negative: 0 }
      };
      metrics.totalMessages++;
      metrics.avgMessageLength = Math.round(
        (metrics.avgMessageLength * (metrics.totalMessages - 1) + message.length) / metrics.totalMessages
      );
      if (message.includes('?')) {
        metrics.questionsAsked++;
      }

      // Update sentiment counts
      if (!metrics.sentimentCounts) {
        metrics.sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      }
      metrics.sentimentCounts[sentiment]++;

      // Calculate predominant emotion and recent shift
      const emotionalPatterns = JSON.parse(memory.emotionalPatterns as string) || { 
        predominant: 'stable', 
        recentShift: 'stable' 
      };
      
      const sentimentCounts = metrics.sentimentCounts;
      const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
      
      if (total > 0) {
        const positiveRatio = sentimentCounts.positive / total;
        const negativeRatio = sentimentCounts.negative / total;
        
        // Determine predominant mood
        if (positiveRatio > 0.6) {
          emotionalPatterns.predominant = 'content';
        } else if (positiveRatio > 0.4) {
          emotionalPatterns.predominant = 'hopeful';
        } else if (negativeRatio > 0.6) {
          emotionalPatterns.predominant = 'anxious';
        } else if (negativeRatio > 0.4) {
          emotionalPatterns.predominant = 'stressed';
        } else {
          emotionalPatterns.predominant = 'stable';
        }

        // Determine recent shift (compare last 5 messages if possible)
        if (metrics.totalMessages >= 10) {
          const recentPositiveRatio = positiveRatio;
          const previousPositiveRatio = (sentimentCounts.positive - (sentiment === 'positive' ? 1 : 0)) / (total - 1);
          
          if (recentPositiveRatio > previousPositiveRatio + 0.1) {
            emotionalPatterns.recentShift = 'improving';
          } else if (recentPositiveRatio < previousPositiveRatio - 0.1) {
            emotionalPatterns.recentShift = 'declining';
          } else {
            emotionalPatterns.recentShift = 'stable';
          }
        }
      }

      // Save updated memory
      await prisma.conversationMemory.update({
        where: { userId },
        data: {
          topics: JSON.stringify(currentTopics),
          emotionalPatterns: JSON.stringify(emotionalPatterns),
          conversationMetrics: JSON.stringify(metrics),
          updatedAt: now
        }
      });

      memoryLogger.info({ userId, topics, sentiment }, 'Conversation memory updated');
    } catch (error) {
      memoryLogger.error({ userId, error }, 'Failed to update conversation memory');
    }
  }

  /**
   * Get conversation memory for user
   */
  async getMemory(userId: string): Promise<ConversationContext> {
    try {
      const memory = await prisma.conversationMemory.findUnique({
        where: { userId }
      });

      if (!memory) {
        return {
          userId,
          recentTopics: [],
          recurringThemes: [],
          emotionalPatterns: [],
          importantMoments: [],
          conversationStyle: {
            preferredLength: 'moderate',
            responsiveness: 'medium',
            topicDepth: 'moderate',
            questionAsking: 0
          }
        };
      }

      // Parse topics and apply time-based decay / TTL
      const topicsData = JSON.parse(memory.topics as string) || {};
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

      const recentTopics = (Object.values(topicsData) as any[])
        // Exclude topics not mentioned in 90+ days (stale memory)
        .filter((t: any) => {
          const lastMentionedMs = new Date(t.lastMentioned).getTime();
          return now - lastMentionedMs < NINETY_DAYS_MS;
        })
        .map((t: any) => {
          // Reduce effective mention count for topics 30-90 days old
          const lastMentionedMs = new Date(t.lastMentioned).getTime();
          const ageMs = now - lastMentionedMs;
          const decayFactor = ageMs > THIRTY_DAYS_MS ? 0.5 : 1;
          return { ...t, effectiveMentions: Math.round(t.mentions * decayFactor) };
        })
        .sort((a: any, b: any) => new Date(b.lastMentioned).getTime() - new Date(a.lastMentioned).getTime())
        .slice(0, 10) as ConversationTopic[];

      // Identify recurring themes (topics with 3+ effective mentions)
      const recurringThemes = (Object.values(topicsData) as any[])
        .filter((t: any) => {
          const lastMentionedMs = new Date(t.lastMentioned).getTime();
          if (now - lastMentionedMs >= NINETY_DAYS_MS) return false;
          const ageMs = now - lastMentionedMs;
          const decayFactor = ageMs > THIRTY_DAYS_MS ? 0.5 : 1;
          return Math.round(t.mentions * decayFactor) >= 3;
        })
        .map((t: any) => t.topic) as string[];

      // Analyze conversation style
      const metrics = JSON.parse(memory.conversationMetrics as string) || { totalMessages: 0, avgMessageLength: 0, questionsAsked: 0 };
      const conversationStyle: ConversationStyle = {
        preferredLength: metrics.avgMessageLength < 50 ? 'brief' : metrics.avgMessageLength < 150 ? 'moderate' : 'detailed',
        responsiveness: metrics.totalMessages > 20 ? 'high' : metrics.totalMessages > 10 ? 'medium' : 'low',
        topicDepth: recurringThemes.length > 3 ? 'deep' : recurringThemes.length > 1 ? 'moderate' : 'surface',
        questionAsking: metrics.questionsAsked
      };

      return {
        userId,
        recentTopics,
        recurringThemes,
        emotionalPatterns: [],
        importantMoments: [],
        conversationStyle
      };
    } catch (error) {
      memoryLogger.error({ userId, error }, 'Failed to get conversation memory');
      return {
        userId,
        recentTopics: [],
        recurringThemes: [],
        emotionalPatterns: [],
        importantMoments: [],
        conversationStyle: {
          preferredLength: 'moderate',
          responsiveness: 'medium',
          topicDepth: 'moderate',
          questionAsking: 0
        }
      };
    }
  }

  /**
   * Get conversation summary for a period
   */
  async getConversationSummary(userId: string, days: number = 7): Promise<{
    totalMessages: number;
    topTopics: string[];
    emotionalTrend: 'improving' | 'stable' | 'declining';
    engagementLevel: 'high' | 'medium' | 'low';
    keyInsights: string[];
  }> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const messages = await prisma.chatMessage.findMany({
        where: {
          userId,
          createdAt: { gte: since },
          type: 'user'
        },
        orderBy: { createdAt: 'desc' }
      });

      const memory = await this.getMemory(userId);

      // Analyze emotional trend
      let positiveCount = 0;
      let negativeCount = 0;
      messages.forEach(msg => {
        const sentiment = this.analyzeSentiment(msg.content);
        if (sentiment === 'positive') positiveCount++;
        if (sentiment === 'negative') negativeCount++;
      });

      const emotionalTrend: 'improving' | 'stable' | 'declining' = 
        positiveCount > negativeCount * 1.5 ? 'improving' :
        negativeCount > positiveCount * 1.5 ? 'declining' : 'stable';

      // Get top topics
      const topTopics = memory.recentTopics
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 5)
        .map(t => t.topic);

      // Generate insights
      const keyInsights: string[] = [];
      if (memory.recurringThemes.length > 0) {
        keyInsights.push(`You frequently discuss: ${memory.recurringThemes.join(', ')}`);
      }
      if (emotionalTrend === 'improving') {
        keyInsights.push('Your emotional tone has been more positive recently');
      } else if (emotionalTrend === 'declining') {
        keyInsights.push('You might be experiencing more challenges lately');
      }
      if (memory.conversationStyle.questionAsking > 5) {
        keyInsights.push('You\'re actively seeking guidance and support');
      }

      return {
        totalMessages: messages.length,
        topTopics,
        emotionalTrend,
        engagementLevel: messages.length > 15 ? 'high' : messages.length > 7 ? 'medium' : 'low',
        keyInsights
      };
    } catch (error) {
      memoryLogger.error({ userId, error }, 'Failed to generate conversation summary');
      return {
        totalMessages: 0,
        topTopics: [],
        emotionalTrend: 'stable',
        engagementLevel: 'low',
        keyInsights: []
      };
    }
  }

  /**
   * Find references to previous conversations
   */
  async findPreviousDiscussions(userId: string, topic: string): Promise<{
    found: boolean;
    lastDiscussed?: Date;
    mentions: number;
    relatedMessages: string[];
  }> {
    try {
      const memory = await prisma.conversationMemory.findUnique({
        where: { userId }
      });

      if (!memory) {
        return { found: false, mentions: 0, relatedMessages: [] };
      }

      const topicsData = JSON.parse(memory.topics as string) || {};
      const topicData = topicsData[topic];

      if (!topicData) {
        return { found: false, mentions: 0, relatedMessages: [] };
      }

      // Get recent messages about this topic
      const messages = await prisma.chatMessage.findMany({
        where: {
          userId,
          type: 'user',
          createdAt: { gte: new Date(topicData.firstMentioned) }
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });

      const relatedMessages = messages
        .filter(msg => this.extractTopics(msg.content).includes(topic))
        .map(msg => msg.content);

      return {
        found: true,
        lastDiscussed: new Date(topicData.lastMentioned),
        mentions: topicData.mentions,
        relatedMessages
      };
    } catch (error) {
      memoryLogger.error({ userId, topic, error }, 'Failed to find previous discussions');
      return { found: false, mentions: 0, relatedMessages: [] };
    }
  }

  /**
   * Clear conversation memory for user
   */
  async clearMemory(userId: string): Promise<void> {
    try {
      await prisma.conversationMemory.delete({
        where: { userId }
      });
      memoryLogger.info({ userId }, 'Conversation memory cleared');
    } catch (error) {
      memoryLogger.error({ userId, error }, 'Failed to clear conversation memory');
    }
  }
}

export const conversationMemoryService = new ConversationMemoryService();
