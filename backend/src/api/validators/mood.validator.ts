/**
 * Mood Tracking Validation Schemas
 */

import { z } from 'zod';

/**
 * Log Mood Schema
 */
export const logMoodSchema = z.object({
  body: z.object({
    mood: z
      .string({
        required_error: 'Mood is required',
      })
      .min(1, 'Mood cannot be empty')
      .max(50, 'Mood must not exceed 50 characters'),

    notes: z
      .string()
      .max(500, 'Notes must not exceed 500 characters')
      .trim()
      .optional(),

    score: z
      .number()
      .min(1, 'Score must be at least 1')
      .max(10, 'Score must not exceed 10')
      .optional(),

    triggers: z
      .array(z.string().max(100))
      .max(10, 'Cannot have more than 10 triggers')
      .optional(),

    timestamp: z
      .string()
      .datetime('Invalid date format')
      .optional(),
  }),
});

/**
 * Get Mood History Schema
 */
export const getMoodHistorySchema = z.object({
  query: z.object({
    days: z
      .string()
      .regex(/^\d+$/, 'Days must be a positive number')
      .transform(Number)
      .refine((n) => n > 0 && n <= 365, {
        message: 'Days must be between 1 and 365',
      })
      .default('30'),

    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive number')
      .transform(Number)
      .refine((n) => n > 0 && n <= 100, {
        message: 'Limit must be between 1 and 100',
      })
      .optional(),
  }),
});

/**
 * Delete Mood Entry Schema
 */
export const deleteMoodEntrySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Entry ID is required'),
  }),
});

/**
 * Export type inference helpers
 */
export type LogMoodInput = z.infer<typeof logMoodSchema>['body'];
export type GetMoodHistoryQuery = z.infer<typeof getMoodHistorySchema>['query'];
export type DeleteMoodEntryParams = z.infer<typeof deleteMoodEntrySchema>['params'];
