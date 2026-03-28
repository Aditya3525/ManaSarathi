/**
 * Validation Middleware
 * 
 * Validates request data against Zod schemas and returns
 * consistent validation error responses.
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Validate request against Zod schema
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request data
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Return a deterministic validation payload directly from middleware.
        const errors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.slice(1).join('.'); // Remove 'body', 'query', or 'params' prefix
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });
        
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          errors,
        });
        return;
      } else {
        next(error);
      }
    }
  };
};

/**
 * Sanitize input data (remove extra fields)
 */
export const sanitize = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Replace request data with sanitized data
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.slice(1).join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });
        
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          errors,
        });
        return;
      } else {
        next(error);
      }
    }
  };
};
