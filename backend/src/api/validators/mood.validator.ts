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
      .string()
      .min(1, 'Mood cannot be empty')
      .max(50, 'Mood must not exceed 50 characters')
      .trim()
      .optional(),

    emotion: z
      .string()
      .min(1, 'Emotion cannot be empty')
      .max(50, 'Emotion must not exceed 50 characters')
      .trim()
      .optional(),

    emotionGroup: z
      .string()
      .min(1, 'Emotion group cannot be empty')
      .max(50, 'Emotion group must not exceed 50 characters')
      .trim()
      .optional(),

    intensity: z
      .number()
      .int('Intensity must be an integer')
      .min(1, 'Intensity must be at least 1')
      .max(10, 'Intensity must not exceed 10')
      .optional(),

    trigger: z
      .string()
      .max(250, 'Trigger must not exceed 250 characters')
      .trim()
      .optional(),

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
  }).refine((data) => Boolean(data.mood || data.emotion), {
    message: 'Mood or emotion is required',
    path: ['mood'],
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
