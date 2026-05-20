import { Request, Response } from 'express';
import { conversationService } from '../services/conversationService';
import { exportService } from '../services/exportService';

export const conversationController = {
  /**
   * Get all conversations for the authenticated user
   * GET /api/conversations
   */
  async getConversations(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const includeArchived = req.query.includeArchived === 'true';
      const conversations = await conversationService.getUserConversations(
        userId,
        includeArchived
      );

      return res.json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      console.error('Error in getConversations:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch conversations',
      });
    }
  },

  /**
   * Create a new conversation
   * POST /api/conversations
   */
  async createConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { title } = req.body;
      const conversation = await conversationService.createConversation(
        userId,
        title
      );

      return res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      console.error('Error in createConversation:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create conversation',
      });
    }
  },

  /**
   * Get a specific conversation with all messages
   * GET /api/conversations/:id
   */
  async getConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      const conversation = await conversationService.getConversation(id, userId);

      return res.json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      console.error('Error in getConversation:', error);
      const statusCode = error.message === 'Conversation not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to fetch conversation',
      });
    }
  },

  /**
   * Update a conversation (rename or archive)
   * PATCH /api/conversations/:id
   */
  async updateConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      const { title, isArchived } = req.body;

      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (isArchived !== undefined) updates.isArchived = isArchived;

      const conversation = await conversationService.updateConversation(
        id,
        userId,
        updates
      );

      return res.json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      console.error('Error in updateConversation:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to update conversation',
      });
    }
  },

  /**
   * Delete a conversation
   * DELETE /api/conversations/:id
   */
  async deleteConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      await conversationService.deleteConversation(id, userId);

      return res.json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error: any) {
      console.error('Error in deleteConversation:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to delete conversation',
      });
    }
  },

  /**
   * Generate or regenerate conversation title
   * POST /api/conversations/:id/title
   */
  async generateTitle(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      
      // Verify user owns conversation
      await conversationService.getConversation(id, userId);
      
      const title = await conversationService.generateConversationTitle(id);

      return res.json({
        success: true,
        data: { title },
      });
    } catch (error: any) {
      console.error('Error in generateTitle:', error);
      const statusCode = error.message === 'Conversation not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to generate title',
      });
    }
  },

  /**
   * Search conversations
   * GET /api/conversations/search?q=query
   */
  async searchConversations(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
      }

      const conversations = await conversationService.searchConversations(
        userId,
        query
      );

      return res.json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      console.error('Error in searchConversations:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to search conversations',
      });
    }
  },

  /**
   * Archive or unarchive a conversation
   * POST /api/conversations/:id/archive
   */
  async archiveConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      const { isArchived } = req.body;

      await conversationService.archiveConversation(
        id,
        userId,
        isArchived !== undefined ? isArchived : true
      );

      return res.json({
        success: true,
        message: isArchived ? 'Conversation archived' : 'Conversation unarchived',
      });
    } catch (error: any) {
      console.error('Error in archiveConversation:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to archive conversation',
      });
    }
  },

  /**
   * Get conversation count
   * GET /api/conversations/count
   */
  async getConversationCount(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const includeArchived = req.query.includeArchived === 'true';
      const count = await conversationService.getConversationCount(
        userId,
        includeArchived
      );

      return res.json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      console.error('Error in getConversationCount:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get conversation count',
      });
    }
  },

  /**
   * Export a single conversation
   * GET /api/conversations/:id/export?format=pdf|text|json
   */
  async exportConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      const format = (req.query.format as string) || 'text';
      const includeSystemMessages = req.query.includeSystemMessages !== 'false';

      // Validate format
      if (!['pdf', 'text', 'json'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Must be pdf, text, or json',
        });
      }

      // Get conversation with messages
      const conversation = await conversationService.getConversationWithMessages(id, userId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      const options = {
        includeSystemMessages,
        includeMetadata: true,
      };

      // Generate export based on format
      if (format === 'pdf') {
        const pdfBuffer = await exportService.generatePDFExport(conversation, options);
        const filename = `conversation_${conversation.title?.replace(/[^a-z0-9]/gi, '_') || 'untitled'}_${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        return res.send(pdfBuffer);
      } else if (format === 'text') {
        const textContent = exportService.generateTextExport(conversation, options);
        const filename = `conversation_${conversation.title?.replace(/[^a-z0-9]/gi, '_') || 'untitled'}_${Date.now()}.txt`;
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(textContent);
      } else {
        // JSON
        const jsonContent = exportService.generateJSONExport(conversation, options);
        const filename = `conversation_${conversation.title?.replace(/[^a-z0-9]/gi, '_') || 'untitled'}_${Date.now()}.json`;
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(jsonContent);
      }
    } catch (error: any) {
      console.error('Error in exportConversation:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to export conversation',
      });
    }
  },

  /**
   * Export multiple conversations
   * POST /api/conversations/export/bulk
   * Body: { conversationIds: string[], format: 'text' | 'json' }
   */
  async exportBulkConversations(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { conversationIds, format = 'text' } = req.body;

      // Validation
      if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'conversationIds must be a non-empty array',
        });
      }

      if (conversationIds.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Cannot export more than 50 conversations at once',
        });
      }

      if (!['text', 'json'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: 'Bulk export only supports text or json format',
        });
      }

      // Fetch all conversations
      const conversations = await Promise.all(
        conversationIds.map(async (id) => {
          try {
            return await conversationService.getConversationWithMessages(id, userId);
          } catch (error) {
            return null;
          }
        })
      );

      // Filter out null values (conversations not found or not accessible)
      const validConversations = conversations.filter((c: any) => c !== null) as any[];

      if (validConversations.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No valid conversations found',
        });
      }

      // Generate bulk export
      const exportContent = await exportService.generateBulkExport(validConversations, format);
      const filename = `conversations_bulk_${Date.now()}.${format === 'json' ? 'json' : 'txt'}`;

      res.setHeader(
        'Content-Type',
        format === 'json' ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(exportContent);
    } catch (error: any) {
      console.error('Error in exportBulkConversations:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to export conversations',
      });
    }
  },
};
