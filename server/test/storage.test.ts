import { describe, it, expect, beforeEach } from 'vitest';
import { MemStorage } from '../storage';
import { InsertAsset, InsertUser } from '../../shared/schema';

describe('MemStorage', () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe('Assets', () => {
    it('should return initial assets', async () => {
      const assets = await storage.getAssets();
      expect(assets).toHaveLength(3);
      expect(assets.map(a => a.symbol)).toEqual(['BTC', 'ETH', 'SOL']);
    });

    it('should create new asset', async () => {
      const newAsset: InsertAsset = {
        symbol: 'ADA',
        name: 'Cardano',
        currentPrice: '0.45',
        priceChange24h: '5.2',
        volume24h: '500000000',
        marketCap: '15000000000',
      };

      const created = await storage.createAsset(newAsset);
      expect(created.symbol).toBe('ADA');
      expect(created.name).toBe('Cardano');
      expect(created.id).toBeDefined();

      const assets = await storage.getAssets();
      expect(assets).toHaveLength(4);
    });

    it('should get asset by symbol', async () => {
      const btc = await storage.getAssetBySymbol('BTC');
      expect(btc).toBeDefined();
      expect(btc?.symbol).toBe('BTC');
      expect(btc?.name).toBe('Bitcoin');
    });

    it('should update asset price', async () => {
      const assets = await storage.getAssets();
      const btc = assets.find(a => a.symbol === 'BTC')!;

      const updated = await storage.updateAssetPrice(btc.id, '45000.00', '3.5');
      expect(updated?.currentPrice).toBe('45000.00');
      expect(updated?.priceChange24h).toBe('3.5');
    });
  });

  describe('Users', () => {
    it('should create new user', async () => {
      const newUser: InsertUser = {
        username: 'testuser',
        password: 'hashedpass',
        email: 'test@example.com',
        portfolioValue: '10000.00',
      };

      const created = await storage.createUser(newUser);
      expect(created.username).toBe('testuser');
      expect(created.email).toBe('test@example.com');
      expect(created.id).toBeDefined();
    });

    it('should get user by username', async () => {
      const user = await storage.getUserByUsername('alexchen');
      expect(user).toBeDefined();
      expect(user?.username).toBe('alexchen');
    });
  });

  describe('AI Insights', () => {
    it('should return active insights', async () => {
      const insights = await storage.getActiveInsights();
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].isActive).toBe(true);
    });

    it('should filter insights by asset', async () => {
      const assets = await storage.getAssets();
      const btc = assets.find(a => a.symbol === 'BTC')!;

      const insights = await storage.getActiveInsights(btc.id);
      insights.forEach(insight => {
        expect(insight.assetId).toBe(btc.id);
      });
    });
  });
});
