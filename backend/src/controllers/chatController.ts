import { Request, Response } from 'express';
import Joi from 'joi';
import { chatService } from '../services/chatService';
import { conversationMemoryService } from '../services/conversationMemoryService';
import { sessionContinuityService } from '../services/sessionContinuityService';
import { createRequestLogger } from '../utils/logger';
import { prisma } from '../config/database';

const messageSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
  conversationId: Joi.string().optional(),
  simpleLanguage: Joi.boolean().optional(),
  context: Joi.object({
    conversationId: Joi.string().optional(),
    simpleLanguage: Joi.boolean().optional(),
    metadata: Joi.object().optional()
  }).optional()
});

const parseApproachFromMetadata = (metadata?: string | null): string | undefined => {
  if (!metadata) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(metadata);
    return parsed?.approach;
  } catch {
    return undefined;
  }
};

const buildChatPayload = (result: any, incomingContent: string): any => {
  const sentiment = result.botMessage?.metadata?.sentiment || null;
  const smartReplies = chatService.generateSmartReplies(
    incomingContent,
    result.response || result.botMessage?.content || '',
    sentiment
  );

  const payload: any = {
    message: result.botMessage,
    conversationId: result.conversationId,
    conversationTitle: result.conversationTitle,
    ai_metadata: {
      provider: result.provider,
      model: result.model,
      usage: result.usage,
      context: result.context,
      approach: parseApproachFromMetadata(result.botMessage?.metadata)
    },
    smartReplies
  };

  if (result.recommendations) {
    payload.recommendations = result.recommendations.items;
  }
  if (result.assessmentPrompt) {
    payload.assessmentPrompt = result.assessmentPrompt;
  }
  if (result.recommendationsMeta) {
    payload.recommendationsMeta = result.recommendationsMeta;
  }
  if (result.fallbackMeta || result.provider === 'fallback') {
    payload.fallback = {
      ...result.fallbackMeta,
      providerFallback: result.provider === 'fallback'
    };
  }

  return payload;
};

const resolvePayloadMessageContent = (payload: any): string => {
  const message = payload?.message;
  if (typeof message === 'string') {
    return message;
  }

  if (message && typeof message === 'object' && typeof message.content === 'string') {
    return message.content;
  }

  return '';
};

const tokenizeResponseForStream = (content: string): string[] => {
  if (!content) {
    return [];
  }

  return content.match(/\S+\s*/g) ?? [content];
};

export const sendMessage = async (req: any, res: Response) => {
  try {
    const { error } = messageSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    const userId = req.user.id;
    const { content, conversationId, simpleLanguage, context } = req.body;
    const resolvedConversationId = conversationId ?? context?.conversationId;
    const resolvedSimpleLanguage = typeof simpleLanguage === 'boolean'
      ? simpleLanguage
      : Boolean(context?.simpleLanguage);
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'sendMessage', userId });

    // Check for crisis language first
    if (chatService.detectCrisisLanguage(content)) {
      // Generate crisis response directly through chatService
      const result = await chatService.generateAIResponse(
        userId,
        content,
        undefined,
        resolvedConversationId,
        { simpleLanguage: resolvedSimpleLanguage }
      );
      log.warn({ crisis: true }, 'Crisis response triggered for incoming message');

      res.status(201).json({
        success: true,
        data: {
          message: result.botMessage,
          conversationId: result.conversationId,
          conversationTitle: result.conversationTitle,
          crisis: true,
          context: result.context,
          recommendationsMeta: result.recommendationsMeta,
          fallback: result.fallbackMeta ?? null
        }
      });
      return;
    }

    // Generate AI response (this handles saving messages automatically)
    const result = await chatService.generateAIResponse(
      userId,
      content,
      undefined,
      resolvedConversationId,
      { simpleLanguage: resolvedSimpleLanguage }
    );

    const payload = buildChatPayload(result, content);

    if (result.fallbackMeta || result.provider === 'fallback') {
      payload.fallback = {
        ...result.fallbackMeta,
        providerFallback: result.provider === 'fallback'
      };
      log.warn({ provider: result.provider, fallback: payload.fallback }, 'Sent fallback chat response');
    } else {
      log.info({ provider: result.provider }, 'Sent AI chat response');
    }

    res.status(201).json({
      success: true,
      data: payload
    });

  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'sendMessage', userId: req.user?.id });
    log.error({ err: e }, 'Failed to send chat message');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const streamMessage = async (req: any, res: Response) => {
  try {
    const { error } = messageSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    const userId = req.user.id;
    const { content, conversationId, simpleLanguage, context } = req.body;
    const resolvedConversationId = conversationId ?? context?.conversationId;
    const resolvedSimpleLanguage = typeof simpleLanguage === 'boolean'
      ? simpleLanguage
      : Boolean(context?.simpleLanguage);

    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'streamMessage', userId });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (event: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    sendEvent({ type: 'status', stage: 'processing' });

    const crisis = chatService.detectCrisisLanguage(content);
    const result = await chatService.generateAIResponse(
      userId,
      content,
      undefined,
      resolvedConversationId,
      { simpleLanguage: resolvedSimpleLanguage }
    );

    const payload = crisis
      ? {
          message: result.botMessage,
          conversationId: result.conversationId,
          conversationTitle: result.conversationTitle,
          crisis: true,
          context: result.context,
          recommendationsMeta: result.recommendationsMeta,
          fallback: result.fallbackMeta ?? null
        }
      : buildChatPayload(result, content);

    const streamContent = resolvePayloadMessageContent(payload);
    sendEvent({ type: 'status', stage: 'streaming' });

    for (const token of tokenizeResponseForStream(streamContent)) {
      sendEvent({ type: 'token', token });
    }

    if (result.fallbackMeta || result.provider === 'fallback') {
      log.warn({ provider: result.provider, fallback: payload.fallback ?? null }, 'Streamed fallback chat response');
    } else if (crisis) {
      log.warn({ crisis: true }, 'Streamed crisis chat response');
    } else {
      log.info({ provider: result.provider }, 'Streamed AI chat response');
    }

    sendEvent({ type: 'done', payload });
    sendEvent({ type: 'status', stage: 'completed' });
    res.end();
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'streamMessage', userId: req.user?.id });
    log.error({ err: e }, 'Failed to stream chat message');

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Server error' })}\n\n`);
      res.end();
      return;
    }

    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getChatHistory = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'getChatHistory', userId });

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: limit
    });
    log.info({ count: messages.length }, 'Fetched chat history');
    res.json({ success: true, data: messages });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'getChatHistory', userId: req.user?.id });
    log.error({ err: e }, 'Failed to retrieve chat history');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getChatInsights = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'getChatInsights', userId });
    const insights = await chatService.getConversationInsights(userId);
    log.info('Fetched chat insights');
    res.json({ success: true, data: insights });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'getChatInsights', userId: req.user?.id });
    log.error({ err: e }, 'Failed to retrieve chat insights');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getAIHealthCheck = async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'getAIHealthCheck' });
    const status = await chatService.getProviderStatus();
    log.info('Reported AI provider health check');
    res.json({
      success: true,
      data: {
        providers: status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'getAIHealthCheck' });
    log.error({ err: e }, 'Failed to gather AI health check');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const testAIProviders = async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'testAIProviders' });
    const results = await chatService.testProviders();
    log.info('Ran AI provider diagnostics');
    res.json({
      success: true,
      data: {
        test_results: results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'testAIProviders' });
    log.error({ err: e }, 'Failed to run AI provider tests');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getConversationMemory = async (req: any, res: Response) => {
  try {
    const userId = req.params.userId || req.user.id;

    // Security check: users can only access their own memory
    if (userId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({
      controller: 'chat',
      action: 'getConversationMemory',
      userId
    });

    const memory = await conversationMemoryService.getMemory(userId);
    log.info('Fetched conversation memory');

    // Get the raw memory data from database to access sentiment distribution
    const rawMemory = await prisma.conversationMemory.findUnique({
      where: { userId }
    });

    // Extract sentiment distribution from conversation metrics
    let sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
    let emotionalPatterns = { predominant: 'stable', recentShift: 'stable' };

    if (rawMemory) {
      try {
        const metrics = JSON.parse((rawMemory as any).conversationMetrics || '{}');
        if (metrics.sentimentCounts) {
          sentimentDistribution = metrics.sentimentCounts;
        }

        const patterns = JSON.parse((rawMemory as any).emotionalPatterns || '{}');
        if (patterns.predominant) {
          emotionalPatterns = patterns;
        }
      } catch (parseError) {
        log.warn({ parseError }, 'Failed to parse memory data, using defaults');
      }
    }

    res.json({
      success: true,
      data: {
        ...memory,
        sentimentDistribution,
        emotionalPatterns
      }
    });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({
      controller: 'chat',
      action: 'getConversationMemory',
      userId: req.user?.id
    });
    log.error({ err: e }, 'Failed to retrieve conversation memory');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getConversationSummary = async (req: any, res: Response) => {
  try {
    const userId = req.params.userId || req.user.id;
    const days = parseInt(req.query.days as string) || 7;

    // Security check
    if (userId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({
      controller: 'chat',
      action: 'getConversationSummary',
      userId,
      days
    });

    const summary = await conversationMemoryService.getConversationSummary(userId, days);
    log.info('Fetched conversation summary');

    res.json({
      success: true,
      data: summary
    });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({
      controller: 'chat',
      action: 'getConversationSummary',
      userId: req.user?.id
    });
    log.error({ err: e }, 'Failed to retrieve conversation summary');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getConversationStarters = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({
      controller: 'chat',
      action: 'getConversationStarters',
      userId
    });

    const starters = await chatService.getConversationStarters(userId);
    log.info({ count: starters.length }, 'Generated conversation starters');

    res.json({
      success: true,
      data: starters
    });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({
      controller: 'chat',
      action: 'getConversationStarters',
      userId: req.user?.id
    });
    log.error({ err: e }, 'Failed to generate conversation starters');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getProactiveCheckIn = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const checkIn = await chatService.getProactiveCheckIn(userId);

    res.json({
      success: true,
      data: checkIn
    });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({
      controller: 'chat',
      action: 'getProactiveCheckIn',
      userId: req.user?.id
    });
    log.error({ err: e }, 'Failed to generate proactive check-in');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getMoodBasedGreeting = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const opener = await sessionContinuityService.buildSessionOpener(userId);

    res.json({
      success: true,
      data: {
        greeting: opener.greeting,
        hasContext: opener.hasContext,
        actionItems: opener.actionItems,
        progressSummary: opener.progressSummary,
      }
    });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({
      controller: 'chat',
      action: 'getMoodBasedGreeting',
      userId: req.user?.id
    });
    log.error({ err: e }, 'Failed to generate mood-based greeting');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getExerciseRecommendations = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const currentMessage = req.body.message || undefined;

    const recommendations = await chatService.getContextualExerciseRecommendations(userId, currentMessage);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({
      controller: 'chat',
      action: 'getExerciseRecommendations',
      userId: req.user?.id
    });
    log.error({ err: e }, 'Failed to generate exercise recommendations');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const submitFeedback = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { feedback, note } = req.body;
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'submitFeedback', userId, messageId });

    if (!feedback || !['liked', 'disliked'].includes(feedback)) {
      res.status(400).json({ success: false, error: 'Feedback must be "liked" or "disliked"' });
      return;
    }

    if (note !== undefined && typeof note !== 'string') {
      res.status(400).json({ success: false, error: 'Feedback note must be a string' });
      return;
    }

    const normalizedNote = typeof note === 'string'
      ? note.trim().slice(0, 500)
      : undefined;

    // Find the message and verify ownership
    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, userId }
    });

    if (!message) {
      res.status(404).json({ success: false, error: 'Message not found' });
      return;
    }

    if (message.type !== 'bot') {
      res.status(400).json({ success: false, error: 'Feedback can only be submitted for assistant messages' });
      return;
    }

    const helpful = feedback === 'liked';

    // Update metadata with feedback
    let existingMetadata: Record<string, unknown> = {};
    if (message.metadata) {
      try {
        const parsedMetadata = JSON.parse(message.metadata);
        if (parsedMetadata && typeof parsedMetadata === 'object' && !Array.isArray(parsedMetadata)) {
          existingMetadata = parsedMetadata as Record<string, unknown>;
        }
      } catch {
        // Keep existing metadata empty if legacy rows contain non-JSON payloads.
        existingMetadata = {};
      }
    }
    const updatedMetadata = {
      ...existingMetadata,
      feedback,
      ...(normalizedNote ? { feedbackNote: normalizedNote } : {})
    };

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { metadata: JSON.stringify(updatedMetadata) }
    });

    await prisma.chatFeedback.upsert({
      where: {
        userId_messageId: {
          userId,
          messageId
        }
      },
      update: {
        helpful,
        note: normalizedNote || null,
        resolvedAt: helpful ? new Date() : null
      },
      create: {
        userId,
        messageId,
        helpful,
        note: normalizedNote || null,
        resolvedAt: helpful ? new Date() : null
      }
    });

    const repairPrompt = !helpful
      ? normalizedNote
        ? `Thanks for the feedback. I heard you say: "${normalizedNote}". I want to adjust. What would feel most helpful right now?`
        : 'Thanks for the feedback. I want to adjust my support. What would feel most helpful right now?'
      : null;

    log.info({ feedback, hasNote: Boolean(normalizedNote) }, 'Message feedback recorded');
    res.json({
      success: true,
      data: {
        messageId,
        feedback,
        note: normalizedNote || null,
        repairPrompt
      }
    });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'submitFeedback', userId: req.user?.id });
    log.error({ err: e }, 'Failed to submit message feedback');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const submitMoodCheck = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { conversationId, moodBefore, moodAfter } = req.body;
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'submitMoodCheck', userId });

    if (!conversationId) {
      res.status(400).json({ success: false, error: 'conversationId is required' });
      return;
    }

    // Validate mood values (1-5 scale)
    if (moodBefore !== undefined && (moodBefore < 1 || moodBefore > 5)) {
      res.status(400).json({ success: false, error: 'moodBefore must be between 1 and 5' });
      return;
    }
    if (moodAfter !== undefined && (moodAfter < 1 || moodAfter > 5)) {
      res.status(400).json({ success: false, error: 'moodAfter must be between 1 and 5' });
      return;
    }

    // Update conversation metadata with mood data
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const existingMeta = conversation.metadata ? JSON.parse(conversation.metadata) : {};
    const updatedMeta = {
      ...existingMeta,
      ...(moodBefore !== undefined ? { moodBefore } : {}),
      ...(moodAfter !== undefined ? { moodAfter } : {})
    };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { metadata: JSON.stringify(updatedMeta) }
    });

    log.info({ moodBefore, moodAfter }, 'Mood check recorded');
    res.json({ success: true, data: { conversationId, moodBefore, moodAfter } });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'submitMoodCheck', userId: req.user?.id });
    log.error({ err: e }, 'Failed to submit mood check');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const clearMemory = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'clearMemory', userId });

    await prisma.conversationMemory.deleteMany({
      where: { userId }
    });

    log.info('Conversation memory cleared');
    res.json({ success: true, data: { message: 'Memory cleared successfully' } });
  } catch (e) {
    const requestId = (req as any).id ?? res.locals.requestId;
    const log = createRequestLogger(requestId).child({ controller: 'chat', action: 'clearMemory', userId: req.user?.id });
    log.error({ err: e }, 'Failed to clear conversation memory');
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
