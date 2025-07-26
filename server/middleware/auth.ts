import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';

// Simple authentication check (in production, use proper JWT)
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  // Simple token validation (replace with proper JWT in production)
  if (authHeader !== 'Bearer aei-trading-token') {
    return res.status(403).json({ error: 'Invalid token' });
  }
  
  (req as any).user = { id: 'user-1', username: 'alexchen' };
  next();
};

// Rate limiting for API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many API requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced rate limiting for trading endpoints
export const tradingRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit trading requests to 10 per minute
  message: {
    error: 'Trading rate limit exceeded. Please wait before placing more orders.'
  }
});

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  next();
};

// Input validation middleware
export const validateSymbol = (req: Request, res: Response, next: NextFunction) => {
  const { symbol } = req.params;
  
  if (!symbol || symbol.length < 2 || symbol.length > 20) {
    return res.status(400).json({ error: 'Invalid symbol format' });
  }
  
  // Sanitize symbol (alphanumeric only)
  if (!/^[A-Z0-9]+$/i.test(symbol)) {
    return res.status(400).json({ error: 'Symbol must contain only alphanumeric characters' });
  }
  
  next();
};