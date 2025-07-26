import { db } from './db';
import { 
  users, assets, positions, trades, aiInsights, newsItems, marketData, workerTasks,
  type User, type Asset, type Position, type Trade, type AiInsight, type NewsItem,
  type MarketData, type WorkerTask, type InsertUser, type InsertAsset,
  type InsertPosition, type InsertTrade, type InsertAiInsight, type InsertNewsItem,
  type InsertMarketData, type InsertWorkerTask
} from '../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  constructor() {
    this.seedInitialData();
  }

  private async seedInitialData() {
    try {
      // Check if data already exists
      const existingAssets = await db.select().from(assets).limit(1);
      if (existingAssets.length > 0) return;

      // Seed assets
      const assetData: InsertAsset[] = [
        {
          symbol: "BTC",
          name: "Bitcoin",
          currentPrice: "43247.89",
          priceChange24h: "2.34",
          volume24h: "28500000000",
          marketCap: "847000000000",
        },
        {
          symbol: "ETH",
          name: "Ethereum", 
          currentPrice: "2847.21",
          priceChange24h: "1.89",
          volume24h: "15600000000",
          marketCap: "342000000000",
        },
        {
          symbol: "SOL",
          name: "Solana",
          currentPrice: "98.45",
          priceChange24h: "12.4", 
          volume24h: "2800000000",
          marketCap: "43000000000",
        }
      ];

      const createdAssets = await db.insert(assets).values(assetData).returning();

      // Seed sample user
      const userData: InsertUser = {
        username: "alexchen",
        password: "hashed_password",
        email: "alex@trading.com",
        portfolioValue: "127543.21",
      };

      const [user] = await db.insert(users).values(userData).returning();

      // Seed AI insights
      const insightData: InsertAiInsight[] = [
        {
          assetId: createdAssets[0].id,
          type: "sentiment",
          title: "Market Sentiment",
          description: "Strong accumulation detected. Whale activity increased 34% in last 4 hours.",
          confidence: "89.00",
          metadata: { status: "Bullish" },
          isActive: true,
        },
        {
          assetId: createdAssets[1].id,
          type: "pattern",
          title: "Pattern Recognition",
          description: "Ascending triangle formation detected with 78% historical accuracy.",
          confidence: "78.00",
          metadata: { pattern: "Ascending Triangle" },
          isActive: true,
        }
      ];

      await db.insert(aiInsights).values(insightData);

      // Seed news items
      const newsData: InsertNewsItem[] = [
        {
          title: "Bitcoin ETF Approval Signals",
          summary: "Growing institutional interest as major financial institutions file for Bitcoin ETF approvals.",
          source: "CryptoNews",
          impact: "high",
          sentiment: "positive",
          publishedAt: new Date(),
        },
        {
          title: "Ethereum Layer 2 Adoption Surge",
          summary: "Layer 2 solutions see record transaction volumes as gas fees remain low.",
          source: "BlockchainDaily",
          impact: "medium", 
          sentiment: "positive",
          publishedAt: new Date(),
        }
      ];

      await db.insert(newsItems).values(newsData);

    } catch (error) {
      console.error('Error seeding initial data:', error);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  // Assets
  async getAssets(): Promise<Asset[]> {
    return await db.select().from(assets);
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }

  async getAssetBySymbol(symbol: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.symbol, symbol));
    return asset || undefined;
  }

  async createAsset(assetData: InsertAsset): Promise<Asset> {
    const [asset] = await db.insert(assets).values(assetData).returning();
    return asset;
  }

  async updateAssetPrice(id: string, price: string, priceChange24h: string): Promise<Asset | undefined> {
    const [asset] = await db
      .update(assets)
      .set({ 
        currentPrice: price, 
        priceChange24h,
        lastUpdated: new Date()
      })
      .where(eq(assets.id, id))
      .returning();
    return asset || undefined;
  }

  // Positions
  async getUserPositions(userId: string): Promise<Position[]> {
    return await db.select().from(positions).where(eq(positions.userId, userId));
  }

  async createPosition(positionData: InsertPosition): Promise<Position> {
    const [position] = await db.insert(positions).values(positionData).returning();
    return position;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position | undefined> {
    const [position] = await db
      .update(positions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(positions.id, id))
      .returning();
    return position || undefined;
  }

  // Trades
  async getUserTrades(userId: string, limit = 50): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.executedAt))
      .limit(limit);
  }

  async createTrade(tradeData: InsertTrade): Promise<Trade> {
    const [trade] = await db.insert(trades).values(tradeData).returning();
    return trade;
  }

  // AI Insights
  async getActiveInsights(assetId?: string): Promise<AiInsight[]> {
    const query = db.select().from(aiInsights).where(eq(aiInsights.isActive, true));
    
    if (assetId) {
      return await db.select().from(aiInsights)
        .where(and(eq(aiInsights.isActive, true), eq(aiInsights.assetId, assetId)));
    }
    
    return await query.orderBy(desc(aiInsights.createdAt));
  }

  async createInsight(insightData: InsertAiInsight): Promise<AiInsight> {
    const [insight] = await db.insert(aiInsights).values(insightData).returning();
    return insight;
  }

  // News
  async getRecentNews(limit = 20): Promise<NewsItem[]> {
    return await db
      .select()
      .from(newsItems)
      .orderBy(desc(newsItems.publishedAt))
      .limit(limit);
  }

  async createNewsItem(newsData: InsertNewsItem): Promise<NewsItem> {
    const [news] = await db.insert(newsItems).values(newsData).returning();
    return news;
  }

  // Market Data
  async getMarketData(assetId: string, limit = 100): Promise<MarketData[]> {
    return await db
      .select()
      .from(marketData)
      .where(eq(marketData.assetId, assetId))
      .orderBy(desc(marketData.timestamp))
      .limit(limit);
  }

  async addMarketData(data: InsertMarketData): Promise<MarketData> {
    const [marketDataPoint] = await db.insert(marketData).values(data).returning();
    return marketDataPoint;
  }

  // Worker Tasks
  async createWorkerTask(taskData: InsertWorkerTask): Promise<WorkerTask> {
    const [task] = await db.insert(workerTasks).values(taskData).returning();
    return task;
  }

  async getWorkerTask(taskId: string): Promise<WorkerTask | undefined> {
    const [task] = await db.select().from(workerTasks).where(eq(workerTasks.taskId, taskId));
    return task || undefined;
  }

  async updateWorkerTask(taskId: string, updates: Partial<WorkerTask>): Promise<WorkerTask | undefined> {
    const [task] = await db
      .update(workerTasks)
      .set(updates)
      .where(eq(workerTasks.taskId, taskId))
      .returning();
    return task || undefined;
  }

  async getActiveTasks(): Promise<WorkerTask[]> {
    return await db
      .select()
      .from(workerTasks)
      .where(eq(workerTasks.status, 'running'));
  }

  async getPendingTasks(limit = 10): Promise<WorkerTask[]> {
    return await db
      .select()
      .from(workerTasks)
      .where(eq(workerTasks.status, 'pending'))
      .orderBy(desc(workerTasks.createdAt))
      .limit(limit);
  }
}