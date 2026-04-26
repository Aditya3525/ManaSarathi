import type { AssessmentTypeSummary } from '../services/assessmentInsightsService';

// AI Provider Types and Interfaces

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
  provider?: string;
  finish_reason?: string;
  success?: boolean;
  error?: string;
  processingTime?: number;
  apiKeyUsed?: number; // Index of API key used (for rotation tracking)
}

export interface AIConfig {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  timeout?: number;
}

export interface UserContext {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  ageGroup?: 'teen' | 'young-adult' | 'adult' | 'middle-aged' | 'senior';
  region?: string;
  language?: string;
  simpleLanguage?: boolean;
  approach?: 'western' | 'eastern' | 'hybrid';
  approachEngine?: 'western' | 'eastern' | 'hybrid';
  recentAssessments?: any[];
  recentCheckins?: Array<{
    id: string;
    type: string;
    responses: Record<string, unknown>;
    mood?: string | null;
    createdAt: Date;
  }>;
  recentJournals?: Array<{
    id: string;
    prompt?: string | null;
    mood?: string | null;
    tags: string[];
    createdAt: Date;
  }>;
  recentMoodEntries?: Array<{
    mood: string;
    emotion?: string | null;
    emotionGroup?: string | null;
    intensity?: number | null;
    trigger?: string | null;
    createdAt: Date;
  }>;
  todayIntention?: {
    id: string;
    intention: string;
    isCustom: boolean;
    completed: boolean | null;
    reflection?: string | null;
    createdAt: Date;
  };
  recentGratitudeEntries?: Array<{
    id: string;
    items: string[];
    note?: string | null;
    createdAt: Date;
  }>;
  recentSleepLogs?: Array<{
    id: string;
    bedTime: Date;
    wakeTime: Date;
    quality: number;
    duration?: number | null;
    factors: string[];
    createdAt: Date;
  }>;
  sleepAverages?: {
    weeklyDuration: number | null;
    weeklyQuality: number | null;
  };
  chatHistory?: any[];
  currentMood?: string;
  moodTrend?: string;
  hasCompletedAssessments?: boolean;
  preferences?: any;
  wellnessScore?: number;
  wellbeingTrend?: string;
  aiSummary?: string;
  assessmentInsights?: {
    byType: Record<string, AssessmentTypeSummary & { normalizedScore?: number }>;
    recommendations?: string[];
  };
  wellnessInsights?: {
    trend?: 'improving' | 'stable' | 'declining';
    score?: number;
    details?: string;
  };
  activeGoals?: Array<{
    goalType: string;
    title: string;
    progress: number;
    status: string;
  }>;
}

export interface ConversationContext {
  user: UserContext;
  messages: AIMessage[];
  sessionId: string;
  timestamp: Date;
}

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateResponse(
    messages: AIMessage[],
    config?: AIConfig,
    context?: ConversationContext
  ): Promise<AIResponse>;
  testConnection(): Promise<boolean>;
}

export interface AIProviderConfig {
  apiKeys?: string[]; // Support multiple API keys for fallback
  apiKey?: string;    // Single API key (backward compatibility)
  baseURL?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  priority?: number;  // Provider priority (lower = higher priority)
}

export enum AIProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  NVIDIA = 'nvidia',
  GROQ = 'groq',
  HUGGINGFACE = 'huggingface',
  OLLAMA = 'ollama'
}

export interface AIError extends Error {
  provider?: string;
  code?: string;
  statusCode?: number;
  retryable?: boolean;
}
