/**
 * Central API service module.
 * Exports typed API clients and shared types used across the frontend.
 */

import { getApiBaseUrl } from '../config/apiConfig';
import { adminFetch } from '../admin/adminApi';

const API_BASE_URL = getApiBaseUrl();

// ─── Generic Helpers ─────────────────────────────────────────────────────────

const getToken = (): string | null => localStorage.getItem('token');

const authHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
});

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

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

export interface AssessmentInsights {
  history: AssessmentHistoryEntry[];
  insights: {
    byType: Record<string, AssessmentTypeSummary>;
    aiSummary: string;
    overallTrend: AssessmentTrend | 'mixed';
    wellnessScore?: {
      value: number;
      method: 'advanced-average';
      updatedAt: string;
    };
    updatedAt: string;
  };
}

export interface AssessmentSessionSummary {
  id: string;
  userId: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  selectedTypes: string[];
  completedTypes: string[];
  pendingTypes: string[];
  createdAt: string;
  updatedAt: string;
}

/** Scoring band for an assessment */
interface InterpretationBand {
  max: number;
  label: string;
}

/** Domain within a scored assessment (e.g. personality trait) */
interface AssessmentDomain {
  id: string;
  label: string;
  items: string[];
  minScore: number;
  maxScore: number;
  interpretationBands?: InterpretationBand[];
}

interface AssessmentScoring {
  minScore: number;
  maxScore: number;
  interpretationBands: InterpretationBand[];
  reverseScored?: string[];
  domains?: AssessmentDomain[];
  higherIsBetter?: boolean;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  responseType: string;
  uiType: string;
  reverseScored: boolean;
  domain: string | null;
  options: Array<{
    id: string;
    value: number;
    text: string;
    order: number;
  }>;
}

export interface AssessmentTemplate {
  assessmentType: string;
  definitionId: string;
  title: string;
  description: string;
  estimatedTime: string | null;
  scoring: AssessmentScoring;
  questions: AssessmentQuestion[];
}

// ─── User / Profile Types ─────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isOnboarded: boolean;
  hasPassword?: boolean;
  approach?: 'western' | 'eastern' | 'hybrid';
  birthday?: string;
  gender?: string;
  region?: string;
  language?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  profilePhoto?: string;
  assessmentScores?: Record<string, number>;
  dataConsent?: boolean;
  clinicianSharing?: boolean;
  securityQuestion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Progress / Plan / Mood Types ─────────────────────────────────────────────

export interface ProgressEntry {
  id: string;
  userId: string;
  metric: string;
  value: number;
  notes?: string;
  date: string;
}

export interface PlanModule {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  approach: string;
  order: number;
  isActive: boolean;
}

export interface UserPlanModuleState {
  id: string;
  userId: string;
  moduleId: string;
  progress: number;
  completedAt: string | null;
  startedAt: string | null;
  notes: string | null;
}

export interface PlanModuleWithState extends PlanModule {
  userState: UserPlanModuleState | null;
}

export interface MoodEntry {
  id: string;
  userId: string;
  mood: string;
  notes: string | null;
  createdAt: string;
}

// ─── Conversation Types ───────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: Date | string;
  messageCount: number;
  createdAt: Date | string;
  isArchived: boolean;
}

export interface ConversationMessage {
  id: string;
  content: string;
  type: string;
  metadata: unknown;
  createdAt: Date | string;
}

export interface ConversationWithMessages {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastMessageAt: Date | string;
  isArchived: boolean;
  messages: ConversationMessage[];
}

// ─── Exercise Recommendation Types ───────────────────────────────────────────

export interface ExerciseRecommendationsResponse {
  exercises: Array<{
    id: string;
    name: string;
    type: 'breathing' | 'mindfulness' | 'cbt' | 'grounding' | 'movement';
    duration: string;
    difficulty: 'easy' | 'medium' | 'advanced';
    description: string;
    matchReason: string;
    benefit: string;
  }>;
  priority: 'high' | 'medium' | 'low';
  contextualNote: string;
}

// ─── Assessments API ──────────────────────────────────────────────────────────

export const assessmentsApi = {
  /** Fetch assessment templates. If `types` is provided, only those templates are returned. */
  getAssessmentTemplates: async (
    types?: string[]
  ): Promise<ApiResponse<{ templates: AssessmentTemplate[] }>> => {
    const url = types && types.length > 0
      ? `${API_BASE_URL}/assessments/templates?types=${types.join(',')}`
      : `${API_BASE_URL}/assessments/templates`;

    const response = await fetch(url, { headers: authHeaders() });
    return response.json();
  },

  /** Fetch assessments that can be taken individually (excludes short-form combined). */
  getAvailableAssessments: async (): Promise<ApiResponse<{
    assessments: Array<{
      id: string;
      title: string;
      category: string;
      description: string;
      timeEstimate: string;
      type: string;
    }>;
  }>> => {
    const response = await fetch(`${API_BASE_URL}/assessments/available`, {
      headers: authHeaders()
    });
    return response.json();
  },

  /** Get the full assessment history and insights for the current user. */
  getAssessmentHistory: async (): Promise<ApiResponse<AssessmentInsights>> => {
    const response = await fetch(`${API_BASE_URL}/assessments/history`, {
      headers: authHeaders()
    });
    return response.json();
  },

  /** Submit a completed assessment. */
  submitAssessment: async (payload: {
    assessmentType: string;
    responses: Record<string, number | string>;
    responseDetails?: Array<{
      questionId: string;
      questionText: string;
      answerLabel: string;
      answerValue: string | number | null;
      answerScore?: number;
    }>;
    score: number;
    rawScore?: number;
    maxScore?: number;
    sessionId?: string;
    categoryBreakdown?: Record<string, { raw: number; normalized: number; interpretation?: string }>;
  }): Promise<ApiResponse<{
    result: AssessmentHistoryEntry;
    session?: AssessmentSessionSummary;
    insights?: AssessmentInsights['insights'];
  }>> => {
    const response = await fetch(`${API_BASE_URL}/assessments/submit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  /** Submit multiple assessments as part of a combined session. */
  submitCombinedAssessments: async (payload: {
    sessionId: string;
    assessments: Array<{
      assessmentType: string;
      responses: Record<string, number | string>;
      responseDetails?: Array<unknown>;
      score: number;
      rawScore?: number;
      maxScore?: number;
      categoryBreakdown?: Record<string, { raw: number; normalized: number; interpretation?: string }>;
    }>;
  }): Promise<ApiResponse<{
    session: AssessmentSessionSummary;
    insights: AssessmentInsights['insights'];
  }>> => {
    const response = await fetch(`${API_BASE_URL}/assessments/sessions/${payload.sessionId}/submit-combined`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  /** Get the active assessment session for the current user, if any. */
  getActiveAssessmentSession: async (): Promise<ApiResponse<{ session: AssessmentSessionSummary | null }>> => {
    const response = await fetch(`${API_BASE_URL}/assessments/sessions/active`, {
      headers: authHeaders()
    });
    return response.json();
  },

  /** Start a new assessment session with the given assessment types. */
  startAssessmentSession: async (payload: {
    selectedTypes: string[];
  }): Promise<ApiResponse<{
    session: AssessmentSessionSummary;
    insights: AssessmentInsights['insights'];
  }>> => {
    const response = await fetch(`${API_BASE_URL}/assessments/sessions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  /** Update an existing assessment session's status. */
  updateAssessmentSessionStatus: async (
    sessionId: string,
    status: 'in_progress' | 'completed' | 'abandoned'
  ): Promise<ApiResponse<{ session: AssessmentSessionSummary }>> => {
    const response = await fetch(`${API_BASE_URL}/assessments/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status })
    });
    return response.json();
  }
};

// ─── Chat API ─────────────────────────────────────────────────────────────────

export const chatApi = {
  /** Fetch the chat message history for the current user. */
  getChatHistory: async (): Promise<ApiResponse<{
    messages: Array<{
      id: string;
      content: string;
      type: 'user' | 'bot' | 'system';
      createdAt: string;
      feedback?: 'liked' | 'disliked' | null;
      metadata?: Record<string, unknown>;
    }>;
  }>> => {
    const response = await fetch(`${API_BASE_URL}/chat/history`, {
      headers: authHeaders()
    });
    return response.json();
  },

  /** Send a chat message. */
  sendMessage: async (
    content: string,
    conversationId?: string
  ): Promise<ApiResponse<{
    messageId: string;
    response: string;
    suggestions?: string[];
    conversationId?: string;
    metadata?: Record<string, unknown>;
  }>> => {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message: content, conversationId })
    });
    return response.json();
  },

  /** Get a personalized mood-based greeting. */
  getMoodBasedGreeting: async (): Promise<ApiResponse<{ greeting: string }>> => {
    const response = await fetch(`${API_BASE_URL}/chat/greeting`, {
      headers: authHeaders()
    });
    return response.json();
  },

  /** Get conversation starters personalized for the current user. */
  getConversationStarters: async (): Promise<ApiResponse<{ starters: string[] }>> => {
    const response = await fetch(`${API_BASE_URL}/chat/starters`, {
      headers: authHeaders()
    });
    return response.json();
  },

  /** Get a proactive check-in if one is due. */
  getProactiveCheckIn: async (): Promise<ApiResponse<{
    shouldCheckIn: boolean;
    message?: string;
    priority?: 'high' | 'medium' | 'low';
  }>> => {
    const response = await fetch(`${API_BASE_URL}/chat/proactive-checkin`, {
      headers: authHeaders()
    });
    return response.json();
  },

  /** Get exercise recommendations based on current context. */
  getExerciseRecommendations: async (
    message?: string
  ): Promise<ApiResponse<ExerciseRecommendationsResponse>> => {
    const response = await fetch(`${API_BASE_URL}/chat/exercises`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message })
    });
    return response.json();
  },

  /** Submit feedback on a specific chat message. */
  submitFeedback: async (
    messageId: string,
    feedback: 'liked' | 'disliked'
  ): Promise<ApiResponse<{ messageId: string; feedback: string }>> => {
    const response = await fetch(`${API_BASE_URL}/chat/feedback/${messageId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ feedback })
    });
    return response.json();
  }
};

// ─── Conversations API ────────────────────────────────────────────────────────

export const conversationsApi = {
  getConversations: async (
    includeArchived = false
  ): Promise<ApiResponse<Conversation[]>> => {
    const url = `${API_BASE_URL}/conversations?includeArchived=${includeArchived}`;
    const response = await fetch(url, { headers: authHeaders() });
    return response.json();
  },

  getConversation: async (
    conversationId: string
  ): Promise<ApiResponse<ConversationWithMessages>> => {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      headers: authHeaders()
    });
    return response.json();
  },

  getConversationCount: async (
    includeArchived = false
  ): Promise<ApiResponse<{ count: number }>> => {
    const url = `${API_BASE_URL}/conversations/count?includeArchived=${includeArchived}`;
    const response = await fetch(url, { headers: authHeaders() });
    return response.json();
  },

  createConversation: async (title?: string): Promise<ApiResponse<Conversation>> => {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title })
    });
    return response.json();
  },

  updateConversation: async (
    conversationId: string,
    updates: { title?: string; isArchived?: boolean }
  ): Promise<ApiResponse<Conversation>> => {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(updates)
    });
    return response.json();
  },

  deleteConversation: async (
    conversationId: string
  ): Promise<ApiResponse<void>> => {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return response.json();
  },

  archiveConversation: async (
    conversationId: string,
    isArchived: boolean
  ): Promise<ApiResponse<Conversation>> => {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/archive`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ isArchived })
    });
    return response.json();
  },

  searchConversations: async (query: string): Promise<ApiResponse<Conversation[]>> => {
    const url = `${API_BASE_URL}/conversations/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: authHeaders() });
    return response.json();
  },

  generateTitle: async (
    conversationId: string
  ): Promise<ApiResponse<{ title: string }>> => {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/generate-title`, {
      method: 'POST',
      headers: authHeaders()
    });
    return response.json();
  },

  exportConversation: async (
    conversationId: string,
    format: 'pdf' | 'text' | 'json',
    includeSystemMessages = true
  ): Promise<Blob> => {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/export?format=${format}&includeSystemMessages=${includeSystemMessages}`,
      { headers: authHeaders() }
    );
    if (!response.ok) {
      throw new Error('Failed to export conversation');
    }
    return response.blob();
  },

  exportBulkConversations: async (
    conversationIds: string[],
    format: 'text' | 'json'
  ): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/conversations/export/bulk`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ conversationIds, format })
    });
    if (!response.ok) {
      throw new Error('Failed to export conversations');
    }
    return response.blob();
  }
};

// ─── Mood API ─────────────────────────────────────────────────────────────────

export const moodApi = {
  getMoodHistory: async (params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ moodEntries: MoodEntry[] }>> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const url = `${API_BASE_URL}/mood${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url, { headers: authHeaders() });
    const data = await response.json();

    // Normalise response: backend may return a flat array or {moodEntries:[]}
    if (data.success && Array.isArray(data.data)) {
      return { ...data, data: { moodEntries: data.data } };
    }
    return data;
  },

  logMood: async (
    mood: string,
    notes?: string
  ): Promise<ApiResponse<MoodEntry>> => {
    const response = await fetch(`${API_BASE_URL}/mood`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ mood, notes })
    });
    return response.json();
  },

  deleteMoodEntry: async (id: string): Promise<ApiResponse<void>> => {
    const response = await fetch(`${API_BASE_URL}/mood/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return response.json();
  }
};

// ─── Plans API ────────────────────────────────────────────────────────────────

export const plansApi = {
  getPersonalizedPlan: async (): Promise<ApiResponse<PlanModuleWithState[]>> => {
    const response = await fetch(`${API_BASE_URL}/plans/personalized`, {
      headers: authHeaders()
    });
    return response.json();
  },

  updateModuleProgress: async (
    moduleId: string,
    progress: number
  ): Promise<ApiResponse<UserPlanModuleState>> => {
    const response = await fetch(`${API_BASE_URL}/plans/modules/${moduleId}/progress`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ progress })
    });
    return response.json();
  }
};

// ─── Progress API ─────────────────────────────────────────────────────────────

export const progressApi = {
  getProgressHistory: async (metric?: string): Promise<ApiResponse<ProgressEntry[]>> => {
    const url = metric
      ? `${API_BASE_URL}/progress?metric=${encodeURIComponent(metric)}`
      : `${API_BASE_URL}/progress`;
    const response = await fetch(url, { headers: authHeaders() });
    return response.json();
  },

  trackProgress: async (payload: {
    metric: string;
    value: number;
    notes?: string;
  }): Promise<ApiResponse<ProgressEntry>> => {
    const response = await fetch(`${API_BASE_URL}/progress`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  }
};

// ─── Auth API (profile security operations) ───────────────────────────────────

export const authApi = {
  updateSecurityQuestionWithPassword: async (payload: {
    currentPassword: string;
    question: string;
    answer: string;
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await fetch(`${API_BASE_URL}/auth/security-question/update`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  resetPasswordAuthenticated: async (payload: {
    answer: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> => {
    const response = await fetch(`${API_BASE_URL}/auth/password/reset-with-answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  updateApproachWithPassword: async (payload: {
    password: string;
    approach: 'western' | 'eastern' | 'hybrid';
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await fetch(`${API_BASE_URL}/auth/approach/update`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  }
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  updateProfile: async (
    userId: string,
    payload: Partial<{
      firstName: string;
      lastName: string;
      birthday: string;
      region: string;
      gender: string;
      language: string;
      emergencyContact: string;
      emergencyPhone: string;
      approach: 'western' | 'eastern' | 'hybrid';
      dataConsent: boolean;
      clinicianSharing: boolean;
    }>
  ): Promise<ApiResponse<{ user: User }>> => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  }
};

// ─── Privacy API ──────────────────────────────────────────────────────────────

interface PrivacySettings {
  dataSharing: boolean;
  clinicianAccess: boolean;
  anonymousAnalytics: boolean;
  marketingEmails: boolean;
  researchParticipation: boolean;
  consentUpdatedAt: string;
}

export const privacyApi = {
  getSettings: async (): Promise<ApiResponse<PrivacySettings>> => {
    const response = await fetch(`${API_BASE_URL}/privacy/settings`, {
      headers: authHeaders()
    });
    return response.json();
  },

  updateSettings: async (
    settings: Partial<Omit<PrivacySettings, 'consentUpdatedAt'>>
  ): Promise<ApiResponse<Pick<PrivacySettings, 'consentUpdatedAt'>>> => {
    const response = await fetch(`${API_BASE_URL}/privacy/settings`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(settings)
    });
    return response.json();
  },

  exportData: async (
    format: 'json' | 'csv' | 'pdf',
    sections: string[]
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/privacy/export`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ format, sections })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error((error as { error?: string }).error || 'Export failed');
    }

    const blob = await response.blob();
    const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'pdf';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maansarathi-data-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  deleteAccount: async (): Promise<ApiResponse<void>> => {
    const response = await fetch(`${API_BASE_URL}/privacy/account`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return response.json();
  }
};

// ─── Admin API ────────────────────────────────────────────────────────────────

const adminJsonFetch = async (url: string, options: RequestInit = {}) => {
  const res = await adminFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined)
    }
  });
  return res.json();
};

export const adminApi = {
  listAssessments: async () => {
    return adminJsonFetch(`${API_BASE_URL}/admin/assessments`);
  },

  getAssessmentCategories: async () => {
    return adminJsonFetch(`${API_BASE_URL}/admin/assessments/categories`);
  },

  getAssessment: async (id: string) => {
    return adminJsonFetch(`${API_BASE_URL}/admin/assessments/${id}`);
  },

  createAssessment: async (data: unknown) => {
    return adminJsonFetch(`${API_BASE_URL}/admin/assessments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateAssessment: async (id: string, data: unknown) => {
    return adminJsonFetch(`${API_BASE_URL}/admin/assessments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  duplicateAssessment: async (id: string) => {
    return adminJsonFetch(`${API_BASE_URL}/admin/assessments/${id}/duplicate`, {
      method: 'POST'
    });
  },

  deleteAssessment: async (id: string) => {
    return adminJsonFetch(`${API_BASE_URL}/admin/assessments/${id}`, {
      method: 'DELETE'
    });
  }
};
