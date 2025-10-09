import {
  type User,
  type InsertUser,
  type Asset,
  type InsertAsset,
  type Position,
  type InsertPosition,
  type Trade,
  type InsertTrade,
  type AiInsight,
  type InsertAiInsight,
  type NewsItem,
  type InsertNewsItem,
  type MarketData,
  type InsertMarketData,
} from '@shared/schema';
import { randomUUID } from 'crypto';

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Assets
  getAssets(): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  getAssetBySymbol(symbol: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAssetPrice(
    id: string,
    price: string,
    priceChange24h: string
  ): Promise<Asset | undefined>;

  // Positions
  getUserPositions(userId: string): Promise<Position[]>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(
    id: string,
    updates: Partial<Position>
  ): Promise<Position | undefined>;

  // Trades
  getUserTrades(userId: string, limit?: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;

  // AI Insights
  getActiveInsights(assetId?: string): Promise<AiInsight[]>;
  createInsight(insight: InsertAiInsight): Promise<AiInsight>;

  // News
  getRecentNews(limit?: number): Promise<NewsItem[]>;
  createNewsItem(newsItem: InsertNewsItem): Promise<NewsItem>;

  // Market Data
  getMarketData(assetId: string, limit?: number): Promise<MarketData[]>;
  addMarketData(data: InsertMarketData): Promise<MarketData>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private assets: Map<string, Asset> = new Map();
  private positions: Map<string, Position> = new Map();
  private trades: Map<string, Trade> = new Map();
  private aiInsights: Map<string, AiInsight> = new Map();
  private newsItems: Map<string, NewsItem> = new Map();
  private marketData: Map<string, MarketData> = new Map();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize sample assets
    const btc: Asset = {
      id: randomUUID(),
      symbol: 'BTC',
      name: 'Bitcoin',
      currentPrice: '43247.89',
      priceChange24h: '2.34',
      volume24h: '28500000000',
      marketCap: '847000000000',
      updatedAt: new Date(),
    };

    const eth: Asset = {
      id: randomUUID(),
      symbol: 'ETH',
      name: 'Ethereum',
      currentPrice: '2847.21',
      priceChange24h: '1.89',
      volume24h: '15600000000',
      marketCap: '342000000000',
      updatedAt: new Date(),
    };

    const sol: Asset = {
      id: randomUUID(),
      symbol: 'SOL',
      name: 'Solana',
      currentPrice: '98.45',
      priceChange24h: '12.4',
      volume24h: '2800000000',
      marketCap: '43000000000',
      updatedAt: new Date(),
    };

    this.assets.set(btc.id, btc);
    this.assets.set(eth.id, eth);
    this.assets.set(sol.id, sol);

    // Initialize sample user
    const user: User = {
      id: 'user-1',
      username: 'alexchen',
      password: 'hashed_password',
      email: 'alex@trading.com',
      portfolioValue: '127543.21',
      createdAt: new Date(),
    };
    this.users.set(user.id, user);

    // Initialize sample insights
    const insight1: AiInsight = {
      id: randomUUID(),
      assetId: btc.id,
      type: 'sentiment',
      title: 'Market Sentiment',
      description:
        'Strong accumulation detected. Whale activity increased 34% in last 4 hours.',
      confidence: '89.00',
      metadata: JSON.stringify({ status: 'Bullish' }),
      isActive: true,
      createdAt: new Date(),
    };

    this.aiInsights.set(insight1.id, insight1);

    // Initialize sample news
    const news1: NewsItem = {
      id: randomUUID(),
      title: 'Bitcoin ETF Approval Expected Soon',
      summary:
        'Market analysts predict potential approval could drive BTC to new highs...',
      source: 'CoinDesk',
      url: 'https://coindesk.com/bitcoin-etf-approval',
      impact: 'high',
      sentiment: 'positive',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      createdAt: new Date(),
    };

    this.newsItems.set(news1.id, news1);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      portfolioValue: insertUser.portfolioValue ?? '0',
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values());
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async getAssetBySymbol(symbol: string): Promise<Asset | undefined> {
    return Array.from(this.assets.values()).find(
      asset => asset.symbol === symbol
    );
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const id = randomUUID();
    const asset: Asset = {
      ...insertAsset,
      priceChange24h: insertAsset.priceChange24h ?? '0',
      volume24h: insertAsset.volume24h ?? '0',
      marketCap: insertAsset.marketCap ?? '0',
      id,
      updatedAt: new Date(),
    };
    this.assets.set(id, asset);
    return asset;
  }

  async updateAssetPrice(
    id: string,
    price: string,
    priceChange24h: string
  ): Promise<Asset | undefined> {
    const asset = this.assets.get(id);
    if (!asset) return undefined;

    const updatedAsset = {
      ...asset,
      currentPrice: price,
      priceChange24h,
      updatedAt: new Date(),
    };
    this.assets.set(id, updatedAsset);
    return updatedAsset;
  }

  async getUserPositions(userId: string): Promise<Position[]> {
    return Array.from(this.positions.values()).filter(
      position => position.userId === userId
    );
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const id = randomUUID();
    const position: Position = {
      ...insertPosition,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.positions.set(id, position);
    return position;
  }

  async updatePosition(
    id: string,
    updates: Partial<Position>
  ): Promise<Position | undefined> {
    const position = this.positions.get(id);
    if (!position) return undefined;

    const updatedPosition = {
      ...position,
      ...updates,
      updatedAt: new Date(),
    };
    this.positions.set(id, updatedPosition);
    return updatedPosition;
  }

  async getUserTrades(userId: string, limit = 10): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(trade => trade.userId === userId)
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
      .slice(0, limit);
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = randomUUID();
    const trade: Trade = {
      ...insertTrade,
      status: insertTrade.status ?? 'completed',
      id,
      timestamp: new Date(),
    };
    this.trades.set(id, trade);
    return trade;
  }

  async getActiveInsights(assetId?: string): Promise<AiInsight[]> {
    return Array.from(this.aiInsights.values())
      .filter(
        insight => insight.isActive && (!assetId || insight.assetId === assetId)
      )
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createInsight(insertInsight: InsertAiInsight): Promise<AiInsight> {
    const id = randomUUID();
    const insight: AiInsight = {
      ...insertInsight,
      assetId: insertInsight.assetId ?? null,
      metadata: insertInsight.metadata ?? null,
      isActive: insertInsight.isActive ?? true,
      id,
      createdAt: new Date(),
    };
    this.aiInsights.set(id, insight);
    return insight;
  }

  async getRecentNews(limit = 10): Promise<NewsItem[]> {
    return Array.from(this.newsItems.values())
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, limit);
  }

  async createNewsItem(insertNewsItem: InsertNewsItem): Promise<NewsItem> {
    const id = randomUUID();
    const newsItem: NewsItem = {
      ...insertNewsItem,
      url: insertNewsItem.url ?? null,
      impact: insertNewsItem.impact ?? null,
      sentiment: insertNewsItem.sentiment ?? null,
      id,
      createdAt: new Date(),
    };
    this.newsItems.set(id, newsItem);
    return newsItem;
  }

  async getMarketData(assetId: string, limit = 100): Promise<MarketData[]> {
    return Array.from(this.marketData.values())
      .filter(data => data.assetId === assetId)
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
      .slice(0, limit);
  }

  async addMarketData(insertData: InsertMarketData): Promise<MarketData> {
    const id = randomUUID();
    const data: MarketData = {
      ...insertData,
      id,
      timestamp: new Date(),
    };
    this.marketData.set(id, data);
    return data;
  }
}

import { DatabaseStorage } from './storage-db';

export const storage = new DatabaseStorage();
