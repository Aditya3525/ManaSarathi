import { API_BASE_URL, API_CONFIG } from '../constants/config';
import { TokenManager } from '../utils/storage';
import type {
  User,
  AuthResponse,
  ApiResponse,
  AvailableAssessment,
  AssessmentTemplate,
  AssessmentSyncPayload,
  AssessmentHistoryEntry,
  AssessmentInsights,
  AssessmentSessionSummary,
  ProgressEntry,
  MoodEntry,
  PlanModuleWithState,
  ChatResponsePayload,
  ConversationSummary,
  ProactiveCheckIn,
  ExerciseRecommendationsResponse,
  Conversation,
  ConversationWithMessages,
  ConversationMessage,
  Content,
  Practice,
  ContentEngagement,
  EngagementStatistics,
  EnhancedRecommendationResult,
  RecommendationContext,
  CrisisDetectionResult,
} from '../types';

/**
 * HTTP Client for API requests
 * Adapted for React Native with async token management
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    _isRetry = false
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;

      // Get auth headers asynchronously
      const authHeaders = await TokenManager.getAuthHeaders();

      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(options.headers ?? {}),
        },
      };

      // Log request for debugging (development only)
      if (__DEV__) {
        const hasToken = await TokenManager.hasToken();
        console.log(`API Request: ${options.method || 'GET'} ${url}`, {
          hasToken,
        });
      }

      // Use Promise.race for timeout instead of AbortController
      // (whatwg-fetch polyfill in React Native doesn't support AbortController correctly)
      const timeoutMs = (API_CONFIG as any)?.TIMEOUT ?? 30000;
      const fetchPromise = fetch(url, config);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Handle 401 — attempt token refresh once
      if (response.status === 401 && !_isRetry) {
        // Token expired — clear it and signal auth failure
        await TokenManager.removeToken();
        return {
          success: false,
          error: 'Session expired. Please log in again.',
        };
      }

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
      console.error('API request failed:', endpoint, error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      // Provide a user-friendly message for common network errors
      const isNetworkError =
        message.includes('Network request failed') ||
        message.includes('Failed to fetch') ||
        message.includes('ECONNREFUSED') ||
        message.includes('Aborted') ||
        message.includes('timed out');
      return {
        success: false,
        error: isNetworkError
          ? `Cannot reach server at ${this.baseURL}. Please check that the backend is running and your device can reach it.`
          : message,
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
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create API client instance
const apiClient = new ApiClient(API_BASE_URL);

// Log the resolved API URL in development for debugging
if (__DEV__) {
  console.log(`[API] Base URL: ${API_BASE_URL}`);
}

// ============================================================================
// Auth API
// ============================================================================
export const authApi = {
  async register(userData: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const response = await apiClient.post<{ user: User; token: string }>('/auth/register', userData);

    if (response.success && response.data) {
      await TokenManager.setToken(response.data.token);
    }

    return response;
  },

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const response = await apiClient.post<{ user: User; token: string }>('/auth/login', credentials);

    if (response.success && response.data) {
      await TokenManager.setToken(response.data.token);
    }

    return response;
  },

  async googleAuth(code: string): Promise<AuthResponse> {
    // Use the mobile-specific Google OAuth endpoint that accepts code exchange
    // (The web app uses a browser redirect flow at /auth/google, which doesn't work for mobile)
    const response = await apiClient.post<{ user: User; token: string }>('/auth/google/mobile', { code });

    if (response.success && response.data) {
      await TokenManager.setToken(response.data.token);
    }

    return response;
  },

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/forgot-password', { email });
  },

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get<{ user: User }>('/auth/me');
  },

  async setupPassword(password: string): Promise<ApiResponse<{ user: User }>> {
    return apiClient.post<{ user: User }>('/auth/setup-password', { password });
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

  async logout(): Promise<void> {
    await TokenManager.removeToken();
  },

  async serverLogout(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/logout');
  },

  async isAuthenticated(): Promise<boolean> {
    return await TokenManager.hasToken();
  },
};

// ============================================================================
// Users API
// ============================================================================
export const usersApi = {
  async updateProfile(updates: Partial<User> & {
    dateOfBirth?: string;
    birthday?: string;
    gender?: string;
    preferredApproach?: string;
    approach?: string;
    primaryConcern?: string;
    emergencyContact?: any;
    emergencyPhone?: string;
    hasCompletedOnboarding?: boolean;
    isOnboarded?: boolean;
    dataConsent?: boolean;
  }): Promise<User> {
    // Uses /auth/profile which is the correct backend endpoint
    const response = await apiClient.put<{ user: User }>('/auth/profile', updates);
    if (!response.success || !response.data?.user) {
      throw new Error(response.error || 'Failed to update profile');
    }
    return response.data.user;
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
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // Uses the backend's authenticated password change endpoint
    const response = await apiClient.post('/users/change-password', {
      currentPassword,
      newPassword,
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to change password');
    }
  },
};

// ============================================================================
// Assessments API
// ============================================================================
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
  },
};

// ============================================================================
// Progress API
// ============================================================================
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
  },
};

// ============================================================================
// Mood API
// ============================================================================
export const moodApi = {
  async logMood(mood: string, notes?: string): Promise<ApiResponse<unknown>> {
    return apiClient.post('/mood', { mood, notes });
  },

  async getMoodHistory(): Promise<ApiResponse<{ moodEntries: MoodEntry[] }>> {
    return apiClient.get('/mood');
  },

  async deleteMoodEntry(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/mood/${id}`);
  },

  async getMoodStats(days?: number): Promise<ApiResponse<unknown>> {
    const endpoint = days ? `/mood/stats?days=${days}` : '/mood/stats';
    return apiClient.get(endpoint);
  },
};

// ============================================================================
// Chat API
// ============================================================================
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
};

// ============================================================================
// Conversations API
// ============================================================================
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
};

// ============================================================================
// Plans API
// ============================================================================
export const plansApi = {
  async getPersonalizedPlan(): Promise<ApiResponse<PlanModuleWithState[]>> {
    return apiClient.get('/plans/personalized');
  },

  async updateModuleProgress(moduleId: string, progress: number): Promise<ApiResponse<unknown>> {
    return apiClient.put(`/plans/modules/${moduleId}/progress`, { progress });
  },

  async completeModule(moduleId: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/plans/modules/${moduleId}/complete`);
  },
};

// ============================================================================
// Content API
// ============================================================================
export const contentApi = {
  async getContent(filters?: { category?: string; type?: string; approach?: string }): Promise<ApiResponse<Content[]>> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.approach) params.append('approach', filters.approach);

    const queryString = params.toString();
    const endpoint = queryString ? `/content?${queryString}` : '/content';

    return apiClient.get(endpoint);
  },

  async getContentById(id: string): Promise<ApiResponse<Content>> {
    return apiClient.get(`/content/${id}`);
  },

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

  async getEngagementStats(
    contentId: string
  ): Promise<ApiResponse<{
    userEngagement: ContentEngagement | null;
    statistics: EngagementStatistics;
  }>> {
    return apiClient.get(`/content/${contentId}/engagement`);
  },

  async getUserEngagements(): Promise<ApiResponse<ContentEngagement[]>> {
    return apiClient.get('/content/engagements/me');
  },

  async getArticleById(id: string): Promise<any> {
    // All content types use the same generic endpoint
    const response = await apiClient.get(`/content/${id}`);
    return response.data;
  },

  async getVideoById(id: string): Promise<any> {
    const response = await apiClient.get(`/content/${id}`);
    return response.data;
  },

  async getPracticeById(id: string): Promise<any> {
    // For practices, try dedicated practice endpoint first
    const response = await apiClient.get(`/practices/${id}`);
    return response.data;
  },

  async bookmarkContent(id: string, type: 'article' | 'video' | 'practice'): Promise<void> {
    // Uses the unified bookmark endpoint
    const response = await apiClient.post(`/content/${id}/bookmark`, { type });
    if (!response.success) {
      throw new Error(response.error || 'Failed to bookmark content');
    }
  },

  async getBookmarks(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/content/bookmarks');
  },
};

// ============================================================================
// Practices API
// ============================================================================
export const practicesApi = {
  async getPractices(filters?: Record<string, unknown>): Promise<ApiResponse<Practice[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/practices?${queryString}` : '/practices';
    return apiClient.get(endpoint);
  },

  async getPracticeById(id: string): Promise<ApiResponse<Practice>> {
    return apiClient.get(`/practices/${id}`);
  },

  async logPracticeSession(data: {
    practiceId: string;
    startTime: string;
    endTime?: string;
    completed?: boolean;
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.post('/practices/sessions', data);
    return response.data;
  },
};

// ============================================================================
// Recommendations API
// ============================================================================
export const recommendationsApi = {
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
  },
};

// ============================================================================
// Crisis API
// ============================================================================
export const crisisApi = {
  async checkLevel(): Promise<ApiResponse<CrisisDetectionResult>> {
    return apiClient.get('/crisis/check');
  },

  async getResources(): Promise<ApiResponse<unknown[]>> {
    return apiClient.get('/crisis/resources');
  },

  async createSafetyPlan(plan: unknown): Promise<ApiResponse<unknown>> {
    return apiClient.post('/crisis/safety-plan', plan);
  },

  async getSafetyPlan(): Promise<ApiResponse<unknown>> {
    return apiClient.get('/crisis/safety-plan');
  },

  async deleteSafetyPlan(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete('/crisis/safety-plan');
  },
};

// ============================================================================
// Dashboard API
// ============================================================================
export const dashboardApi = {
  async getSummary(): Promise<ApiResponse<unknown>> {
    return apiClient.get('/dashboard/summary');
  },

  async getInsights(): Promise<ApiResponse<{ insights: string; updatedAt: string }>> {
    return apiClient.get('/dashboard/insights');
  },

  async refreshInsights(): Promise<ApiResponse<{ insights: string; updatedAt: string }>> {
    return apiClient.post('/dashboard/insights/refresh');
  },

  async getWeeklyProgress(): Promise<ApiResponse<unknown>> {
    return apiClient.get('/dashboard/weekly-progress');
  },

  async getRecommendedPractice(): Promise<ApiResponse<unknown>> {
    return apiClient.get('/dashboard/recommended-practice');
  },
};

// ============================================================================
// FAQ API
// ============================================================================
export const faqApi = {
  async getFAQs(category?: string): Promise<ApiResponse<unknown[]>> {
    const endpoint = category ? `/faq?category=${encodeURIComponent(category)}` : '/faq';
    return apiClient.get(endpoint);
  },

  async searchFAQs(query: string): Promise<ApiResponse<unknown[]>> {
    return apiClient.get(`/faq/search?q=${encodeURIComponent(query)}`);
  },

  async trackFAQView(id: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/faq/${id}/view`);
  },

  async voteFAQ(id: string, helpful: boolean): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/faq/${id}/vote`, { helpful });
  },
};

// ============================================================================
// Support API
// ============================================================================
export const supportApi = {
  async createTicket(ticketData: {
    subject: string;
    message: string;
    category: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<ApiResponse<unknown>> {
    return apiClient.post('/support/tickets', ticketData);
  },

  async getTickets(): Promise<ApiResponse<unknown[]>> {
    return apiClient.get('/support/tickets');
  },

  async getTicket(id: string): Promise<ApiResponse<unknown>> {
    return apiClient.get(`/support/tickets/${id}`);
  },

  async acknowledgeTicket(id: string): Promise<ApiResponse<unknown>> {
    return apiClient.put(`/support/tickets/${id}/acknowledge`);
  },
};

// ============================================================================
// Therapists API
// ============================================================================
export const therapistsApi = {
  async getTherapists(filters?: Record<string, unknown>): Promise<ApiResponse<unknown[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/therapists?${queryString}` : '/therapists';
    return apiClient.get(endpoint);
  },

  async searchTherapists(query: string, filters?: Record<string, unknown>): Promise<ApiResponse<unknown[]>> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    return apiClient.get(`/therapists/search?${params.toString()}`);
  },

  async getTherapist(id: string): Promise<ApiResponse<unknown>> {
    return apiClient.get(`/therapists/${id}`);
  },

  async bookTherapist(bookingData: {
    therapistId: string;
    dateTime: string;
    duration: number;
    type: 'initial' | 'followup';
    notes?: string;
  }): Promise<ApiResponse<unknown>> {
    return apiClient.post('/therapists/booking', bookingData);
  },

  async getBookings(): Promise<ApiResponse<unknown[]>> {
    return apiClient.get('/therapists/bookings');
  },

  async cancelBooking(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/therapists/bookings/${id}`);
  },
};

// Export the ApiClient class for testing
export { ApiClient };
