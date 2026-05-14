import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { BaseAIProvider } from './BaseAIProvider';
import { AIProviderConfig, AIMessage, AIResponse, ConversationContext } from '../../types/ai';

export class GeminiProvider extends BaseAIProvider {
  private clients: GoogleGenerativeAI[] = [];
  private currentClientIndex = 0;

  constructor(config: AIProviderConfig) {
    super('Gemini', config);
    this.initializeClients();
  }

  private initializeClients(): void {
    if (!this.config.apiKeys || this.config.apiKeys.length === 0) {
      throw new Error('At least one Gemini API key is required');
    }

    this.clients = this.config.apiKeys
      .filter(key => key && key.trim() !== '' && !key.includes('your_gemini'))
      .map(apiKey => new GoogleGenerativeAI(apiKey));

    if (this.clients.length === 0) {
      throw new Error('No valid Gemini API keys provided');
    }
  }

  async generateResponse(
    messages: AIMessage[],
    options: any = {},
    context?: ConversationContext
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      return await this.tryWithKeyRotation(async (apiKey: string) => {
        // Find the client index for this API key
        const clientIndex = this.config.apiKeys?.indexOf(apiKey) || 0;
        const client = this.clients[clientIndex];
        
        const selectedModel = options.model || this.config.model || 'gemini-2.0-flash-lite';
        const model = client.getGenerativeModel({
          model: selectedModel,
          generationConfig: {
            temperature: options.temperature || this.config.temperature || 0.7,
            topP: options.topP || 0.95,
            topK: options.topK || 64,
            maxOutputTokens: options.maxTokens || this.config.maxTokens || 800,
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
          ],
        });
        // Extract system prompt from incoming messages if present (injected by chatService),
        // otherwise fall back to the base provider's lightweight prompt.
        let systemPrompt: string;
        let conversationMessages = messages;

        if (messages.length > 0 && messages[0].role === 'system') {
          systemPrompt = messages[0].content;
          conversationMessages = messages.slice(1);
        } else {
          systemPrompt = this.createSystemPrompt(context);
        }

        // Convert messages to Gemini format
        const conversationHistory = this.formatMessagesForGemini(conversationMessages, systemPrompt);

        // Generate response
        const result = await model.generateContent(conversationHistory);
        const response = await result.response;
        
        // Check if response was blocked
        if (response.promptFeedback?.blockReason) {
          console.error(`[Gemini] Response blocked: ${response.promptFeedback.blockReason}`);
          throw new Error(`Response blocked by safety filters: ${response.promptFeedback.blockReason}`);
        }
        
        // Check if we have candidates
        if (!response.candidates || response.candidates.length === 0) {
          console.error('[Gemini] No candidates in response');
          throw new Error('No response candidates from Gemini');
        }
        
        // Try to get text
        let text: string;
        try {
          text = response.text();
        } catch (textError: any) {
          console.error('[Gemini] Error calling response.text():', textError.message);
          throw new Error(`Failed to extract text from Gemini response: ${textError.message}`);
        }

        if (!text || text.trim().length === 0) {
          console.error('[Gemini] Empty text in response');
          throw new Error('Empty response from Gemini');
        }

        const processingTime = Date.now() - startTime;

        return {
          content: text.trim(),
          provider: 'Gemini',
          model: selectedModel,
          usage: {
            prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
            completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: response.usageMetadata?.totalTokenCount || 0,
          },
          processingTime,
          success: true
        };
      });
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[Gemini] Error generating response:', error.message);
      
      throw this.handleError(error, 'Gemini');
    }
  }

  private formatMessagesForGemini(messages: AIMessage[], systemPrompt: string): string {
    // Gemini expects a single prompt that includes both system instructions and conversation
    let prompt = systemPrompt + '\n\n';
    
    // Add conversation history
    for (const message of messages) {
      if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    }
    
    // Add the final prompt for the assistant to respond
    prompt += 'Assistant:';
    
    return prompt;
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = this.clients[0];
      const model = client.getGenerativeModel({ 
        model: this.config.model || 'gemini-2.0-flash-lite' 
      });
      
      console.log('[Gemini] Testing connection...');
      
      const result = await model.generateContent('Hello, please respond with "OK"');
      const response = await result.response;
      const text = response.text();
      
      if (text && text.trim().length > 0) {
        console.log('[Gemini] Connection test successful');
        return true;
      } else {
        throw new Error('Empty response from test');
      }
    } catch (error: any) {
      console.error('[Gemini] Connection test failed:', error.message);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      return await this.testConnection();
    } catch (error) {
      console.error('[Gemini] Availability check failed:', error);
      return false;
    }
  }
}
