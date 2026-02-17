import { getApiBaseUrl } from '../config/apiConfig';

// API Configuration - uses shared dynamic URL detection
const API_BASE_URL = getApiBaseUrl();

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  isOnboarded: boolean;
  approach?: 'western' | 'eastern' | 'hybrid';
  birthday?: string;
  gender?: string;
  region?: string;
  language?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  dataConsent: boolean;
  clinicianSharing: boolean;
  securityQuestion?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AssessmentTrend = 'improving' | 'declining' | 'stable' | 'baseline';

export interface AssessmentCategoryBreakdownEntry {
  raw: number;
  normalized: number;
  interpretation: string;
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
  categoryBreakdown?: Record<string, AssessmentCategoryBreakdownEntry>;
}

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
  categoryBreakdown?: Record<string, AssessmentCategoryBreakdownEntry>;
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
  uiType: 'likert' | 'binary' | 'multiple-choice';
  reverseScored?: boolean;
  domain?: string | null;
  options: AssessmentTemplateOption[];
}

export interface AssessmentTemplateDomain {
  id: string;
  label: string;
  items: string[];
  minScore: number;
  maxScore: number;
  interpretationBands?: Array<{ max: number; label: string }>;
}

export interface AssessmentTemplateScoring {
  minScore: number;
  maxScore: number;
  interpretationBands: Array<{ max: number; label: string }>;
  reverseScored?: string[];
  domains?: AssessmentTemplateDomain[];
  higherIsBetter?: boolean;
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

export interface AssessmentSyncPayload {
  assessment: AssessmentHistoryEntry | null;
  history: AssessmentHistoryEntry[];
  insights: AssessmentInsights;
  session?: AssessmentSessionSummary;
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

export interface AvailableAssessment {
  id: string;
  title: string;
  category: string;
  description: string;
  timeEstimate: string;
  type: string;
  questions: number;
}

export interface ProgressEntry {
  id: string;
  userId: string;
  metric: string;
  value: number;
  date: string;
  notes?: string | null;
}

export interface MoodEntry {
  id: string;
  userId: string;
  mood: string;
  notes?: string | null;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface PlanModuleWithState {
  id: string;
  title: string;
  type: string;
  duration: string;
  difficulty: string;
  description: string;
  content: string;
  approach: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  userState: UserPlanModuleState | null;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
}

export interface ChatResponsePayload {
  message?: {
    content?: string;
  };
  response?: string;
  smartReplies?: string[];
}

export interface ConversationSummary {
  summary: string;
  keyInsights: string[];
  emotionalTrends: string[];
  topicsDiscussed: string[];
  actionItems: string[];
  overallSentiment: string;
}

export interface ProactiveCheckIn {
  shouldCheckIn: boolean;
  message: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ExerciseRecommendation {
  id: string;
  name: string;
  type: 'breathing' | 'mindfulness' | 'cbt' | 'grounding' | 'movement';
  duration: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  description: string;
  matchReason: string;
  benefit: string;
}

export interface ExerciseRecommendationsResponse {
  exercises: ExerciseRecommendation[];
  priority: 'high' | 'medium' | 'low';
  contextualNote: string;
}

// Conversation Types
export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
  isArchived: boolean;
}

export interface ConversationMessage {
  id: string;
  content: string;
  type: 'user' | 'bot' | 'system';
  metadata?: any;
  createdAt: string;
}

export interface ConversationWithMessages {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  isArchived: boolean;
  messages: ConversationMessage[];
}

// Content & Practice Types (Enhanced Schema)
export interface Content {
  id: string;
  title: string;
  type: string;
  category: string;
  approach: string;
  description: string | null;
  content: string;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null; // Changed from string to number (seconds)
  difficulty: string | null;
  tags: string | null;
  isPublished: boolean;
  // New metadata fields
  contentType: string | null; // VIDEO, AUDIO_MEDITATION, BREATHING_EXERCISE, etc.
  intensityLevel: string | null; // low, medium, high
  focusAreas: string[] | null; // Parsed from JSON
  immediateRelief: boolean;
  culturalContext: string | null;
  hasSubtitles: boolean;
  transcript: string | null;
  // Engagement statistics
  completions: number;
  averageRating: number | null;
  effectiveness: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeStep {
  step: number;
  instruction: string;
  duration?: number; // Optional duration in seconds
}

export interface Practice {
  id: string;
  title: string;
  type: string;
  approach: string;
  description: string | null;
  duration: number; // In minutes
  difficulty: string;
  format: string; // Audio, Video, Text
  audioUrl: string | null;
  videoUrl: string | null;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  tags: string | null;
  instructions: string | null;
  benefits: string | null;
  precautions: string | null;
  isPublished: boolean;
  // New metadata fields
  category: string | null; // MEDITATION, YOGA, BREATHING, etc.
  intensityLevel: string | null; // low, medium, high
  requiredEquipment: string[] | null; // Parsed from JSON
  environment: string[] | null; // home, work, public, nature
  timeOfDay: string[] | null; // morning, afternoon, evening, night
  sensoryEngagement: string[] | null; // Parsed from JSON
  steps: PracticeStep[] | null; // Parsed from JSON
  contraindications: string[] | null; // Parsed from JSON
  createdAt: string;
  updatedAt: string;
}

export interface ContentEngagement {
  id: string;
  userId: string;
  contentId: string;
  completed: boolean;
  rating: number | null; // 1-5
  timeSpent: number | null; // seconds
  moodBefore: string | null;
  moodAfter: string | null;
  effectiveness: number | null; // 1-10
  createdAt: string;
  updatedAt: string;
}

export interface EngagementStatistics {
  totalCompletions: number;
  averageRating: number | null;
  averageEffectiveness: number | null;
}

// Enhanced Recommendation Types
export type CrisisLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface EnhancedRecommendationItem {
  id?: string;
  title: string;
  description?: string | null;
  type: 'content' | 'practice' | 'suggestion' | 'crisis-resource';
  contentType?: string;
  category?: string;
  approach?: string | null;
  duration?: number | null;
  difficulty?: string | null;
  tags?: string[];
  focusAreas?: string[];
  url?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
  thumbnailUrl?: string | null;
  reason: string;
  source: 'library' | 'practice' | 'insight' | 'crisis' | 'fallback';
  priority: number; // 1-10, higher = more urgent
  immediateRelief?: boolean;
  effectiveness?: number | null;
  metadata?: Record<string, unknown>;
}

export interface EnhancedRecommendationResult {
  items: EnhancedRecommendationItem[];
  focusAreas: string[];
  rationale: string;
  crisisLevel: CrisisLevel;
  immediateAction: boolean;
  fallbackUsed: boolean;
  fallbackMessage?: string;
}

export interface CrisisDetectionResult {
  level: CrisisLevel;
  confidence: number; // 0-100
  immediateAction: boolean;
  recommendations: string[];
  helplineInfo?: {
    name: string;
    number: string;
    available: string;
  };
}

export interface RecommendationContext {
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  availableTime?: number; // minutes
  environment?: 'home' | 'work' | 'public' | 'nature';
  immediateNeed?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Token management
class TokenManager {
  private static TOKEN_KEY = 'token'; // Changed from 'auth_token' to match OAuth callback storage

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

// HTTP Client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config: RequestInit = {
        credentials: options.credentials ?? 'include',
        ...options,
      };

      const authHeaders = TokenManager.getAuthHeaders();
      config.headers = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers ?? {}),
      };

      // Log token presence for debugging (only in development)
      if (import.meta.env.DEV) {
        console.log(`API Request: ${options.method || 'GET'} ${endpoint}`, {
          hasToken: !!TokenManager.getToken(),
          tokenPrefix: TokenManager.getToken()?.substring(0, 20) + '...',
        });
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors (422) specially
        if (response.status === 422 && data.errors) {
          const errorMessages = Object.entries(data.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          throw new Error(errorMessages || data.error || 'Validation failed');
        }
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create API client instance
const apiClient = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
  async register(userData: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const response = await apiClient.post<{ user: User; token: string }>('/auth/register', userData);

    if (response.success && response.data) {
      TokenManager.setToken(response.data.token);
    }

    return response;
  },

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const response = await apiClient.post<{ user: User; token: string }>('/auth/login', credentials);

    if (response.success && response.data) {
      TokenManager.setToken(response.data.token);
    }

    return response;
  },

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get<{ user: User }>('/auth/me');
  },

  async setupPassword(password: string): Promise<ApiResponse<{ user: User }>> {
    console.log('API: Setting up password...');
    try {
      const result = await apiClient.post<{ user: User }>('/auth/setup-password', { password });
      console.log('API: Password setup result:', result);
      return result;
    } catch (error) {
      console.error('API: Password setup error:', error);
      throw error;
    }
  },

  async setSecurityQuestion(payload: { question: string; answer: string }): Promise<ApiResponse<{ user: User }>> {
    return apiClient.post<{ user: User }>('/auth/security-question', payload);
  },

  async requestSecurityQuestion(email: string): Promise<ApiResponse<{ questionAvailable: boolean; question?: string }>> {
    return apiClient.post<{ questionAvailable: boolean; question?: string }>('/auth/forgot-password', { email });
  },

  async resetPasswordWithSecurityAnswer(payload: { email: string; answer: string; newPassword: string }): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/reset-password', payload);
  },

  async resetPasswordAuthenticated(payload: { answer: string; newPassword: string }): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/password/reset-with-answer', payload);
  },

  async updateSecurityQuestionWithPassword(payload: { currentPassword: string; question: string; answer: string }): Promise<ApiResponse<{ user: User }>> {
    return apiClient.post<{ user: User }>('/auth/security-question/update', payload);
  },

  async updateApproachWithPassword(payload: { password: string; approach: 'western' | 'eastern' | 'hybrid' }): Promise<ApiResponse<{ user: User }>> {
    return apiClient.post<{ user: User }>('/auth/approach/update', payload);
  },

  async updateProfile(profileData: {
    birthday?: string;
    gender?: string;
    region?: string;
    language?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    approach?: 'western' | 'eastern' | 'hybrid';
    firstName?: string;
    lastName?: string;
    dataConsent?: boolean;
    clinicianSharing?: boolean;
    isOnboarded?: boolean;
  }): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put<{ user: User }>('/auth/profile', profileData);
  },

  logout(): void {
    TokenManager.removeToken();
  },

  async serverLogout(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/logout');
  },

  isAuthenticated(): boolean {
    return !!TokenManager.getToken();
  }
};

// Users API
export const usersApi = {
  async updateProfile(userId: string, updates: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put<{ user: User }>(`/users/${userId}`, updates);
  },

  async completeOnboarding(onboardingData: {
    approach: 'western' | 'eastern' | 'hybrid';
    firstName?: string;
    lastName?: string;
    birthday?: string;
    gender?: string;
    region?: string;
    language?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  }): Promise<ApiResponse<{ user: User }>> {
    return apiClient.post<{ user: User }>('/users/complete-onboarding', onboardingData);
  }
};

// Privacy API
export interface PrivacySettings {
  dataSharing: boolean;
  clinicianAccess: boolean;
  anonymousAnalytics: boolean;
  marketingEmails: boolean;
  researchParticipation: boolean;
  consentUpdatedAt: string | null;
}

export const privacyApi = {
  async getSettings(): Promise<ApiResponse<PrivacySettings>> {
    return apiClient.get<PrivacySettings>('/privacy/settings');
  },

  async updateSettings(settings: Partial<Omit<PrivacySettings, 'consentUpdatedAt'>>): Promise<ApiResponse<PrivacySettings>> {
    return apiClient.put<PrivacySettings>('/privacy/settings', settings);
  },

  async exportData(
    format: 'json' | 'text' | 'pdf' = 'json',
    sections?: string[]
  ): Promise<void> {
    const token = TokenManager.getToken();
    const baseURL = apiClient['baseURL'] || '/api';
    const response = await fetch(`${baseURL}/privacy/export-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ format, sections }),
    });
    if (!response.ok) throw new Error('Failed to export data');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const ext = format === 'pdf' ? 'pdf' : format === 'text' ? 'txt' : 'json';
    a.download = `MaanSarathi-export-${dateStr}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/privacy/delete-account', { confirmation: 'DELETE' });
  },
};

// Assessments API
export const assessmentsApi = {
  async getAssessments(): Promise<ApiResponse<unknown[]>> {
    return apiClient.get('/assessments');
  },

  async getAvailableAssessments(): Promise<ApiResponse<AvailableAssessment[]>> {
    return apiClient.get('/assessments/available');
  },

  async getAssessmentTemplates(types?: string[]): Promise<ApiResponse<{ templates: AssessmentTemplate[] }>> {
    const query = types && types.length ? `?types=${encodeURIComponent(types.join(','))}` : '';
    return apiClient.get(`/assessments/templates${query}`);
  },

  async submitAssessment(assessmentData: {
    assessmentType: string;
    responses: Record<string, unknown>;
    responseDetails?: Array<{
      questionId: string;
      questionText: string;
      answerLabel: string;
      answerValue: unknown;
      answerScore?: number;
    }>;
    score?: number;
    rawScore?: number;
    maxScore?: number;
    sessionId?: string;
    categoryBreakdown?: Record<string, { raw: number; normalized: number; interpretation?: string }>;
  }): Promise<ApiResponse<AssessmentSyncPayload>> {
    return apiClient.post('/assessments', assessmentData);
  },

  async submitCombinedAssessments(payload: {
    sessionId: string;
    assessments: Array<{
      assessmentType: string;
      responses: Record<string, unknown>;
      score: number;
      rawScore?: number;
      maxScore?: number;
      responseDetails?: Array<{
        questionId: string;
        questionText: string;
        answerLabel: string;
        answerValue: unknown;
        answerScore?: number;
      }>;
      categoryBreakdown?: Record<string, { raw: number; normalized: number; interpretation?: string }>;
    }>;
  }): Promise<ApiResponse<{
    assessments: unknown[];
    session: AssessmentSessionSummary;
    history: AssessmentHistoryEntry[];
    insights: AssessmentInsights;
  }>> {
    return apiClient.post('/assessments/submit-combined', payload);
  },

  async getAssessmentHistory(): Promise<ApiResponse<{ history: AssessmentHistoryEntry[]; insights: AssessmentInsights }>> {
    return apiClient.get('/assessments/history');
  },

  async startAssessmentSession(payload: { selectedTypes: string[] }): Promise<ApiResponse<{ session: AssessmentSessionSummary }>> {
    return apiClient.post('/assessments/sessions', payload);
  },

  async getActiveAssessmentSession(): Promise<ApiResponse<{ session: AssessmentSessionSummary } | null>> {
    return apiClient.get('/assessments/sessions/active');
  },

  async getAssessmentSessionById(sessionId: string): Promise<ApiResponse<{ session: AssessmentSessionSummary }>> {
    return apiClient.get(`/assessments/sessions/${sessionId}`);
  },

  async updateAssessmentSessionStatus(sessionId: string, status: 'completed' | 'cancelled'): Promise<ApiResponse<{ session: AssessmentSessionSummary }>> {
    return apiClient.patch(`/assessments/sessions/${sessionId}`, { status });
  }
};

// Progress API
export const progressApi = {
  async trackProgress(data: {
    metric: string;
    value: number;
    notes?: string;
  }): Promise<ApiResponse<unknown>> {
    return apiClient.post('/progress', data);
  },

  async getProgressHistory(metric?: string): Promise<ApiResponse<ProgressEntry[]>> {
    const endpoint = metric ? `/progress?metric=${metric}` : '/progress';
    return apiClient.get(endpoint);
  }
};

// Mood API
export const moodApi = {
  async logMood(mood: string, notes?: string): Promise<ApiResponse<unknown>> {
    return apiClient.post('/users/mood', { mood, notes });
  },

  async getMoodHistory(): Promise<ApiResponse<{ moodEntries: MoodEntry[] }>> {
    return apiClient.get('/users/mood-history');
  }
};

// Chat API
export const chatApi = {
  async sendMessage(content: string, conversationId?: string): Promise<ApiResponse<ChatResponsePayload & { conversationId?: string; conversationTitle?: string }>> {
    return apiClient.post('/chat/message', { content, conversationId });
  },

  async getChatHistory(): Promise<ApiResponse<unknown[]>> {
    return apiClient.get('/chat/history');
  },

  async getConversationStarters(): Promise<ApiResponse<string[]>> {
    return apiClient.get('/chat/starters');
  },

  async getConversationSummary(userId: string): Promise<ApiResponse<ConversationSummary>> {
    return apiClient.get(`/chat/summary/${userId}`);
  },

  async getProactiveCheckIn(): Promise<ApiResponse<ProactiveCheckIn>> {
    return apiClient.get('/chat/check-in');
  },

  async getMoodBasedGreeting(): Promise<ApiResponse<{ greeting: string }>> {
    return apiClient.get('/chat/greeting');
  },

  async getExerciseRecommendations(currentMessage?: string): Promise<ApiResponse<ExerciseRecommendationsResponse>> {
    return apiClient.post('/chat/exercises', { message: currentMessage });
  },

  async submitFeedback(messageId: string, feedback: 'liked' | 'disliked'): Promise<ApiResponse<{ messageId: string; feedback: string }>> {
    return apiClient.put(`/chat/message/${messageId}/feedback`, { feedback });
  },

  async submitMoodCheck(conversationId: string, moodBefore?: number, moodAfter?: number): Promise<ApiResponse<any>> {
    return apiClient.post('/chat/mood-check', { conversationId, moodBefore, moodAfter });
  },

  async getMemory(userId: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/chat/memory/${userId}`);
  },

  async clearMemory(): Promise<ApiResponse<any>> {
    return apiClient.delete('/chat/memory');
  }
};

// Conversations API
export const conversationsApi = {
  async getConversations(includeArchived = false): Promise<ApiResponse<Conversation[]>> {
    const params = includeArchived ? '?includeArchived=true' : '';
    return apiClient.get(`/conversations${params}`);
  },

  async getConversation(conversationId: string): Promise<ApiResponse<ConversationWithMessages>> {
    return apiClient.get(`/conversations/${conversationId}`);
  },

  async createConversation(title?: string): Promise<ApiResponse<Conversation>> {
    return apiClient.post('/conversations', { title });
  },

  async updateConversation(conversationId: string, updates: { title?: string; isArchived?: boolean }): Promise<ApiResponse<Conversation>> {
    return apiClient.patch(`/conversations/${conversationId}`, updates);
  },

  async deleteConversation(conversationId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/conversations/${conversationId}`);
  },

  async generateTitle(conversationId: string): Promise<ApiResponse<{ title: string }>> {
    return apiClient.post(`/conversations/${conversationId}/title`, {});
  },

  async searchConversations(query: string): Promise<ApiResponse<Conversation[]>> {
    return apiClient.get(`/conversations/search?q=${encodeURIComponent(query)}`);
  },

  async archiveConversation(conversationId: string, isArchived: boolean): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/conversations/${conversationId}/archive`, { isArchived });
  },

  async getConversationCount(includeArchived = false): Promise<ApiResponse<{ count: number }>> {
    const params = includeArchived ? '?includeArchived=true' : '';
    return apiClient.get(`/conversations/count${params}`);
  },

  /**
   * Export single conversation
   */
  async exportConversation(
    conversationId: string,
    format: 'pdf' | 'text' | 'json',
    includeSystemMessages = true
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (!includeSystemMessages) {
      params.append('includeSystemMessages', 'false');
    }

    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/export?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export conversation');
    }

    return await response.blob();
  },

  /**
   * Export multiple conversations
   */
  async exportBulkConversations(
    conversationIds: string[],
    format: 'text' | 'json'
  ): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/export/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ conversationIds, format }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export conversations');
    }

    return await response.blob();
  }
};

// Plans API
export const plansApi = {
  async getPersonalizedPlan(): Promise<ApiResponse<PlanModuleWithState[]>> {
    return apiClient.get('/plans/personalized');
  },

  async updateModuleProgress(moduleId: string, progress: number): Promise<ApiResponse<unknown>> {
    return apiClient.put(`/plans/modules/${moduleId}/progress`, { progress });
  },

  async completeModule(moduleId: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/plans/modules/${moduleId}/complete`);
  }
};

// Content API
export const contentApi = {
  async getContent(filters?: { category?: string; type?: string; approach?: string }): Promise<ApiResponse<unknown[]>> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.approach) params.append('approach', filters.approach);

    const queryString = params.toString();
    const endpoint = queryString ? `/content?${queryString}` : '/content';

    return apiClient.get(endpoint);
  },

  async getContentById(id: string): Promise<ApiResponse<unknown>> {
    return apiClient.get(`/content/${id}`);
  },

  // New engagement tracking method
  async trackEngagement(
    contentId: string,
    data: {
      completed: boolean;
      rating?: number | null;
      timeSpent?: number | null;
      moodBefore?: string | null;
      moodAfter?: string | null;
      effectiveness?: number | null;
    }
  ): Promise<ApiResponse<ContentEngagement>> {
    return apiClient.post(`/content/${contentId}/engage`, data);
  },

  // Get engagement statistics for a content item
  async getEngagementStats(
    contentId: string
  ): Promise<ApiResponse<{
    userEngagement: ContentEngagement | null;
    statistics: EngagementStatistics;
  }>> {
    return apiClient.get(`/content/${contentId}/engagement`);
  },

  // Get user's engagement history (for EngagementMetrics component)
  async getUserEngagements(): Promise<ApiResponse<ContentEngagement[]>> {
    return apiClient.get('/users/me/engagements');
  }
};

// New recommendation and crisis APIs
export const recommendationsApi = {
  // Get personalized, crisis-aware recommendations
  async getPersonalized(
    context?: RecommendationContext
  ): Promise<ApiResponse<EnhancedRecommendationResult>> {
    const params = new URLSearchParams();
    if (context?.timeOfDay) params.append('timeOfDay', context.timeOfDay);
    if (context?.availableTime) params.append('availableTime', context.availableTime.toString());
    if (context?.environment) params.append('environment', context.environment);
    if (context?.immediateNeed !== undefined) params.append('immediateNeed', context.immediateNeed.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/recommendations/personalized?${queryString}` : '/recommendations/personalized';

    return apiClient.get(endpoint);
  }
};

export const crisisApi = {
  // Check current crisis level
  async checkLevel(): Promise<ApiResponse<CrisisDetectionResult>> {
    return apiClient.get('/crisis/check');
  }
};

// Admin API
export const adminApi = {
  // Assessments
  async listAssessments(params?: { category?: string; isActive?: boolean; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    return apiClient.get(`/admin/assessments${queryString ? `?${queryString}` : ''}`);
  },

  async getAssessment(id: string) {
    return apiClient.get(`/admin/assessments/${id}`);
  },

  async createAssessment(data: any) {
    return apiClient.post('/admin/assessments', data);
  },

  async updateAssessment(id: string, data: any) {
    return apiClient.put(`/admin/assessments/${id}`, data);
  },

  async deleteAssessment(id: string) {
    return apiClient.delete(`/admin/assessments/${id}`);
  },

  async duplicateAssessment(id: string) {
    return apiClient.post(`/admin/assessments/${id}/duplicate`);
  },

  async previewAssessment(id: string, responses: Record<string, string>) {
    return apiClient.post(`/admin/assessments/${id}/preview`, { responses });
  },

  async getAssessmentCategories() {
    return apiClient.get('/admin/assessments/categories');
  }
};

// Helper functions for JSON parsing
export const parseContentJSON = (content: any): Content => {
  if (!content) return content;

  return {
    ...content,
    focusAreas: content.focusAreas ?
      (typeof content.focusAreas === 'string' ? JSON.parse(content.focusAreas) : content.focusAreas)
      : null
  };
};

export const parsePracticeJSON = (practice: any): Practice => {
  if (!practice) return practice;

  const parseField = (field: any): any => {
    if (!field) return null;
    return typeof field === 'string' ? JSON.parse(field) : field;
  };

  return {
    ...practice,
    requiredEquipment: parseField(practice.requiredEquipment),
    environment: parseField(practice.environment),
    timeOfDay: parseField(practice.timeOfDay),
    sensoryEngagement: parseField(practice.sensoryEngagement),
    steps: parseField(practice.steps),
    contraindications: parseField(practice.contraindications)
  };
};

// Batch parse helper for lists
export const parseContentList = (contents: any[]): Content[] => {
  return contents.map(parseContentJSON);
};

export const parsePracticeList = (practices: any[]): Practice[] => {
  return practices.map(parsePracticeJSON);
};

export { TokenManager };
