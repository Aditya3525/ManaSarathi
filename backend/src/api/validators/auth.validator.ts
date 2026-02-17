/**
 * Authentication and User Validation Schemas
 */

import { z } from 'zod';

/**
 * User Registration Schema
 */
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Name is required',
      })
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must not exceed 50 characters')
      .trim(),
    
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must not exceed 100 characters'),
    
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must not exceed 50 characters')
      .trim()
      .optional(),
    
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must not exceed 50 characters')
      .trim()
      .optional(),
  }),
});

/**
 * User Login Schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(1, 'Password is required'),
  }),
});

/**
 * Password Setup Schema
 */
export const passwordSetupSchema = z.object({
  body: z.object({
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must not exceed 100 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    
    securityQuestion: z
      .string()
      .min(5, 'Security question must be at least 5 characters')
      .max(200, 'Security question must not exceed 200 characters')
      .optional(),
    
    securityAnswer: z
      .string()
      .min(2, 'Security answer must be at least 2 characters')
      .max(200, 'Security answer must not exceed 200 characters')
      .optional(),
  }),
});

/**
 * Profile Update Schema
 */
export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must not exceed 50 characters')
      .trim()
      .optional(),
    
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must not exceed 50 characters')
      .trim()
      .optional(),
    
    birthday: z
      .string()
      .datetime('Invalid date format')
      .optional(),
    
    gender: z
      .enum(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'])
      .optional(),
    
    region: z
      .string()
      .max(100, 'Region must not exceed 100 characters')
      .optional(),
    
    language: z
      .string()
      .max(50, 'Language must not exceed 50 characters')
      .optional(),
    
    emergencyContact: z
      .string()
      .max(100, 'Emergency contact name must not exceed 100 characters')
      .optional(),
    
    emergencyPhone: z
      .string()
      .min(7, 'Phone number is too short')
      .max(20, 'Phone number is too long')
      .optional(),
    
    approach: z
      .enum(['western', 'eastern', 'hybrid'])
      .optional(),
    
    isOnboarded: z.boolean().optional(),

    dataConsent: z.boolean().optional(),
    
    clinicianSharing: z.boolean().optional(),
  }).passthrough(), // Allow additional fields to pass through to the controller
});

/**
 * Onboarding Completion Schema
 */
export const completeOnboardingSchema = z.object({
  body: z.object({
    approach: z.enum(['western', 'eastern', 'hybrid'], {
      required_error: 'Wellness approach is required',
    }),
    
    selectedTypes: z
      .array(z.string())
      .min(1, 'At least one assessment type must be selected')
      .optional(),
    
    preferences: z
      .object({
        language: z.string().optional(),
        theme: z.enum(['light', 'dark', 'auto']).optional(),
        notifications: z.boolean().optional(),
      })
      .optional(),
  }),
});

/**
 * Export type inference helpers
 */
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type PasswordSetupInput = z.infer<typeof passwordSetupSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>['body'];
