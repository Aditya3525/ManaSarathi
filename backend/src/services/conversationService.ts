import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

// Initialize Gemini AI for title generation
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  createdAt: Date;
  isArchived: boolean;
}

export interface ConversationWithMessages {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  isArchived: boolean;
  messages: Array<{
    id: string;
    content: string;
    type: string;
    metadata: any;
    createdAt: Date;
  }>;
}

export class ConversationService {
  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string, 
    includeArchived = false
  ): Promise<ConversationSummary[]> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          userId,
          isArchived: includeArchived ? undefined : false,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Get last message for preview
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      return conversations.map(conv => ({
        id: conv.id,
        title: conv.title || this.generateDefaultTitle(conv.createdAt),
        lastMessage: conv.messages[0]?.content.substring(0, 100) || 'No messages yet',
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv._count.messages,
        createdAt: conv.createdAt,
        isArchived: conv.isArchived,
      }));
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      throw error;
    }
  }

  /**
   * Create new conversation
   */
  async createConversation(userId: string, title?: string): Promise<any> {
    try {
      return await prisma.conversation.create({
        data: {
          userId,
          title: title || null,
        },
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation with messages
   */
  async getConversation(
    conversationId: string, 
    userId: string
  ): Promise<ConversationWithMessages> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { 
          id: conversationId, 
          userId 
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      return {
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastMessageAt: conversation.lastMessageAt,
        isArchived: conversation.isArchived,
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
          createdAt: msg.createdAt,
        })),
      };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  /**
   * Auto-generate conversation title from messages
   */
  async generateConversationTitle(conversationId: string): Promise<string> {
    try {
      const messages = await prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 3, // First 3 messages
      });

      if (messages.length === 0) {
        return 'New Conversation';
      }

      // Use first user message as base
      const firstUserMessage = messages.find(m => m.type === 'user');
      if (!firstUserMessage) {
        return 'New Conversation';
      }

      // Generate title using AI (or fallback to simple truncation)
      const title = await this.generateTitleWithAI(firstUserMessage.content);

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      });

      return title;
    } catch (error) {
      console.error('Error generating conversation title:', error);
      return 'Conversation';
    }
  }

  /**
   * Generate title using AI or simple truncation
   */
  private async generateTitleWithAI(content: string): Promise<string> {
    // Simple version: Use first 50 chars as fallback
    let title = content.substring(0, 50).trim();
    if (title.length < content.length) {
      title += '...';
    }

    // Try to generate with AI if available
    if (genAI) {
      try {
        const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash-lite';
        const model = genAI.getGenerativeModel({ model: geminiModel });
        const prompt = `Generate a short 3-5 word title for this conversation. Return ONLY the title, no quotes, no extra text:\n\n"${content}"`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedTitle = response.text().trim().replace(/^["']|["']$/g, '');
        
        if (generatedTitle && generatedTitle.length > 0 && generatedTitle.length < 100) {
          title = generatedTitle;
        }
      } catch (error) {
        console.error('Failed to generate AI title:', error);
        // Fallback already set above
      }
    }

    return title;
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    updates: { title?: string; isArchived?: boolean }
  ): Promise<any> {
    try {
      // Verify user owns conversation
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      return await prisma.conversation.update({
        where: { id: conversationId },
        data: updates,
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  /**
   * Delete conversation (and all its messages)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      // Verify user owns conversation
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      await prisma.conversation.delete({
        where: { id: conversationId },
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Update last message timestamp
   */
  async updateLastMessageTime(conversationId: string): Promise<void> {
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { 
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating last message time:', error);
      throw error;
    }
  }

  /**
   * Search conversations by title or content
   */
  async searchConversations(
    userId: string, 
    query: string
  ): Promise<ConversationSummary[]> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          userId,
          isArchived: false,
          OR: [
            {
              title: {
                contains: query,
              },
            },
            {
              messages: {
                some: {
                  content: {
                    contains: query,
                  },
                },
              },
            },
          ],
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      return conversations.map(conv => ({
        id: conv.id,
        title: conv.title || this.generateDefaultTitle(conv.createdAt),
        lastMessage: conv.messages[0]?.content.substring(0, 100) || '',
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv._count.messages,
        createdAt: conv.createdAt,
        isArchived: conv.isArchived,
      }));
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  }

  /**
   * Archive/unarchive conversation
   */
  async archiveConversation(
    conversationId: string,
    userId: string,
    isArchived: boolean
  ): Promise<void> {
    try {
      await this.updateConversation(conversationId, userId, { isArchived });
    } catch (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation count for user
   */
  async getConversationCount(userId: string, includeArchived = false): Promise<number> {
    try {
      return await prisma.conversation.count({
        where: {
          userId,
          isArchived: includeArchived ? undefined : false,
        },
      });
    } catch (error) {
      console.error('Error getting conversation count:', error);
      throw error;
    }
  }

  /**
   * Get conversation with all messages (for export)
   */
  async getConversationWithMessages(conversationId: string, userId: string) {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      return conversation;
    } catch (error) {
      console.error('Error getting conversation with messages:', error);
      throw error;
    }
  }

  /**
   * Generate default title from creation date
   */
  private generateDefaultTitle(createdAt: Date): string {
    const date = new Date(createdAt);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return `Chat on ${date.toLocaleDateString('en-US', options)}`;
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
