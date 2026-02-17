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
  approach?: 'western' | 'eastern' | 'hybrid';
  approachEngine?: 'western' | 'eastern' | 'hybrid';
  recentAssessments?: any[];
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
