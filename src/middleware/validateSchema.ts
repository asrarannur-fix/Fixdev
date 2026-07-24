import { ZodSchema, ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export function validateSchema(schema: ZodSchema, location: 'body' | 'query' | 'params' = 'body') {
  return (req: any, res: any, next: any) => {
    const source = location === 'body' ? req.body : location === 'query' ? req.query : req.params;
    const result = schema.safeParse(source);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      logger.warn({ issues, path: req.url, method: req.method }, 'API validation failed');
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Input validasi gagal.',
        issues: result.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
          code: i.code,
        })),
      });
    }
    next();
  };
}
