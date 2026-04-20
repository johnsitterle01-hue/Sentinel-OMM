import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Watchlist: symbols the user is tracking
export const watchlist = sqliteTable("watchlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class").notNull(), // "stock" | "crypto" | "forex"
  displayName: text("display_name").notNull(),
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({ id: true });
export type InsertWatchlistItem = z.infer<typeof insertWatchlistSchema>;
export type WatchlistItem = typeof watchlist.$inferSelect;

// Portfolio positions (for risk management)
export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class").notNull(),
  quantity: real("quantity").notNull(),
  entryPrice: real("entry_price").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const insertPositionSchema = createInsertSchema(positions).omit({ id: true, createdAt: true });
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

// Saved AI trade ideas
export const tradeIdeas = sqliteTable("trade_ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class").notNull(),
  direction: text("direction").notNull(), // "long" | "short"
  entry: real("entry").notNull(),
  stopLoss: real("stop_loss").notNull(),
  takeProfit: real("take_profit").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  rationale: text("rationale").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const insertTradeIdeaSchema = createInsertSchema(tradeIdeas).omit({ id: true, createdAt: true });
export type InsertTradeIdea = z.infer<typeof insertTradeIdeaSchema>;
export type TradeIdea = typeof tradeIdeas.$inferSelect;

// Alert settings (Telegram + rules). Single-row table (id = 1).
export const alertSettings = sqliteTable("alert_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  enabled: integer("enabled").notNull().default(0),
  minConfidence: integer("min_confidence").notNull().default(60),
  sendSignals: integer("send_signals").notNull().default(1),
  sendHighImpactNews: integer("send_high_impact_news").notNull().default(1),
  sendUpcomingEvents: integer("send_upcoming_events").notNull().default(1),
  quietHoursStart: integer("quiet_hours_start").notNull().default(23),
  quietHoursEnd: integer("quiet_hours_end").notNull().default(7),
  checkIntervalMinutes: integer("check_interval_minutes").notNull().default(15),
});
export type AlertSettings = typeof alertSettings.$inferSelect;

// Log of last sent signals (for dedup)
export const alertLog = sqliteTable("alert_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(), // "signal" | "news" | "event"
  key: text("key").notNull(), // symbol+direction, or news-id, or event-id
  sentAt: integer("sent_at").notNull(),
  meta: text("meta"),
});
export type AlertLogEntry = typeof alertLog.$inferSelect;

// ============ API Response Types (not in DB) ============

export interface Quote {
  symbol: string;
  displayName: string;
  assetClass: "stock" | "crypto" | "forex";
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high24h?: number;
  low24h?: number;
  marketCap?: number;
  updatedAt: number;
}

export interface Candle {
  t: number; // unix timestamp (seconds)
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: number;
  summary?: string;
  sentiment: "bullish" | "bearish" | "neutral";
  sentimentScore: number; // -1 to 1
  impact: "high" | "medium" | "low";
  relatedSymbols: string[];
  category: "earnings" | "macro" | "geopolitics" | "crypto" | "company" | "general";
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: number; // unix ms
  category: "cpi" | "rates" | "earnings" | "gdp" | "jobs" | "fomc" | "other";
  region: string;
  importance: "high" | "medium" | "low";
  forecast?: string;
  previous?: string;
  expectedImpact: string;
}

export interface TechnicalAnalysis {
  symbol: string;
  rsi: number;
  rsiSignal: "overbought" | "oversold" | "neutral";
  macd: { macd: number; signal: number; histogram: number };
  macdSignal: "bullish" | "bearish" | "neutral";
  sma20: number;
  sma50: number;
  sma200: number;
  trend: "bullish" | "bearish" | "sideways";
  volumeTrend: "rising" | "falling" | "stable";
  volatility: number;
  patterns: string[];
  support: number;
  resistance: number;
}

export interface TradeIdeaLive {
  symbol: string;
  displayName: string;
  assetClass: "stock" | "crypto" | "forex";
  direction: "long" | "short";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  confidence: number;
  rationale: string[];
  technicals: TechnicalAnalysis;
  sentiment: "bullish" | "bearish" | "neutral";
}

export interface RiskMetrics {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  maxRiskPerTrade: number;
  currentExposure: number;
  diversification: {
    byAssetClass: Record<string, number>;
    concentration: "low" | "medium" | "high";
    recommendations: string[];
  };
}
