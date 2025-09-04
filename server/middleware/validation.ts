import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';

export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      if (!validation.success) {
        const errors = validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        logger.warn('Validation failed', { errors, path: req.path });
        return res.status(400).json({
          message: 'Validation failed',
          errors
        });
      }

      req.body = validation.data.body;
      req.query = validation.data.query;
      req.params = validation.data.params;
      
      next();
    } catch (error) {
      logger.error('Validation middleware error', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ message: 'Internal validation error' });
    }
  };
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str.trim().replace(/[<>]/g, '');
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

export const schemas = {
  assetParams: z.object({
    params: z.object({
      id: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/)
    })
  }),
  
  userParams: z.object({
    params: z.object({
      userId: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-_]+$/)
    })
  }),
  
  marketDataQuery: z.object({
    query: z.object({
      limit: z.string().optional().transform(val => val ? Math.min(parseInt(val) || 100, 1000) : 100)
    })
  }),
  
  workerTask: z.object({
    body: z.object({
      type: z.enum(['market_analysis', 'news_correlation', 'pattern_matching', 'sentiment_analysis']),
      payload: z.record(z.any()),
      priority: z.enum(['low', 'medium', 'high']).optional().default('medium')
    })
  })
};