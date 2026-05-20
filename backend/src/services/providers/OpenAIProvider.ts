import OpenAI from 'openai';
import { BaseAIProvider } from './BaseAIProvider';
import { AIMessage, AIResponse, AIConfig, ConversationContext, AIProviderConfig } from '../../types/ai';

export class OpenAIProvider extends BaseAIProvider {
  public name = 'OpenAI';
  private clients: Map<string, OpenAI> = new Map();

  constructor(config: AIProviderConfig) {
    super('OpenAI', config);
    this.initializeClients();
  }

  private initializeClients(): void {
    const apiKeys = this.getAllApiKeys();
    
    for (const apiKey of apiKeys) {
      if (apiKey && apiKey !== 'your_openai_api_key_here') {
        try {
          const client = new OpenAI({ apiKey });
          this.clients.set(apiKey, client);
        } catch (error) {
          console.warn(`[${this.name}] Failed to initialize client:`, error);
        }
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.clients.size > 0 && await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    if (this.clients.size === 0) return false;
    
    return await this.tryWithKeyRotation(async (apiKey: string) => {
      const client = this.clients.get(apiKey);
      if (!client) throw new Error('Client not found for API key');
      
      try {
        await Promise.race([
          client.models.list(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        return true;
      } catch (error) {
        console.warn(`[${this.name}] Connection test failed:`, error);
        throw error;
      }
    });
  }

  async generateResponse(
    messages: AIMessage[], 
    config?: AIConfig,
    context?: ConversationContext
  ): Promise<AIResponse> {
    if (this.clients.size === 0) {
      throw new Error(`[${this.name}] No valid API clients available`);
    }

    const preparedMessages = this.prepareMessages(messages, context);
    const startTime = Date.now();

    return await this.tryWithKeyRotation(async (apiKey: string) => {
      const client = this.clients.get(apiKey);
      if (!client) throw new Error('Client not found for API key');

      try {
        const response = await Promise.race([
          client.chat.completions.create({
            model: config?.model || this.config.model || 'gpt-3.5-turbo',
            messages: preparedMessages.map((msg: AIMessage) => ({
              role: msg.role,
              content: msg.content
            })),
            max_tokens: config?.maxTokens || this.config.maxTokens || 150,
            temperature: config?.temperature || this.config.temperature || 0.7,
            presence_penalty: 0.1,
            frequency_penalty: 0.1,
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 
            config?.timeout || this.config.timeout || 30000)
          )
        ]);

        const processingTime = Date.now() - startTime;

        const aiResponse: AIResponse = {
          content: response.choices[0]?.message?.content || '',
          usage: {
            prompt_tokens: response.usage?.prompt_tokens,
            completion_tokens: response.usage?.completion_tokens,
            total_tokens: response.usage?.total_tokens,
          },
          model: response.model,
          provider: this.name,
          finish_reason: response.choices[0]?.finish_reason || undefined,
          success: true,
          processingTime,
          apiKeyUsed: this.currentApiKeyIndex
        };

        return aiResponse;

      } catch (error: any) {
        console.error(`[${this.name}] Error while generating response:`, error);
        
        // Handle specific OpenAI errors
        if (error.error?.code === 'rate_limit_exceeded') {
          const retryError = new Error('OpenAI rate limit exceeded');
          (retryError as any).statusCode = 429;
          throw retryError;
        }
        
        if (error.error?.code === 'invalid_api_key') {
          const authError = new Error('Invalid OpenAI API key');
          (authError as any).statusCode = 401;
          throw authError;
        }

        if (error.error?.code === 'insufficient_quota') {
          const quotaError = new Error('OpenAI quota exceeded');
          (quotaError as any).statusCode = 402;
          throw quotaError;
        }

        // Re-throw with additional context
        const enhancedError = new Error(`OpenAI API error: ${error.message}`);
        (enhancedError as any).statusCode = error.status || 500;
        throw enhancedError;
      }
    });
  }
}
