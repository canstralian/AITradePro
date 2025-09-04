import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  portfolioValue: real("portfolio_value").notNull().default(0),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  currentPrice: real("current_price").notNull(),
  priceChange24h: real("price_change_24h").notNull(),
  volume24h: real("volume_24h").notNull(),
  marketCap: real("market_cap").notNull(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const marketData = sqliteTable("market_data", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => assets.id),
  price: real("price").notNull(),
  volume: real("volume").notNull(),
  timestamp: integer("timestamp", { mode: 'timestamp' }).notNull(),
});

export const userPositions = sqliteTable("user_positions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  quantity: real("quantity").notNull(),
  averagePrice: real("average_price").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const trades = sqliteTable("trades", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  type: text("type").notNull(), // 'buy' or 'sell'
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  total: real("total").notNull(),
  status: text("status").notNull().default("completed"),
  timestamp: integer("timestamp", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const aiInsights = sqliteTable("ai_insights", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").references(() => assets.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: real("confidence").notNull(),
  metadata: text("metadata"), // JSON string
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const newsItems = sqliteTable("news_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  impact: text("impact").notNull(), // 'low', 'medium', 'high'
  sentiment: text("sentiment").notNull(), // 'positive', 'negative', 'neutral'
  publishedAt: integer("published_at", { mode: 'timestamp' }).notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Zod schemas for validation (same as PostgreSQL)
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