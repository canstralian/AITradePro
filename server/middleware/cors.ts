import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const ALLOWED_ORIGINS = [
  'http://localhost:5000',
  'http://localhost:3000',
  'https://localhost:5000',
  'https://localhost:3000',
  // Add production domains when available
];

export const corsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const origin = req.headers.origin;

  // Allow requests with no origin (e.g., mobile apps, Postman)
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    logger.warn('CORS blocked request from unauthorized origin', {
      origin,
      path: req.path,
    });
    return res.status(403).json({ message: 'CORS policy violation' });
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};
