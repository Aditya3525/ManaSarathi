// User & Auth Types
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

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
}

// Assessment Types
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

// Progress & Mood Types
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

// Plan Types
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

// Chat & Conversation Types
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

// Content & Practice Types
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
  duration: number | null;
  difficulty: string | null;
  tags: string | null;
  isPublished: boolean;
  contentType: string | null;
  intensityLevel: string | null;
  focusAreas: string[] | null;
  immediateRelief: boolean;
  culturalContext: string | null;
  hasSubtitles: boolean;
  transcript: string | null;
  completions: number;
  averageRating: number | null;
  effectiveness: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeStep {
  step: number;
  instruction: string;
  duration?: number;
}

export interface Practice {
  id: string;
  title: string;
  type: string;
  approach: string;
  description: string | null;
  duration: number;
  difficulty: string;
  format: string;
  audioUrl: string | null;
  videoUrl: string | null;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  tags: string | null;
  instructions: string | null;
  benefits: string | null;
  precautions: string | null;
  isPublished: boolean;
  category: string | null;
  intensityLevel: string | null;
  requiredEquipment: string[] | null;
  environment: string[] | null;
  timeOfDay: string[] | null;
  sensoryEngagement: string[] | null;
  steps: PracticeStep[] | null;
  contraindications: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentEngagement {
  id: string;
  userId: string;
  contentId: string;
  completed: boolean;
  rating: number | null;
  timeSpent: number | null;
  moodBefore: string | null;
  moodAfter: string | null;
  effectiveness: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementStatistics {
  totalCompletions: number;
  averageRating: number | null;
  averageEffectiveness: number | null;
}

// Recommendation & Crisis Types
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
  priority: number;
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
  confidence: number;
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
  availableTime?: number;
  environment?: 'home' | 'work' | 'public' | 'nature';
  immediateNeed?: boolean;
}

// Dashboard Types
export interface DashboardSummary {
  recentAssessments: AssessmentHistoryEntry[];
  moodTrend: string;
  planProgress: number;
  recommendedPractice: Practice | null;
  weeklyProgress: WeeklyProgress;
}

export interface WeeklyProgress {
  assessmentsCompleted: number;
  practicesCompleted: number;
  moodAverage: number;
  streakDays: number;
}

// API Response Type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Help & Safety Types
export interface CrisisResource {
  id: string;
  name: string;
  type: 'hotline' | 'text' | 'chat' | 'emergency';
  phoneNumber?: string;
  textNumber?: string;
  chatUrl?: string;
  available: string;
  description: string;
  region?: string;
  languages?: string[];
}

export interface SafetyPlan {
  id: string;
  userId: string;
  warningSigns: string[];
  copingStrategies: string[];
  distractions: string[];
  socialContacts: Array<{ name: string; phone: string; relationship: string }>;
  professionalContacts: Array<{ name: string; phone: string; role: string }>;
  emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
  safeEnvironment: string[];
  reasonsToLive: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
  views: number;
  tags?: string[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface Therapist {
  id: string;
  name: string;
  title: string;
  specialization: string[];
  approach: string[];
  languages: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  availability: string;
  location: string;
  remote: boolean;
  profileImage?: string;
  bio: string;
  credentials: string[];
  insuranceAccepted: string[];
  sessionRate: number;
}

export interface TherapistBooking {
  id: string;
  userId: string;
  therapistId: string;
  dateTime: string;
  duration: number;
  type: 'initial' | 'followup';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

// Accessibility Settings Types
export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  fontFamily: 'default' | 'opensans' | 'roboto' | 'lato' | 'inter';
  colorPalette: 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender' | 'neutral';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
}

// Notification Settings Types
export interface NotificationSettings {
  enabled: boolean;
  moodReminders: boolean;
  assessmentReminders: boolean;
  planReminders: boolean;
  chatNotifications: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}
