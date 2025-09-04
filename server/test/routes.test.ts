import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';

let app: express.Application;
let server: any;

beforeAll(async () => {
  app = express();
  server = await registerRoutes(app);
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});

describe('API Routes', () => {
  describe('GET /api/assets', () => {
    it('should return assets', async () => {
      const response = await request(app)
        .get('/api/assets')
        .expect(200);
      
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/assets/:id', () => {
    it('should return 404 for invalid asset', async () => {
      await request(app)
        .get('/api/assets/INVALID')
        .expect(400); // Due to symbol validation
    });

    it('should accept valid crypto symbols', async () => {
      const response = await request(app)
        .get('/api/assets/BTC')
        .expect(200);
    });
  });

  describe('GET /api/dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);
      
      expect(response.body).toHaveProperty('assets');
      expect(response.body).toHaveProperty('positions');
      expect(response.body).toHaveProperty('trades');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('news');
    });
  });

  describe('GET /api/workers/status', () => {
    it('should return worker queue status', async () => {
      const response = await request(app)
        .get('/api/workers/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('queueLength');
      expect(response.body).toHaveProperty('activeWorkers');
      expect(response.body).toHaveProperty('totalWorkers');
    });
  });

  describe('POST /api/workers/enqueue', () => {
    it('should enqueue a valid task', async () => {
      const taskData = {
        type: 'market_analysis',
        payload: { symbol: 'BTC' },
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/workers/enqueue')
        .send(taskData)
        .expect(200);
      
      expect(response.body).toHaveProperty('taskId');
      expect(response.body.status).toBe('queued');
    });

    it('should reject invalid task type', async () => {
      const taskData = {
        type: 'invalid_type',
        payload: { symbol: 'BTC' }
      };

      await request(app)
        .post('/api/workers/enqueue')
        .send(taskData)
        .expect(400);
    });
  });
});