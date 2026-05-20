import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './BaseAIProvider';
import { AIMessage, AIResponse, AIConfig, ConversationContext, AIProviderConfig } from '../../types/ai';

export class AnthropicProvider extends BaseAIProvider {
  public name = 'Anthropic';
  private clients: Map<string, Anthropic> = new Map();

  constructor(config: AIProviderConfig) {
    super('Anthropic', config);
    this.initializeClients();
  }

  private initializeClients(): void {
    const apiKeys = this.getAllApiKeys();
    
    for (const apiKey of apiKeys) {
      if (apiKey && apiKey !== 'your_anthropic_api_key_here') {
        try {
          const client = new Anthropic({ apiKey });
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
        // Simple test request to check if API key is valid
        await Promise.race([
          client.messages.create({
            model: this.config.model || 'claude-3-sonnet-20240229',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
          }),
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
        // Convert system message to separate parameter for Anthropic
        const systemMessage = preparedMessages.find(msg => msg.role === 'system')?.content || '';
        const conversationMessages = preparedMessages.filter(msg => msg.role !== 'system');

        const response = await Promise.race([
          client.messages.create({
            model: config?.model || this.config.model || 'claude-3-sonnet-20240229',
            system: systemMessage,
            messages: conversationMessages.map((msg: AIMessage) => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            })),
            max_tokens: config?.maxTokens || this.config.maxTokens || 150,
            temperature: config?.temperature || this.config.temperature || 0.7,
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 
            config?.timeout || this.config.timeout || 30000)
          )
        ]);

        const processingTime = Date.now() - startTime;

        const aiResponse: AIResponse = {
          content: response.content[0]?.type === 'text' ? response.content[0].text : '',
          usage: {
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
            total_tokens: response.usage.input_tokens + response.usage.output_tokens,
          },
          model: response.model,
          provider: this.name,
          finish_reason: response.stop_reason || undefined,
          success: true,
          processingTime,
          apiKeyUsed: this.currentApiKeyIndex
        };

        return aiResponse;

      } catch (error: any) {
        console.error(`[${this.name}] Error while generating response:`, error);
        
        // Handle specific Anthropic errors
        if (error.status === 429) {
          const retryError = new Error('Anthropic rate limit exceeded');
          (retryError as any).statusCode = 429;
          throw retryError;
        }
        
        if (error.status === 401) {
          const authError = new Error('Invalid Anthropic API key');
          (authError as any).statusCode = 401;
          throw authError;
        }

        if (error.status === 402) {
          const quotaError = new Error('Anthropic quota exceeded');
          (quotaError as any).statusCode = 402;
          throw quotaError;
        }

        // Re-throw with additional context
        const enhancedError = new Error(`Anthropic API error: ${error.message}`);
        (enhancedError as any).statusCode = error.status || 500;
        throw enhancedError;
      }
    });
  }
}
