import { PrismaClient, AssessmentResult, ChatMessage, MoodEntry } from '@prisma/client';
import { logger } from '../utils/logger';
import { advancedAnalyticsService } from './advancedAnalyticsService';
import { llmService } from './llmProvider';

const prisma = new PrismaClient();
const crisisLogger = logger.child({ module: 'CrisisDetection' });

export type CrisisLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface CrisisDetectionContext {
  assessments: AssessmentResult[];
  recentMessages: ChatMessage[];
  moodHistory: MoodEntry[];
  engagementHistory?: Array<{
    completed: boolean;
    effectiveness?: number | null;
    timeSpent?: number | null;
  }>;
}

export interface CrisisDetectionResult {
  level: CrisisLevel;
  confidence: number; // 0-1
  indicators: string[];
  recommendations: string[];
  immediateAction: boolean;
}

// Crisis keywords with severity weights
const CRISIS_PATTERNS = {
  CRITICAL: [
    /\b(suicide|suicidal|kill myself|end (my|it all))\b/i,
    /\b(want to die|better off dead|no reason to live)\b/i,
    /\b(self[ -]?harm|cutting|overdose)\b/i,
    /\b(plan to (die|hurt))\b/i,
  ],
  HIGH: [
    /\b(hopeless|worthless|no point)\b/i,
    /\b(can'?t go on|give up)\b/i,
    /\b(hurt myself|harm myself)\b/i,
    /\b(severe|extreme|unbearable) (pain|depression|anxiety)\b/i,
  ],
  MODERATE: [
    /\b(don'?t want to (live|be here))\b/i,
    /\b(life (is|feels) meaningless)\b/i,
    /\b(wish (i|I) (wasn'?t|weren'?t) (here|alive))\b/i,
    /\b(overwhelming|suffocating|drowning)\b/i,
  ],
  LOW: [
    /\b(struggling|barely coping|barely holding on)\b/i,
    /\b(intense|severe) (anxiety|depression|panic)\b/i,
    /\b(can'?t handle|too much)\b/i,
  ]
};

export class CrisisDetectionService {
  /**
   * AI-assisted crisis scoring (0-10). This supplements, not replaces, keyword checks.
   */
  async assessCrisisWithAI(message: string): Promise<{ score: number; reasoning: string }> {
    try {
      const response = await llmService.generateResponse(
        [
          {
            role: 'system',
            content:
              'You are a safety classifier. Rate the user message for self-harm/suicide risk from 0 to 10. '
              + '0 = no risk, 3 = mild distress, 5 = moderate distress, 7 = high concern with explicit self-harm cues, 9-10 = immediate crisis. '
              + 'Do NOT score above 6 unless the user explicitly mentions self-harm, suicide intent, plan, means, or desire to die. '
              + 'General stress, anxiety, grief, or feeling overwhelmed without self-harm intent should stay at 0-5. '
              + 'Respond ONLY as JSON: {"score": number, "reasoning": "one-word"}.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        {
          maxTokens: 40,
          temperature: 0,
          timeout: 4000
        }
      );

      const raw = response.content?.trim() || '{}';
      const parsed = JSON.parse(raw) as { score?: number; reasoning?: string };
      const safeScore = Number.isFinite(parsed.score) ? Math.max(0, Math.min(10, Number(parsed.score))) : 0;

      return {
        score: safeScore,
        reasoning: parsed.reasoning || 'unspecified'
      };
    } catch {
      return {
        score: 0,
        reasoning: 'ai-unavailable'
      };
    }
  }

  /**
   * Detect crisis level from multi-layered context
   */
  async detectCrisisLevel(userId: string, context: CrisisDetectionContext): Promise<CrisisDetectionResult> {
    crisisLogger.info({ userId }, 'Running crisis detection analysis');

    const indicators: string[] = [];
    let maxLevel: CrisisLevel = 'NONE';
    let confidence = 0;

    // Layer 1: Chat content analysis (highest priority)
    const chatAnalysis = this.analyzeChatContent(context.recentMessages);
    if (chatAnalysis.level !== 'NONE') {
      maxLevel = this.compareLevel(maxLevel, chatAnalysis.level);
      indicators.push(...chatAnalysis.indicators);
      confidence = Math.max(confidence, chatAnalysis.confidence);
    }

    // Layer 2: Assessment scores
    const assessmentAnalysis = this.analyzeAssessmentScores(context.assessments);
    if (assessmentAnalysis.level !== 'NONE') {
      maxLevel = this.compareLevel(maxLevel, assessmentAnalysis.level);
      indicators.push(...assessmentAnalysis.indicators);
      confidence = Math.max(confidence, assessmentAnalysis.confidence * 0.8); // Slightly lower weight
    }

    // Layer 3: Mood trajectory
    const moodAnalysis = this.analyzeMoodTrajectory(context.moodHistory);
    if (moodAnalysis.level !== 'NONE') {
      maxLevel = this.compareLevel(maxLevel, moodAnalysis.level);
      indicators.push(...moodAnalysis.indicators);
      confidence = Math.max(confidence, moodAnalysis.confidence * 0.7);
    }

    // Layer 4: Engagement patterns (disengagement can be a warning sign)
    if (context.engagementHistory) {
      const engagementAnalysis = this.analyzeEngagementPatterns(context.engagementHistory);
      if (engagementAnalysis.level !== 'NONE') {
        maxLevel = this.compareLevel(maxLevel, engagementAnalysis.level);
        indicators.push(...engagementAnalysis.indicators);
        confidence = Math.max(confidence, engagementAnalysis.confidence * 0.6);
      }
    }

    const recommendations = this.generateRecommendations(maxLevel);
    const immediateAction = maxLevel === 'CRITICAL' || maxLevel === 'HIGH';

    crisisLogger.info(
      { userId, level: maxLevel, confidence, indicatorCount: indicators.length },
      'Crisis detection complete'
    );

    if (immediateAction) {
      crisisLogger.warn(
        { userId, level: maxLevel, indicators },
        'CRISIS ALERT: Immediate action required'
      );
    }

    // Track crisis event for analytics (only track if not NONE or LOW)
    if (maxLevel !== 'NONE' && maxLevel !== 'LOW') {
      try {
        await advancedAnalyticsService.trackCrisisEvent({
          userId,
          crisisLevel: maxLevel,
          confidence,
          indicators: Array.from(new Set(indicators)),
          actionTaken: immediateAction ? 'IMMEDIATE_INTERVENTION' : 'MONITORING'
        });
      } catch (analyticsError) {
        crisisLogger.warn({ err: analyticsError }, 'Failed to track crisis event analytics');
      }
    }

    return {
      level: maxLevel,
      confidence,
      indicators: Array.from(new Set(indicators)), // Remove duplicates
      recommendations,
      immediateAction
    };
  }

  /**
   * Analyze chat messages for crisis language
   */
  private analyzeChatContent(messages: ChatMessage[]): {
    level: CrisisLevel;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let highestLevel: CrisisLevel = 'NONE';
    let highestWeight = 0;

    const recentContent = messages
      .slice(-10) // Last 10 messages
      .filter(msg => msg.type === 'user')
      .map(msg => msg.content)
      .join(' ');

    // Check CRITICAL patterns first
    for (const pattern of CRISIS_PATTERNS.CRITICAL) {
      if (pattern.test(recentContent)) {
        highestLevel = 'CRITICAL';
        highestWeight = 1.0;
        indicators.push('Critical crisis language detected in conversation');
        break;
      }
    }

    // Check HIGH patterns
    if (highestLevel === 'NONE') {
      for (const pattern of CRISIS_PATTERNS.HIGH) {
        if (pattern.test(recentContent)) {
          highestLevel = 'HIGH';
          highestWeight = 0.85;
          indicators.push('High-risk language patterns detected');
          break;
        }
      }
    }

    // Check MODERATE patterns
    if (highestLevel === 'NONE') {
      for (const pattern of CRISIS_PATTERNS.MODERATE) {
        if (pattern.test(recentContent)) {
          highestLevel = 'MODERATE';
          highestWeight = 0.7;
          indicators.push('Moderate distress language detected');
          break;
        }
      }
    }

    // Check LOW patterns
    if (highestLevel === 'NONE') {
      for (const pattern of CRISIS_PATTERNS.LOW) {
        if (pattern.test(recentContent)) {
          highestLevel = 'LOW';
          highestWeight = 0.5;
          indicators.push('Elevated distress indicators in conversation');
          break;
        }
      }
    }

    return {
      level: highestLevel,
      confidence: highestWeight,
      indicators
    };
  }

  /**
   * Analyze assessment scores for crisis indicators
   */
  private analyzeAssessmentScores(assessments: AssessmentResult[]): {
    level: CrisisLevel;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let level: CrisisLevel = 'NONE';
    let confidence = 0;

    if (assessments.length === 0) {
      return { level, confidence, indicators };
    }

    // Get most recent assessments
    const recent = assessments
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, 3);

    // Check PHQ-9 (depression) - score 20+ is severe
    const phq9 = recent.find(a => a.assessmentType.toLowerCase().includes('phq9') || a.assessmentType.toLowerCase().includes('depression'));
    if (phq9 && phq9.score >= 80) { // Normalized to 100
      level = this.compareLevel(level, 'HIGH');
      confidence = Math.max(confidence, 0.9);
      indicators.push('Severe depression symptoms detected (PHQ-9)');
    } else if (phq9 && phq9.score >= 60) {
      level = this.compareLevel(level, 'MODERATE');
      confidence = Math.max(confidence, 0.75);
      indicators.push('Moderately severe depression symptoms');
    }

    // Check GAD-7 (anxiety) - score 15+ is severe
    const gad7 = recent.find(a => a.assessmentType.toLowerCase().includes('anxiety'));
    if (gad7 && gad7.score >= 75) {
      level = this.compareLevel(level, 'MODERATE');
      confidence = Math.max(confidence, 0.8);
      indicators.push('Severe anxiety symptoms detected (GAD-7)');
    }

    // Check trauma (PCL-5) - score 60+ is severe
    const trauma = recent.find(a => a.assessmentType.toLowerCase().includes('trauma'));
    if (trauma && trauma.score >= 75) {
      level = this.compareLevel(level, 'MODERATE');
      confidence = Math.max(confidence, 0.8);
      indicators.push('Severe trauma symptoms detected');
    }

    // Check for rapid deterioration
    if (assessments.length >= 2) {
      const sorted = assessments.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
      const latest = sorted[0];
      const previous = sorted[1];
      
      if (latest.assessmentType === previous.assessmentType) {
        const change = latest.score - previous.score;
        if (change >= 20) { // Significant worsening (20+ point increase)
          level = this.compareLevel(level, 'MODERATE');
          confidence = Math.max(confidence, 0.7);
          indicators.push('Rapid deterioration in assessment scores');
        }
      }
    }

    return { level, confidence, indicators };
  }

  /**
   * Analyze mood entry patterns for crisis indicators
   */
  private analyzeMoodTrajectory(moodHistory: MoodEntry[]): {
    level: CrisisLevel;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let level: CrisisLevel = 'NONE';
    let confidence = 0;

    if (moodHistory.length === 0) {
      return { level, confidence, indicators };
    }

    const recent = moodHistory
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 7); // Last week

    // Count negative moods
    const negativeMoods = recent.filter(m => 
      ['struggling', 'anxious', 'low', 'overwhelmed'].some(neg => 
        m.mood.toLowerCase().includes(neg)
      )
    ).length;

    if (negativeMoods >= 5) { // 5+ out of 7 days
      level = 'MODERATE';
      confidence = 0.7;
      indicators.push('Persistent negative mood pattern over past week');
    } else if (negativeMoods >= 3) {
      level = 'LOW';
      confidence = 0.6;
      indicators.push('Elevated negative mood frequency');
    }

    // Check for sudden mood drops
    if (recent.length >= 2) {
      const latest = recent[0].mood.toLowerCase();
      const previous = recent[1].mood.toLowerCase();
      
      const positiveMoods = ['great', 'good', 'okay', 'calm'];
      const wasPositive = positiveMoods.some(p => previous.includes(p));
      const isNegative = ['struggling', 'anxious', 'overwhelmed'].some(n => latest.includes(n));
      
      if (wasPositive && isNegative) {
        level = this.compareLevel(level, 'LOW');
        confidence = Math.max(confidence, 0.65);
        indicators.push('Sudden mood deterioration detected');
      }
    }

    return { level, confidence, indicators };
  }

  /**
   * Analyze engagement patterns (disengagement can signal crisis)
   */
  private analyzeEngagementPatterns(engagements: Array<{
    completed: boolean;
    effectiveness?: number | null;
    timeSpent?: number | null;
  }>): {
    level: CrisisLevel;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let level: CrisisLevel = 'NONE';
    let confidence = 0;

    if (engagements.length < 3) {
      return { level, confidence, indicators };
    }

    const recent = engagements.slice(-5);
    
    // Check completion rates
    const completionRate = recent.filter(e => e.completed).length / recent.length;
    if (completionRate < 0.3) {
      level = 'LOW';
      confidence = 0.5;
      indicators.push('Low content completion rate may indicate disengagement');
    }

    // Check reported effectiveness
    const withEffectiveness = recent.filter(e => e.effectiveness !== null && e.effectiveness !== undefined);
    if (withEffectiveness.length >= 2) {
      const avgEffectiveness = withEffectiveness.reduce((sum, e) => sum + (e.effectiveness || 0), 0) / withEffectiveness.length;
      if (avgEffectiveness < 3) { // On 1-10 scale
        level = this.compareLevel(level, 'LOW');
        confidence = Math.max(confidence, 0.55);
        indicators.push('Consistently low self-reported effectiveness');
      }
    }

    return { level, confidence, indicators };
  }

  /**
   * Generate context-appropriate recommendations
   */
  private generateRecommendations(level: CrisisLevel): string[] {
    const recommendations: string[] = [];

    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        recommendations.push(
          'Contact emergency services (988 Suicide & Crisis Lifeline in US, 999/112 in UK/EU)',
          'Reach out to your emergency contact immediately',
          'Go to the nearest emergency room if you feel unsafe',
          'Text HELLO to 741741 (Crisis Text Line) for immediate support'
        );
        break;

      case 'MODERATE':
        recommendations.push(
          'Consider scheduling an appointment with a professional',
          'Reach out to a trusted friend or family member',
          'Contact your therapist or counselor if you have one',
          'Use crisis support resources: 988 Lifeline or Crisis Text Line (text HELLO to 741741)'
        );
        break;

      case 'LOW':
        recommendations.push(
          'Try grounding exercises or breathing techniques',
          'Consider connecting with your support network',
          'Engage with gentle self-care activities',
          'Monitor your symptoms and reach out if they worsen'
        );
        break;

      case 'NONE':
      default:
        recommendations.push(
          'Continue with your current wellness practices',
          'Stay connected with your support system',
          'Keep tracking your mood and progress'
        );
    }

    return recommendations;
  }

  /**
   * Compare crisis levels and return the higher one
   */
  private compareLevel(current: CrisisLevel, newLevel: CrisisLevel): CrisisLevel {
    const order: CrisisLevel[] = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
    const currentIndex = order.indexOf(current);
    const newIndex = order.indexOf(newLevel);
    return newIndex > currentIndex ? newLevel : current;
  }

  /**
   * Determine the primary detection source for analytics
   */
  private determineDetectionSource(context: CrisisDetectionContext): string {
    if (context.recentMessages.length > 0) {
      return 'CHAT_ANALYSIS';
    }
    if (context.assessments.length > 0) {
      return 'ASSESSMENT_SCORES';
    }
    if (context.moodHistory.length > 0) {
      return 'MOOD_TRAJECTORY';
    }
    if (context.engagementHistory && context.engagementHistory.length > 0) {
      return 'ENGAGEMENT_PATTERNS';
    }
    return 'UNKNOWN';
  }

  /**
   * Check if crisis language is present in a message
   */
  detectCrisisLanguage(content: string): boolean {
    for (const patterns of Object.values(CRISIS_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return true;
        }
      }
    }
    return false;
  }
}

// Export singleton instance
export const crisisDetectionService = new CrisisDetectionService();
