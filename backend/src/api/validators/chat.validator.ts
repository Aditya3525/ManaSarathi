/**
 * Chat Validation Schemas
 */

import { z } from 'zod';

/**
 * Send Message Schema
 */
export const sendMessageSchema = z.object({
  body: z.object({
    content: z
      .string({
        required_error: 'Message content is required',
      })
      .min(1, 'Message cannot be empty')
      .max(2000, 'Message must not exceed 2000 characters')
      .trim(),

    conversationId: z.string().min(1).optional(),

    simpleLanguage: z.boolean().optional(),
    
    context: z
      .object({
        conversationId: z.string().min(1).optional(),
        simpleLanguage: z.boolean().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
      .optional(),
  }),
});

/**
 * Get Chat History Schema
 */
export const getChatHistorySchema = z.object({
  query: z.object({
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive number')
      .transform(Number)
      .refine((n) => n > 0 && n <= 100, {
        message: 'Limit must be between 1 and 100',
      })
      .default('50'),
    
    before: z
      .string()
      .datetime('Invalid date format')
      .optional(),
  }),
});

/**
 * Delete Chat Message Schema
 */
export const deleteChatMessageSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID'),
  }),
});

/**
 * Export type inference helpers
 */
export type SendMessageInput = z.infer<typeof sendMessageSchema>['body'];
export type GetChatHistoryQuery = z.infer<typeof getChatHistorySchema>['query'];
export type DeleteChatMessageParams = z.infer<typeof deleteChatMessageSchema>['params'];
