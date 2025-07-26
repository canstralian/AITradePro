import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  portfolioValue: decimal("portfolio_value", { precision: 20, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  currentPrice: decimal("current_price", { precision: 20, scale: 8 }).notNull(),
  priceChange24h: decimal("price_change_24h", { precision: 10, scale: 4 }).default("0"),
  volume24h: decimal("volume_24h", { precision: 20, scale: 2 }).default("0"),
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }).default("0"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  assetId: varchar("asset_id").references(() => assets.id).notNull(),
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  averagePrice: decimal("average_price", { precision: 20, scale: 8 }).notNull(),
  totalValue: decimal("total_value", { precision: 20, scale: 2 }).notNull(),
  pnl: decimal("pnl", { precision: 20, scale: 2 }).default("0"),
  pnlPercentage: decimal("pnl_percentage", { precision: 10, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  assetId: varchar("asset_id").references(() => assets.id).notNull(),
  type: text("type").notNull(), // 'buy' | 'sell'
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  totalValue: decimal("total_value", { precision: 20, scale: 2 }).notNull(),
  executedAt: timestamp("executed_at").defaultNow(),
});

export const aiInsights = pgTable("ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => assets.id),
  type: text("type").notNull(), // 'sentiment' | 'pattern' | 'news'
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  metadata: jsonb("metadata"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const newsItems = pgTable("news_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  source: text("source").notNull(),
  url: text("url"),
  impact: text("impact"), // 'high' | 'medium' | 'low'
  sentiment: text("sentiment"), // 'positive' | 'negative' | 'neutral'
  publishedAt: timestamp("published_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => assets.id).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  volume: decimal("volume", { precision: 20, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  lastUpdated: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  executedAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

export const insertNewsItemSchema = createInsertSchema(newsItems).omit({
  id: true,
  createdAt: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type NewsItem = typeof newsItems.$inferSelect;
export type InsertNewsItem = z.infer<typeof insertNewsItemSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
