import { pgTable, text, decimal, timestamp, boolean, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  portfolioValue: decimal("portfolio_value", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 8 }).notNull(),
  priceChange24h: decimal("price_change_24h", { precision: 10, scale: 4 }).notNull(),
  volume24h: decimal("volume_24h", { precision: 20, scale: 2 }).notNull(),
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const marketData = pgTable("market_data", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => assets.id),
  price: decimal("price", { precision: 15, scale: 8 }).notNull(),
  volume: decimal("volume", { precision: 20, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

export const userPositions = pgTable("user_positions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  averagePrice: decimal("average_price", { precision: 15, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const trades = pgTable("trades", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  type: text("type").notNull(), // 'buy' or 'sell'
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 15, scale: 8 }).notNull(),
  total: decimal("total", { precision: 20, scale: 2 }).notNull(),
  status: text("status").notNull().default("completed"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const aiInsights = pgTable("ai_insights", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").references(() => assets.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  metadata: text("metadata"), // JSON string
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const newsItems = pgTable("news_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  impact: text("impact").notNull(), // 'low', 'medium', 'high'
  sentiment: text("sentiment").notNull(), // 'positive', 'negative', 'neutral'
  publishedAt: timestamp("published_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertAssetSchema = createInsertSchema(assets);
export const selectAssetSchema = createSelectSchema(assets);
export const insertMarketDataSchema = createInsertSchema(marketData);
export const selectMarketDataSchema = createSelectSchema(marketData);
export const insertPositionSchema = createInsertSchema(userPositions);
export const selectPositionSchema = createSelectSchema(userPositions);
export const insertTradeSchema = createInsertSchema(trades);
export const selectTradeSchema = createSelectSchema(trades);
export const insertInsightSchema = createInsertSchema(aiInsights);
export const selectInsightSchema = createSelectSchema(aiInsights);
export const insertNewsSchema = createInsertSchema(newsItems);
export const selectNewsSchema = createSelectSchema(newsItems);

// TypeScript types
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Asset = z.infer<typeof selectAssetSchema>;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type MarketData = z.infer<typeof selectMarketDataSchema>;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type Position = z.infer<typeof selectPositionSchema>;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Trade = z.infer<typeof selectTradeSchema>;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type AiInsight = z.infer<typeof selectInsightSchema>;
export type InsertAiInsight = z.infer<typeof insertInsightSchema>;
export type NewsItem = z.infer<typeof selectNewsSchema>;
export type InsertNewsItem = z.infer<typeof insertNewsSchema>;