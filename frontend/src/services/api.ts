/**
 * API Service
 *
 * Centralised HTTP client for all back-end API endpoints.
 * Provides typed objects for each resource area and the shared types
 * used throughout the front-end.
 */

import { getApiBaseUrl } from '../config/apiConfig';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── User / Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePhoto?: string | null;
  isOnboarded?: boolean;
  approach?: 'western' | 'eastern' | 'hybrid' | null;
  birthday?: string | null;
  gender?: string | null;
  region?: string | null;
  language?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  dataConsent?: boolean;
  clinicianSharing?: boolean;
  hasPassword?: boolean;
  securityQuestion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Assessments ──────────────────────────────────────────────────────────────

export type AssessmentTrend = 'improving' | 'declining' | 'stable' | 'baseline';

export interface AssessmentTypeSummary {
  latestScore: number;
  previousScore: number | null;
  change: number | null;
  averageScore: number;
  bestScore: number;
  trend: AssessmentTrend;
  interpretation: string;
  recommendations: string[];
  lastCompletedAt: string;
  historyCount: number;
  normalizedScore?: number;
  rawScore?: number;
  maxScore?: number;
  categoryBreakdown?: Record<string, {
    raw: number;
    normalized: number;
    interpretation: string;
  }>;
}

export interface AssessmentInsights {
  byType: Record<string, AssessmentTypeSummary>;
  aiSummary: string;
  overallTrend: AssessmentTrend | 'mixed';
  wellnessScore?: {
    value: number;
    method: string;
    updatedAt: string;
  };
  updatedAt: string;
}

export interface AssessmentHistoryEntry {
  id: string;
  assessmentType: string;
  score: number;
  interpretation: string;
  changeFromPrevious: number | null;
  trend: AssessmentTrend;
  completedAt: string;
  responses: Record<string, unknown> | null;
  rawScore?: number | null;
  maxScore?: number | null;
  categoryBreakdown?: Record<string, { raw: number; normalized: number; interpretation: string }>;
}

export interface AssessmentTemplateInterpretationBand {
  max: number;
  label: string;
}

export interface AssessmentTemplateScoringDomain {
  id: string;
  label: string;
  items: string[];
  minScore: number;
  maxScore: number;
  interpretationBands?: AssessmentTemplateInterpretationBand[];
}

export interface AssessmentTemplateScoring {
  minScore: number;
  maxScore: number;
  interpretationBands: AssessmentTemplateInterpretationBand[];
  reverseScored?: string[];
  domains?: AssessmentTemplateScoringDomain[];
  higherIsBetter?: boolean;
}

export interface AssessmentTemplateOption {
  id: string;
  value: number;
  text: string;
  order: number;
}

export interface AssessmentTemplateQuestion {
  id: string;
  text: string;
  responseType: string;
  uiType: string;
  reverseScored?: boolean;
  domain?: string | null;
  options: AssessmentTemplateOption[];
}

export interface AssessmentTemplate {
  assessmentType: string;
  definitionId: string;
  title: string;
  description: string;
  estimatedTime: string | null;
  scoring: AssessmentTemplateScoring;
  questions: AssessmentTemplateQuestion[];
}

export interface AvailableAssessment {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  timeEstimate: string;
  questions: number;
  tags: string;
}

export interface AssessmentSessionSummary {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  selectedTypes: string[];
  completedTypes: string[];
  pendingTypes: string[];
  startedAt: string;
  completedAt: string | null;
  completedAssessments: Array<{
    id: string;
    assessmentType: string;
    score: number;
    completedAt: string;
  }>;
}

export interface AssessmentReminder {
  shouldRemind: boolean;
  reason: 'first-assessment' | 'stale-assessment' | 'recent-assessment' | string;
  thresholdDays: number;
  daysSinceLastAssessment: number | null;
  lastCompletedAt: string | null;
  lastAssessmentType: string | null;
  message: string;
}

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

export interface DashboardSummaryData {
  user: {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    approach: string | null;
    profileCompletion: number;
    memberSince: string;
  };
  assessmentScores: {
    anxiety: number | null;
    stress: number | null;
    emotionalIntelligence: number | null;
    wellnessScore: number | null;
    byType: Record<string, AssessmentTypeSummary>;
    overallTrend: string;
    aiSummary: string;
    updatedAt: string;
  } | null;
  recentInsights: Array<{
    type: 'ai-summary' | 'pattern' | 'progress';
    title: string;
    description: string;
    icon: string;
    severity?: 'success' | 'warning' | 'info';
    timestamp: string;
  }>;
  weeklyProgress: {
    practices: {
      completed: number;
      goal: number;
      percentage: number;
    };
    moodCheckins: {
      completed: number;
      goal: number;
      percentage: number;
    };
    assessments: {
      completed: number;
      goal: number;
      percentage: number;
    };
    currentStreak: number;
  };
  recentMoods: Array<{
    mood: string;
    notes: string | null;
    createdAt: string;
  }>;
  recommendedPractice: {
    title: string;
    description: string | null;
    type: string;
    duration: string | number | null;
    tags: string[] | string | null;
    reason: string;
    approach: string | null;
  } | null;
}

export interface DashboardUnifiedData {
  summary: DashboardSummaryData;
  weeklyProgress: {
    practices: {
      completed: number;
      goal: number;
      percentage: number;
      details: Array<{
        title: string;
        type: string;
        completedAt: string | null;
      }>;
    };
    moodCheckins: {
      completed: number;
      goal: number;
      percentage: number;
      moodDistribution: Record<string, number>;
    };
    assessments: {
      completed: number;
      goal: number;
      percentage: number;
      types: string[];
    };
    streak: {
      current: number;
      message: string;
    };
  };
  mode: DashboardModeResult;
  checkins: CheckinSummary;
  crisisEvents: CrisisEvent[];
  intention: DailyIntention | null;
  sleep: {
    history: {
      logs: SleepLog[];
      days: number;
      total: number;
    };
    stats: SleepStats;
  };
  gratitude: {
    entries: GratitudeEntry[];
    days: number;
    total: number;
  };
  nudges: {
    nudges: AdaptiveNudge[];
    total: number;
  };
  assessmentReminder: AssessmentReminder;
  habits: {
    habits: UserHabit[];
    total: number;
  };
  communityInsights: CommunityInsightsPayload;
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

export interface MoodEntry {
  id: string;
  mood: string;
  emotion?: string | null;
  emotionGroup?: string | null;
  intensity?: number | null;
  trigger?: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MicroCheckin {
  id: string;
  userId: string;
  type: 'morning' | 'evening' | 'post-chat' | string;
  responses: Record<string, unknown>;
  mood?: string | null;
  createdAt: string;
}

export interface CheckinSummary {
  checkins: MicroCheckin[];
  avgEnergy: number | null;
  avgDayRating: number | null;
  totalCheckins: number;
  days: number;
}

export interface CrisisEvent {
  id: string;
  userId: string;
  conversationId?: string | null;
  crisisLevel: string;
  confidence: number;
  indicators: string;
  actionTaken: string;
  followUpResponse?: string | null;
  detectedAt: string;
  responseTime?: number | null;
  resolved: boolean;
  resolvedAt?: string | null;
}

export interface JournalEntry {
  id: string;
  userId: string;
  prompt?: string | null;
  content: string;
  mood?: string | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalReflection {
  id: string;
  userId: string;
  weekOf: string;
  patterns: {
    recurringThemes?: string[];
    emotionalTrend?: string;
    insights?: string[];
  };
  aiSummary: string;
  createdAt: string;
}

export interface DailyIntention {
  id: string;
  userId: string;
  intention: string;
  isCustom: boolean;
  completed: boolean | null;
  reflection?: string | null;
  createdAt: string;
}

export interface GratitudeEntry {
  id: string;
  userId: string;
  items: string[];
  note?: string | null;
  createdAt: string;
}

export interface SleepLog {
  id: string;
  userId: string;
  bedTime: string;
  wakeTime: string;
  quality: number;
  factors?: string[] | null;
  duration?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface SleepStats {
  periodDays: number;
  totalLogs: number;
  averageQuality: number | null;
  averageDuration: number | null;
  commonFactors: Array<{ factor: string; count: number }>;
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export interface PlanModuleWithState {
  id: string;
  title: string;
  description: string | null;
  type: string;
  duration?: number | null;
  difficulty?: string | null;
  approach?: string | null;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  userState: UserPlanModuleState | null;
}

export interface UserPlanModuleState {
  id: string;
  userId: string;
  moduleId: string;
  completed: boolean;
  progress: number;
  scheduledFor?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export interface ProgressEntry {
  id: string;
  metric: string;
  value: number;
  notes?: string | null;
  date: string;
}

// ─── Conversations ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  lastMessageAt: string;
  isArchived: boolean;
  messageCount?: number;
  lastMessage?: string;
  updatedAt?: string;
  userId?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId?: string;
  userId?: string;
  role?: 'user' | 'assistant' | 'system';
  type?: 'user' | 'bot' | 'system' | string;
  content: string;
  metadata?: Record<string, unknown> | string | null;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[];
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ExerciseRecommendationsResponse {
  exercises: Array<{
    title: string;
    description: string;
    type: string;
    duration?: string;
    instructions?: string[];
  }>;
  rationale?: string;
}

export interface ChatSendMessageResponse {
  message: ConversationMessage | { content: string; [key: string]: unknown } | string;
  conversationId: string;
  conversationTitle?: string | null;
  smartReplies?: string[];
  recommendations?: Array<Record<string, unknown>>;
  recommendationsMeta?: Record<string, unknown>;
  ai_metadata?: Record<string, unknown>;
  fallback?: Record<string, unknown> | null;
  assessmentPrompt?: {
    actionRequired: 'trigger_gad2_assessment';
    assessmentType: 'anxiety_gad2';
    prompt: string;
    ctaLabel: string;
    daysSinceLastAssessment: number | null;
  };
  crisis?: boolean;
  context?: unknown;
}

export type ChatStreamEvent =
  | {
      type: 'status';
      stage: 'processing' | 'streaming' | 'completed';
      message?: string;
    }
  | {
      type: 'token';
      token: string;
    }
  | {
      type: 'done';
      payload: ChatSendMessageResponse;
    }
  | {
      type: 'error';
      error: string;
    };

export interface AdaptiveNudge {
  id: string;
  type: 'milestone' | 'nudge';
  message: string;
  ctaLabel?: string;
  ctaPage?: string;
  createdAt: string;
}

export interface UserHabit {
  id: string;
  userId: string;
  title: string;
  cue: string;
  practiceId?: string | null;
  active: boolean;
  streak: number;
  lastCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityInsightMetric {
  id: 'breathing-adoption' | 'stress-improvement' | 'journal-consistency';
  label: string;
  value: number;
  unit: 'percent' | 'points';
  description: string;
  sampleSize: number;
}

export interface CommunityInsightsPayload {
  generatedAt: string;
  expiresAt: string;
  metrics: CommunityInsightMetric[];
}

export interface UserEngagementRecord {
  id: string;
  contentId: string;
  completed: boolean;
  rating: number | null;
  timeSpent: number | null;
  moodBefore: string | null;
  moodAfter: string | null;
  effectiveness: number | null;
  createdAt: string;
  updatedAt: string;
  content?: {
    id: string;
    title: string;
    type?: string;
    thumbnailUrl?: string | null;
  };
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

const getTokenForPath = (path: string): string | null => {
  const userToken = localStorage.getItem('token');
  const adminToken = localStorage.getItem('adminToken');

  // Admin endpoints should use admin session token; fall back to user token only if needed.
  if (path.startsWith('/admin')) {
    return adminToken || userToken;
  }

  return userToken;
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getTokenForPath(path);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
    });

    const resolveAcceptHeader = (inputHeaders: HeadersInit | undefined): string => {
      if (!inputHeaders) {
        return '';
      }

      if (inputHeaders instanceof Headers) {
        return inputHeaders.get('Accept') ?? '';
      }

      if (Array.isArray(inputHeaders)) {
        const acceptPair = inputHeaders.find(([name]) => name.toLowerCase() === 'accept');
        return acceptPair?.[1] ?? '';
      }

      return inputHeaders.accept ?? inputHeaders.Accept ?? '';
    };

    // For blob responses (export endpoints) we handle them separately
    if (resolveAcceptHeader(options.headers).includes('blob')) {
      if (!response.ok) {
        return { success: false, error: `Request failed with status ${response.status}` };
      }
      return { success: true, data: response as unknown as T };
    }

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data?.error || `Request failed with status ${response.status}` };
    }

    // Backend wraps responses in { success, data } — pass through directly
    if ('success' in data) {
      return data as ApiResponse<T>;
    }

    return { success: true, data: data as T };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const token = getTokenForPath(path);
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }

  return response.blob();
}

// ─── assessmentsApi ───────────────────────────────────────────────────────────

export const assessmentsApi = {
  listAssessments: () =>
    request<AssessmentHistoryEntry[]>('/assessments'),

  getAvailableAssessments: () =>
    request<AvailableAssessment[]>('/assessments/available'),

  getAssessmentTemplates: (types?: string[]) => {
    const params = types?.length ? `?types=${types.join(',')}` : '';
    return request<{ templates: AssessmentTemplate[] }>(`/assessments/templates${params}`);
  },

  submitAssessment: (payload: {
    assessmentType: string;
    responses: Record<string, number | string>;
    score: number;
    rawScore?: number;
    maxScore?: number;
    sessionId?: string;
    responseDetails?: Array<{
      questionId: string;
      questionText: string;
      answerLabel: string;
      answerValue: string | number | null;
      answerScore?: number;
    }>;
    categoryBreakdown?: Record<string, { raw: number; normalized: number; interpretation?: string }>;
  }) =>
    request<{
      assessment: AssessmentHistoryEntry;
      history: AssessmentHistoryEntry[];
      insights: AssessmentInsights;
      session?: AssessmentSessionSummary;
    }>('/assessments', { method: 'POST', body: JSON.stringify(payload) }),

  submitCombinedAssessments: (payload: {
    sessionId: string;
    assessments: Array<{
      assessmentType: string;
      responses: Record<string, string>;
      score: number;
      rawScore: number;
      maxScore: number;
      categoryBreakdown?: Record<string, { raw: number; normalized: number; interpretation?: string }>;
      responseDetails: Array<{
        questionId: string;
        questionText: string;
        answerLabel: string;
        answerValue: string | number | null;
        answerScore?: number;
      }>;
    }>;
  }) =>
    request<{
      session: AssessmentSessionSummary;
      insights: AssessmentInsights;
      history: AssessmentHistoryEntry[];
    }>('/assessments/submit-combined', { method: 'POST', body: JSON.stringify(payload) }),

  getAssessmentHistory: () =>
    request<{ history: AssessmentHistoryEntry[]; insights: AssessmentInsights }>('/assessments/history'),

  getAssessmentReminder: () =>
    request<AssessmentReminder>('/assessments/reminder'),

  startAssessmentSession: (payload: { selectedTypes: string[] }) =>
    request<{ session: AssessmentSessionSummary }>('/assessments/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getActiveAssessmentSession: () =>
    request<{ session: AssessmentSessionSummary } | null>('/assessments/sessions/active'),

  getAssessmentSessionById: (sessionId: string) =>
    request<{ session: AssessmentSessionSummary }>(`/assessments/sessions/${sessionId}`),

  updateAssessmentSessionStatus: (sessionId: string, status: 'completed' | 'cancelled') =>
    request<{ session: AssessmentSessionSummary }>(`/assessments/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ─── chatApi ──────────────────────────────────────────────────────────────────

export const chatApi = {
  sendMessage: (content: string, conversationId?: string, options?: { simpleLanguage?: boolean }) =>
    request<ChatSendMessageResponse>(
      '/chat/message',
      {
        method: 'POST',
        body: JSON.stringify({
          content,
          conversationId,
          simpleLanguage: options?.simpleLanguage,
        })
      }
    ),

  submitMessageFeedback: (messageId: string, feedback: 'liked' | 'disliked', note?: string) =>
    request<{
      messageId: string;
      feedback: 'liked' | 'disliked';
      note?: string | null;
      repairPrompt?: string | null;
    }>(
      `/chat/message/${messageId}/feedback`,
      { method: 'PUT', body: JSON.stringify({ feedback, note }) }
    ),

  getChatHistory: () =>
    request<ConversationMessage[]>('/chat/history'),

  getConversationStarters: () =>
    request<string[]>('/chat/starters'),

  getProactiveCheckIn: () =>
    request<{
      shouldCheckIn: boolean;
      message: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }>('/chat/check-in'),

  getMoodBasedGreeting: () =>
    request<{
      greeting: string;
      hasContext?: boolean;
      actionItems?: string[];
      progressSummary?: string;
    }>('/chat/greeting'),

  getExerciseRecommendations: (context: Record<string, unknown>) =>
    request<ExerciseRecommendationsResponse>('/chat/exercises', {
      method: 'POST',
      body: JSON.stringify(context),
    }),

  streamMessage: async (
    content: string,
    conversationId?: string,
    options?: { simpleLanguage?: boolean },
    onEvent?: (event: ChatStreamEvent) => void
  ): Promise<ChatSendMessageResponse> => {
    const token = getTokenForPath('/chat/stream');
    const response = await fetch(`${getApiBaseUrl()}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        content,
        conversationId,
        simpleLanguage: options?.simpleLanguage,
      }),
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const body = await response.json();
        message = body?.error || body?.message || message;
      } catch {
        // Ignore parse errors and use status fallback.
      }
      throw new Error(message);
    }

    if (!response.body) {
      throw new Error('Streaming response body is unavailable');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let donePayload: ChatSendMessageResponse | null = null;

    const parseEventChunk = (chunk: string): ChatStreamEvent | null => {
      const lines = chunk
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const dataLine = lines.find((line) => line.startsWith('data:'));
      if (!dataLine) {
        return null;
      }

      const payloadText = dataLine.slice('data:'.length).trim();
      if (!payloadText) {
        return null;
      }

      try {
        return JSON.parse(payloadText) as ChatStreamEvent;
      } catch {
        return null;
      }
    };

    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex >= 0) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const parsedEvent = parseEventChunk(rawEvent);
        if (!parsedEvent) {
          separatorIndex = buffer.indexOf('\n\n');
          continue;
        }

        onEvent?.(parsedEvent);

        if (parsedEvent.type === 'done') {
          donePayload = parsedEvent.payload;
        }

        if (parsedEvent.type === 'error') {
          throw new Error(parsedEvent.error || 'Streaming failed');
        }

        separatorIndex = buffer.indexOf('\n\n');
      }
    }

    buffer += decoder.decode();

    // Parse any final buffered event that was not newline-terminated.
    if (buffer.trim().length > 0) {
      const parsedEvent = parseEventChunk(buffer);
      if (parsedEvent) {
        onEvent?.(parsedEvent);
        if (parsedEvent.type === 'done') {
          donePayload = parsedEvent.payload;
        }
        if (parsedEvent.type === 'error') {
          throw new Error(parsedEvent.error || 'Streaming failed');
        }
      }
    }

    if (!donePayload) {
      throw new Error('Stream completed without a final payload');
    }

    return donePayload;
  },
};

// ─── conversationsApi ─────────────────────────────────────────────────────────

export const conversationsApi = {
  getConversations: (includeArchived = false) =>
    request<Conversation[]>(`/conversations?includeArchived=${includeArchived}`),

  getConversation: (conversationId: string) =>
    request<ConversationWithMessages>(`/conversations/${conversationId}`),

  createConversation: (title?: string) =>
    request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  updateConversation: (conversationId: string, updates: { title?: string; isArchived?: boolean }) =>
    request<Conversation>(`/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteConversation: (conversationId: string) =>
    request<void>(`/conversations/${conversationId}`, { method: 'DELETE' }),

  searchConversations: (query: string) =>
    request<Conversation[]>(`/conversations/search?q=${encodeURIComponent(query)}`),

  getConversationCount: (includeArchived = false) =>
    request<{ count: number }>(`/conversations/count?includeArchived=${includeArchived}`),

  archiveConversation: (conversationId: string, isArchived: boolean) =>
    request<void>(`/conversations/${conversationId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ isArchived }),
    }),

  generateTitle: (conversationId: string) =>
    request<{ title: string }>(`/conversations/${conversationId}/title`, { method: 'POST' }),

  exportConversation: (
    conversationId: string,
    format: 'pdf' | 'text' | 'json',
    includeSystemMessages = true
  ): Promise<Blob> =>
    requestBlob(
      `/conversations/${conversationId}/export?format=${format}&includeSystemMessages=${includeSystemMessages}`
    ),

  exportBulkConversations: (conversationIds: string[], format: 'text' | 'json'): Promise<Blob> =>
    requestBlob('/conversations/export/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationIds, format }),
    }),
};

// ─── moodApi ──────────────────────────────────────────────────────────────────

export const moodApi = {
  getMoodHistory: () =>
    request<MoodEntry[]>('/mood'),

  logMood: (payload: {
    mood?: string;
    emotion?: string;
    emotionGroup?: string;
    intensity?: number;
    trigger?: string;
    notes?: string;
  }) =>
    request<MoodEntry>('/mood', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteMoodEntry: (id: string) =>
    request<void>(`/mood/${id}`, { method: 'DELETE' }),

  getMoodStats: () =>
    request<Record<string, unknown>>('/mood/stats'),
};

// ─── checkinsApi ─────────────────────────────────────────────────────────────

export const checkinsApi = {
  createCheckin: (payload: {
    type: 'morning' | 'evening' | 'post-chat' | string;
    responses: Record<string, unknown>;
    mood?: string;
  }) =>
    request<MicroCheckin>('/checkins', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getSummary: (days = 7) =>
    request<CheckinSummary>(`/checkins/summary?days=${days}`),
};

// ─── gratitudeApi ───────────────────────────────────────────────────────────

export const gratitudeApi = {
  createEntry: (payload: { items: string[]; note?: string }) =>
    request<GratitudeEntry>('/gratitude', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getEntries: (days = 30) =>
    request<{ entries: GratitudeEntry[]; days: number; total: number }>(`/gratitude?days=${days}`),
};

// ─── dashboardApi ───────────────────────────────────────────────────────────

export const dashboardApi = {
  getUnified: () =>
    request<DashboardUnifiedData>('/dashboard/unified'),

  getMode: () =>
    request<DashboardModeResult>('/dashboard/mode'),

  getAdaptiveNudges: () =>
    request<{ nudges: AdaptiveNudge[]; total: number }>('/dashboard/nudges'),

  getCommunityInsights: (force = false) =>
    request<CommunityInsightsPayload>(`/dashboard/community-insights${force ? '?force=true' : ''}`),
};

// ─── habitsApi ──────────────────────────────────────────────────────────────

export const habitsApi = {
  listHabits: (active?: boolean) => {
    const params = typeof active === 'boolean' ? `?active=${active}` : '';
    return request<{ habits: UserHabit[]; total: number }>(`/habits${params}`);
  },

  createHabit: (payload: { title: string; cue: string; practiceId?: string }) =>
    request<UserHabit>('/habits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateHabit: (id: string, payload: Partial<Pick<UserHabit, 'title' | 'cue' | 'active' | 'practiceId'>>) =>
    request<UserHabit>(`/habits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  completeHabit: (id: string) =>
    request<UserHabit & { completedToday: boolean }>(`/habits/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  deleteHabit: (id: string) =>
    request<{ id: string }>(`/habits/${id}`, {
      method: 'DELETE',
    }),
};

// ─── crisisApi ───────────────────────────────────────────────────────────────

export const crisisApi = {
  getRecentEvents: () =>
    request<CrisisEvent[]>('/crisis/recent-events'),

  submitFollowUp: (payload: {
    eventId: string;
    response: 'better' | 'same' | 'struggling';
  }) =>
    request<CrisisEvent>('/crisis/follow-up', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ─── journalApi ──────────────────────────────────────────────────────────────

export const journalApi = {
  createEntry: (payload: {
    prompt?: string;
    content: string;
    mood?: string;
    tags?: string[];
  }) =>
    request<JournalEntry>('/journal', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getEntries: (days = 30) =>
    request<{ entries: JournalEntry[]; days: number; total: number }>(`/journal?days=${days}`),

  getPrompt: () =>
    request<{ prompt: string; emotion: string; approach: string }>('/journal/prompts'),

  getReflection: () =>
    request<JournalReflection>('/journal/reflection'),

  deleteEntry: (id: string) =>
    request<void>(`/journal/${id}`, { method: 'DELETE' }),
};

// ─── intentionsApi ───────────────────────────────────────────────────────────

export const intentionsApi = {
  getToday: () =>
    request<DailyIntention | null>('/intentions/today'),

  getPresets: () =>
    request<string[]>('/intentions/presets'),

  setTodayIntention: (payload: { intention: string; isCustom?: boolean }) =>
    request<DailyIntention>('/intentions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reflect: (id: string, payload: { completed: boolean; reflection?: string }) =>
    request<DailyIntention>(`/intentions/${id}/reflect`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getHistory: (days = 7) =>
    request<{ intentions: DailyIntention[]; days: number; total: number }>(`/intentions?days=${days}`),
};

// ─── sleepApi ────────────────────────────────────────────────────────────────

export const sleepApi = {
  logSleep: (payload: {
    bedTime: string;
    wakeTime: string;
    quality: number;
    factors?: string[];
    notes?: string;
  }) =>
    request<SleepLog>('/sleep', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getHistory: (days = 30) =>
    request<{ logs: SleepLog[]; days: number; total: number }>(`/sleep?days=${days}`),

  getStats: (days = 30) =>
    request<SleepStats>(`/sleep/stats?days=${days}`),
};

// ─── engagementApi ───────────────────────────────────────────────────────────

export const engagementApi = {
  getMyEngagements: () =>
    request<UserEngagementRecord[]>('/content/engagements/me'),
};

// ─── plansApi ─────────────────────────────────────────────────────────────────

export const plansApi = {
  getPersonalizedPlan: () =>
    request<PlanModuleWithState[]>('/plans/personalized'),

  getUserPlan: (userId: string) =>
    request<{
      modules: Array<{
        id: string;
        title: string;
        description: string;
        category: string;
        duration: number;
        difficulty: string;
        approach: string[];
      }>;
      approach?: string | null;
      generatedAt?: string;
    }>(`/plans/${userId}`),

  updateModuleProgress: (moduleId: string, progress: number) =>
    request<UserPlanModuleState>(`/plans/modules/${moduleId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress }),
    }),

  completeModule: (moduleId: string) =>
    request<UserPlanModuleState>(`/plans/modules/${moduleId}/complete`, { method: 'POST' }),
};

// ─── progressApi ──────────────────────────────────────────────────────────────

export const progressApi = {
  trackProgress: (metric: string, value: number, notes?: string) =>
    request<ProgressEntry>('/progress', {
      method: 'POST',
      body: JSON.stringify({ metric, value, notes }),
    }),

  getProgressHistory: () =>
    request<ProgressEntry[]>('/progress'),
};

// ─── authApi ──────────────────────────────────────────────────────────────────

export const authApi = {
  updateSecurityQuestionWithPassword: (payload: {
    currentPassword: string;
    question: string;
    answer: string;
  }) =>
    request<{ user: User }>('/auth/security-question/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetPasswordAuthenticated: (payload: { answer: string; newPassword: string }) =>
    request<void>('/auth/password/reset-with-answer', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateApproachWithPassword: (payload: {
    password: string;
    approach: 'western' | 'eastern' | 'hybrid';
  }) =>
    request<{ user: User }>('/auth/approach/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ─── usersApi ─────────────────────────────────────────────────────────────────

export const usersApi = {
  // userId is accepted for compatibility; the server identifies the user via the JWT token.
  updateProfile: (userId: string, payload: Partial<User>) =>
    request<{ user: User }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

// ─── privacyApi ───────────────────────────────────────────────────────────────

export const privacyApi = {
  getSettings: () =>
    request<{
      dataSharing: boolean;
      clinicianAccess: boolean;
      anonymousAnalytics: boolean;
      marketingEmails: boolean;
      researchParticipation: boolean;
      consentUpdatedAt?: string;
    }>('/privacy/settings'),

  updateSettings: (settings: Record<string, boolean>) =>
    request<{ consentUpdatedAt?: string }>('/privacy/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  exportData: async (
    format: 'pdf' | 'json' | 'text',
    sections?: string[]
  ): Promise<void> => {
    const blob = await requestBlob('/privacy/export-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, sections }),
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maan-sarathi-data.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  },

  deleteAccount: (confirmation: 'DELETE' = 'DELETE') =>
    request<void>('/privacy/delete-account', {
      method: 'POST',
      body: JSON.stringify({ confirmation }),
    }),
};

// ─── adminApi ─────────────────────────────────────────────────────────────────

export const adminApi = {
  listAssessments: () =>
    request<unknown[]>('/admin/assessments'),

  getAssessmentCategories: () =>
    request<string[]>('/admin/assessments/categories'),

  getAssessment: (id: string) =>
    request<unknown>(`/admin/assessments/${id}`),

  createAssessment: (payload: Record<string, unknown>) =>
    request<unknown>('/admin/assessments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAssessment: (id: string, payload: Record<string, unknown>) =>
    request<unknown>(`/admin/assessments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteAssessment: (id: string) =>
    request<void>(`/admin/assessments/${id}`, { method: 'DELETE' }),

  duplicateAssessment: (id: string) =>
    request<unknown>(`/admin/assessments/${id}/duplicate`, { method: 'POST' }),
};
