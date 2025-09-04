import { getDatabase } from '../db';
import { logger } from '../utils/logger';
import { nanoid } from 'nanoid';

// Mock data for development
const mockAssets = [
  { id: 'BTC', symbol: 'BTC', name: 'Bitcoin', currentPrice: 45000, priceChange24h: 2.5, volume24h: 25000000000, marketCap: 850000000000 },
  { id: 'ETH', symbol: 'ETH', name: 'Ethereum', currentPrice: 2800, priceChange24h: 1.8, volume24h: 12000000000, marketCap: 340000000000 },
  { id: 'SOL', symbol: 'SOL', name: 'Solana', currentPrice: 95, priceChange24h: 5.2, volume24h: 2000000000, marketCap: 40000000000 },
  { id: 'ADA', symbol: 'ADA', name: 'Cardano', currentPrice: 0.45, priceChange24h: -1.2, volume24h: 800000000, marketCap: 15000000000 },
  { id: 'MATIC', symbol: 'MATIC', name: 'Polygon', currentPrice: 0.85, priceChange24h: 3.1, volume24h: 500000000, marketCap: 8000000000 },
  { id: 'DOT', symbol: 'DOT', name: 'Polkadot', currentPrice: 6.2, priceChange24h: -0.8, volume24h: 300000000, marketCap: 7500000000 }
];

const mockUsers = [
  {
    id: 'user-1',
    username: 'demo_trader',
    password: 'hashed_password', // In real app, this would be properly hashed
    email: 'demo@example.com',
    portfolioValue: 50000.00
  }
];

const mockInsights = [
  {
    id: nanoid(),
    assetId: 'BTC',
    type: 'technical_analysis',
    title: 'Bitcoin Bull Flag Formation',
    description: 'BTC is showing a strong bull flag pattern with potential breakout target of $52,000',
    confidence: 0.85,
    metadata: JSON.stringify({ pattern: 'bull_flag', target: 52000, timeframe: '4H' })
  },
  {
    id: nanoid(),
    assetId: 'ETH',
    type: 'market_sentiment',
    title: 'Ethereum Network Activity Surge',
    description: 'Increased network activity and DeFi usage indicate positive momentum for ETH',
    confidence: 0.78,
    metadata: JSON.stringify({ network_activity: 'high', defi_tvl_change: '+15%' })
  }
];

const mockNews = [
  {
    id: nanoid(),
    title: 'Major Institution Announces Bitcoin Treasury Allocation',
    summary: 'Large corporation allocates 5% of treasury reserves to Bitcoin, citing inflation hedge',
    source: 'CryptoNews',
    url: 'https://example.com/news/1',
    impact: 'high',
    sentiment: 'positive',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    id: nanoid(),
    title: 'Ethereum Layer 2 Scaling Solutions Show Record Usage',
    summary: 'Transaction volumes on L2 networks reach all-time high, reducing main network congestion',
    source: 'BlockchainToday',
    url: 'https://example.com/news/2',
    impact: 'medium',
    sentiment: 'positive',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
  }
];

export async function initializeDatabase() {
  try {
    logger.info('Initializing database with mock data...');
    
    const db = getDatabase();
    
    // Check if we're using SQLite and create tables if they don't exist
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl?.startsWith('sqlite:') || !databaseUrl) {
      logger.info('Setting up SQLite database schema...');
      // For SQLite, we would need to run CREATE TABLE statements here
      // For now, Drizzle will handle this automatically in development
    }
    
    // Insert mock assets
    try {
      for (const asset of mockAssets) {
        await db.insert(db.schema?.assets || (await import('../../shared/schema-sqlite')).assets).values({
          ...asset,
          updatedAt: new Date()
        }).onConflictDoNothing();
      }
      logger.info(`Inserted ${mockAssets.length} mock assets`);
    } catch (error) {
      logger.debug('Assets may already exist, skipping insert');
    }
    
    // Insert mock users
    try {
      for (const user of mockUsers) {
        await db.insert(db.schema?.users || (await import('../../shared/schema-sqlite')).users).values({
          ...user,
          createdAt: new Date()
        }).onConflictDoNothing();
      }
      logger.info(`Inserted ${mockUsers.length} mock users`);
    } catch (error) {
      logger.debug('Users may already exist, skipping insert');
    }
    
    // Insert mock insights
    try {
      for (const insight of mockInsights) {
        await db.insert(db.schema?.aiInsights || (await import('../../shared/schema-sqlite')).aiInsights).values({
          ...insight,
          createdAt: new Date()
        }).onConflictDoNothing();
      }
      logger.info(`Inserted ${mockInsights.length} mock insights`);
    } catch (error) {
      logger.debug('Insights may already exist, skipping insert');
    }
    
    // Insert mock news
    try {
      for (const news of mockNews) {
        await db.insert(db.schema?.newsItems || (await import('../../shared/schema-sqlite')).newsItems).values({
          ...news,
          createdAt: new Date()
        }).onConflictDoNothing();
      }
      logger.info(`Inserted ${mockNews.length} mock news items`);
    } catch (error) {
      logger.debug('News items may already exist, skipping insert');
    }
    
    // Generate some mock market data
    try {
      for (const asset of mockAssets.slice(0, 3)) { // Just for BTC, ETH, SOL
        const basePrice = asset.currentPrice;
        for (let i = 0; i < 24; i++) {
          const timestamp = new Date(Date.now() - (24 - i) * 60 * 60 * 1000);
          const priceVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
          const price = basePrice * (1 + priceVariation);
          const volume = asset.volume24h * (0.8 + Math.random() * 0.4); // ±20% volume variation
          
          await db.insert(db.schema?.marketData || (await import('../../shared/schema-sqlite')).marketData).values({
            id: nanoid(),
            assetId: asset.id,
            price,
            volume,
            timestamp
          }).onConflictDoNothing();
        }
      }
      logger.info('Generated mock market data for past 24 hours');
    } catch (error) {
      logger.debug('Market data may already exist, skipping insert');
    }
    
    logger.info('Database initialization completed');
    
  } catch (error) {
    logger.error('Failed to initialize database', { error: error instanceof Error ? error.message : error });
  }
}