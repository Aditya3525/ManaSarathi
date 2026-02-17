import { AIProvider, AIMessage, AIResponse, AIConfig, ConversationContext, AIProviderConfig, AIError } from '../../types/ai';

export abstract class BaseAIProvider implements AIProvider {
  public name: string;
  protected config: AIProviderConfig;
  protected currentApiKeyIndex: number = 0;
  private verboseLogging = process.env.AI_VERBOSE_LOGGING?.toLowerCase() === 'true';

  constructor(name: string, config: AIProviderConfig) {
    this.name = name;
    this.config = config;
  }

  abstract generateResponse(
    messages: AIMessage[], 
    config?: AIConfig, 
    context?: ConversationContext
  ): Promise<AIResponse>;

  abstract testConnection(): Promise<boolean>;

  abstract isAvailable(): Promise<boolean>;

  /**
   * Get the current API key for rotation
   */
  protected getCurrentApiKey(): string | null {
    if (this.config.apiKeys && this.config.apiKeys.length > 0) {
      return this.config.apiKeys[this.currentApiKeyIndex];
    }
    return this.config.apiKey || null;
  }

  /**
   * Rotate to the next API key
   */
  protected rotateApiKey(): boolean {
    if (this.config.apiKeys && this.config.apiKeys.length > 1) {
      this.currentApiKeyIndex = (this.currentApiKeyIndex + 1) % this.config.apiKeys.length;
      this.logVerbose(`[${this.name}] Rotating to API key index: ${this.currentApiKeyIndex}`);
      return true;
    }
    return false;
  }

  /**
   * Get all available API keys
   */
  protected getAllApiKeys(): string[] {
    if (this.config.apiKeys && this.config.apiKeys.length > 0) {
      return this.config.apiKeys;
    }
    return this.config.apiKey ? [this.config.apiKey] : [];
  }

  /**
   * Try operation with API key rotation on failure
   */
  protected async tryWithKeyRotation<T>(
    operation: (apiKey: string) => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    const apiKeys = this.getAllApiKeys();
    const retries = maxRetries || apiKeys.length;
    
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      const apiKey = this.getCurrentApiKey();
      
      if (!apiKey) {
        throw new Error(`[${this.name}] No API key available`);
      }

      try {
        this.logVerbose(`[${this.name}] Attempt ${attempt + 1}/${retries} with API key index: ${this.currentApiKeyIndex}`);
        return await operation(apiKey);
      } catch (error) {
        lastError = error as Error;
        this.logVerbose(`[${this.name}] API key ${this.currentApiKeyIndex} failed: ${
          (error as Error).message
        }`);
        
        // If this was the last attempt, don't rotate
        if (attempt === retries - 1) {
          break;
        }
        
        // Try to rotate to next API key
        if (!this.rotateApiKey()) {
          // No more keys to try
          break;
        }
      }
    }

    throw lastError || new Error(`[${this.name}] All API keys exhausted`);
  }

  protected logVerbose(message: string): void {
    if (this.verboseLogging) {
      console.log(message);
    }
  }

  /**
   * Create therapeutic system prompt based on user context
   */
  protected createSystemPrompt(context?: ConversationContext): string {
  const basePrompt = `You are a licensed wellbeing coach. You deliver warm, strengths-based guidance while following these guardrails:

• Never make medical diagnoses, prescribe medication, or replace emergency/professional care.
• Keep each response under 150 words, conversational, and trauma-informed.
• Validate the user’s feelings before offering gentle reframes or practical next steps.
• If you detect self-harm, suicide, or imminent risk, calmly urge them to seek emergency services or trusted support straight away.
• Do not mention the internal coaching “approach” labels (western/eastern/hybrid) unless the user explicitly asks.
• If assessments are missing or limited, you may briefly suggest completing one to personalise guidance.`;

    if (!context?.user) {
      return basePrompt;
    }

    const user = context.user;
    
    // Build personalized context without revealing the approach
    let personalizedContext = `
    
User Context:
- Name: ${user.firstName || user.name || 'User'}
- Current Mood: ${user.currentMood || 'Not specified'}`;

    // Add age context if available
    if (user.age || user.ageGroup) {
      personalizedContext += `
- Age: ${user.age ? `${user.age} years old` : 'Not specified'}`;
      if (user.ageGroup) {
        personalizedContext += ` (${user.ageGroup})`;
      }
    }

    // Add mood trend if available
    if (user.moodTrend) {
      personalizedContext += `
- Recent Mood Pattern: ${user.moodTrend}`;
    }

    // Add assessment context if available
    if (user.hasCompletedAssessments && user.recentAssessments && user.recentAssessments.length > 0) {
      personalizedContext += `
- Assessment Results:`;
      
      user.recentAssessments.slice(0, 3).forEach((assessment: any) => {
        personalizedContext += `
  * ${assessment.assessmentType}: ${assessment.interpretation} (score: ${assessment.score})`;
        
        if (assessment.specificConcerns && assessment.specificConcerns.length > 0) {
          personalizedContext += ` - Key concerns: ${assessment.specificConcerns.join(', ')}`;
        }
      });
    } else {
      personalizedContext += `
- Assessment Status: No recent assessments completed - recommend completing assessments for more personalized support`;
    }

    // Adapt therapeutic techniques based on user's approach (without mentioning it)
    let therapeuticGuidance = '';
    
    // Add age-specific communication guidance
    let ageGuidance = '';
    if (user.ageGroup) {
      switch (user.ageGroup) {
        case 'teen':
          ageGuidance = `

Age-Appropriate Communication:
- Use supportive, non-condescending language that respects their developing autonomy
- Acknowledge the unique pressures of adolescence (school, peer relationships, identity)
- Focus on building coping skills for academic stress, social situations, and emotional regulation
- Be mindful of family dynamics and encourage healthy communication with trusted adults
- Validate their experiences while gently guiding toward healthy perspectives
- Use relatable examples and avoid overly clinical language`;
          break;
        case 'young-adult':
          ageGuidance = `

Age-Appropriate Communication:
- Acknowledge the challenges of early adulthood transitions (career, relationships, independence)
- Focus on building life skills, decision-making abilities, and emotional resilience
- Address common concerns like imposter syndrome, relationship issues, and future anxiety
- Encourage exploration of identity and values while promoting stability
- Support work-life balance and stress management techniques
- Use contemporary examples and acknowledge modern pressures (social media, economic stress)`;
          break;
        case 'adult':
          ageGuidance = `

Age-Appropriate Communication:
- Address the complexities of established adult life (career progression, relationships, family)
- Focus on balancing multiple responsibilities and managing life transitions
- Support with parenting challenges, relationship dynamics, and professional stress
- Encourage self-care practices that fit busy lifestyles
- Address concerns about life fulfillment, purpose, and personal growth
- Provide practical strategies that can be implemented within existing commitments`;
          break;
        case 'middle-aged':
          ageGuidance = `

Age-Appropriate Communication:
- Acknowledge midlife transitions and evolving life perspectives
- Address concerns about aging, health, and changing family dynamics
- Support with empty nest syndrome, career changes, or caregiving responsibilities
- Focus on rediscovering purpose and maintaining vitality
- Encourage reflection on life achievements and future goals
- Address concerns about physical and emotional health changes with sensitivity`;
          break;
        case 'senior':
          ageGuidance = `

Age-Appropriate Communication:
- Show deep respect for their life experience and wisdom
- Address concerns about aging, health changes, and maintaining independence
- Support with grief, loss, and life transitions with particular sensitivity
- Focus on finding meaning, legacy, and continued purpose
- Encourage social connections and combating isolation
- Acknowledge the unique perspectives that come with a lifetime of experience
- Be patient and thorough in explanations without being patronizing`;
          break;
      }
    }
    
    if (user.hasCompletedAssessments) {
      switch (user.approach) {
        case 'western':
          therapeuticGuidance = `

Therapeutic Focus:
- Use cognitive-behavioral techniques naturally in conversation
- Help identify patterns in thinking and behavior
- Suggest practical problem-solving strategies
- Encourage behavioral activation and goal-setting
- Focus on evidence-based coping strategies`;
          break;
        case 'eastern':
          therapeuticGuidance = `

Therapeutic Focus:
- Incorporate mindfulness and present-moment awareness naturally
- Suggest breathing exercises and meditation when appropriate
- Focus on acceptance and non-judgment of difficult emotions
- Use metaphors and gentle guidance toward inner wisdom
- Emphasize balance and harmony in responses`;
          break;
        case 'hybrid':
          therapeuticGuidance = `

Therapeutic Focus:
- Blend practical problem-solving with mindful acceptance
- Use both cognitive techniques and mindfulness approaches
- Adapt strategy based on the specific situation presented
- Balance action-oriented advice with acceptance-based support
- Draw from various therapeutic traditions as appropriate`;
          break;
        default:
          therapeuticGuidance = `

Therapeutic Focus:
- Use a balanced, integrative approach
- Focus on practical coping strategies and emotional support
- Adapt techniques based on what seems most helpful for the user
- Prioritize building rapport and understanding`;
      }
    } else {
      therapeuticGuidance = `

Response Guidelines:
- Provide general emotional support and validation
- Ask open-ended questions to understand their situation better
- Gently suggest that completing wellbeing assessments could help provide more personalized support
- Focus on basic coping strategies that work for most people
- Encourage them to share more about their specific concerns`;
    }

    return basePrompt + personalizedContext + ageGuidance + therapeuticGuidance;
  }

  /**
   * Prepare messages for AI with system prompt.
   * If the incoming messages already contain a system prompt (injected by
   * chatService.buildSystemPrompt), we honour it and skip prepending our own
   * to avoid duplicate / conflicting instructions.
   */
  protected prepareMessages(messages: AIMessage[], context?: ConversationContext): AIMessage[] {
    const alreadyHasSystemPrompt = messages.length > 0 && messages[0].role === 'system';

    if (alreadyHasSystemPrompt) {
      return messages;
    }

    // Fallback: build a lightweight system prompt when none was provided
    const systemPrompt = this.createSystemPrompt(context);
    return [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
  }

  /**
   * Handle common errors and determine if retryable
   */
  protected handleError(error: any, provider: string): AIError {
    const aiError = new Error(error.message || 'Unknown AI provider error') as AIError;
    aiError.provider = provider;
    
    if (error.status || error.statusCode) {
      aiError.statusCode = error.status || error.statusCode;
      
      // Rate limiting, server errors are retryable
      if (aiError.statusCode) {
        aiError.retryable = [429, 500, 502, 503, 504].includes(aiError.statusCode);
      }
    }
    
    if (error.code) {
      aiError.code = error.code;
      // Network errors are usually retryable
      aiError.retryable = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
    }
    
    return aiError;
  }
}
