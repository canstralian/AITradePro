// Global type declarations for Node.js environment
declare const process: {
  env: Record<string, string | undefined>;
};

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  validateSchema,
  sanitizeInput,
  schemas,
} from '../middleware/validation';
import { helmetMiddleware } from '../middleware/helmet';
import jwt from 'jsonwebtoken';
import { authenticateToken, generateToken } from '../middleware/auth';

describe('Auth Middleware', () => {
  const mockNext = vi.fn() as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should reject requests without authorization header', () => {
      const req = { headers: {} } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authorization header required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid authorization format', () => {
      const req = {
        headers: { authorization: 'InvalidFormat token' },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid authorization format. Use Bearer <token>',
      });
    });

    it('should accept valid JWT token', () => {
      const user = { id: 'user1', username: 'testuser' };
      const token = generateToken(user);

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as Request;
      const res = {} as Response;

      authenticateToken(req, res, mockNext);

      expect(req.user).toEqual(user);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const user = { id: 'user1', username: 'testuser' };
      const token = generateToken(user);

      expect(token).toBeTruthy();

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; username: string };
      expect(decoded.userId).toBe(user.id);
      expect(decoded.username).toBe(user.username);
    });
  });
});

describe('Validation Middleware', () => {
  const mockNext = vi.fn() as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeInput', () => {
    it('should sanitize malicious input', () => {
      const req = {
        body: {
          name: '<script>alert("xss")</script>Test',
          data: ['<img src=x onerror=alert(1)>', 'clean data'],
        },
        query: {},
      } as Request;
      const res = {} as Response;

      sanitizeInput(req, res, mockNext);

      expect(req.body.name).toBe('scriptscript&gt;Test');
      expect(req.body.data[0]).toBe('img src=x onerror=alert(1)');
      expect(req.body.data[1]).toBe('clean data');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateSchema', () => {
    it('should validate asset params', () => {
      const req = {
        params: { id: 'BTC' },
        body: {},
        query: {},
      } as unknown as Request;
      const res = {} as Response;

      const middleware = validateSchema(schemas.assetParams);
      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid asset params', () => {
      const req = {
        params: { id: 'invalid_symbol_123!' },
        body: {},
        query: {},
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const middleware = validateSchema(schemas.assetParams);
      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('Helmet Middleware', () => {
  it('should set security headers', () => {
    const req = {} as Request;
    const res = {
      setHeader: vi.fn(),
      removeHeader: vi.fn(),
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;

    helmetMiddleware(req, res, mockNext);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff'
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-XSS-Protection',
      '1; mode=block'
    );
    expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    expect(mockNext).toHaveBeenCalled();
  });
});
