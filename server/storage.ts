import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  watchlist,
  positions,
  tradeIdeas,
  alertSettings,
  alertLog,
  type WatchlistItem,
  type InsertWatchlistItem,
  type Position,
  type InsertPosition,
  type TradeIdea,
  type InsertTradeIdea,
  type AlertSettings,
  type AlertLogEntry,
} from "@shared/schema";
import { and, gt } from "drizzle-orm";

const sqlite = new Database("trading.db");
sqlite.pragma("journal_mode = WAL");

// Auto-create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    display_name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    quantity REAL NOT NULL,
    entry_price REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS trade_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    direction TEXT NOT NULL,
    entry REAL NOT NULL,
    stop_loss REAL NOT NULL,
    take_profit REAL NOT NULL,
    confidence INTEGER NOT NULL,
    rationale TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS alert_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    enabled INTEGER NOT NULL DEFAULT 0,
    min_confidence INTEGER NOT NULL DEFAULT 60,
    send_signals INTEGER NOT NULL DEFAULT 1,
    send_high_impact_news INTEGER NOT NULL DEFAULT 1,
    send_upcoming_events INTEGER NOT NULL DEFAULT 1,
    quiet_hours_start INTEGER NOT NULL DEFAULT 23,
    quiet_hours_end INTEGER NOT NULL DEFAULT 7,
    check_interval_minutes INTEGER NOT NULL DEFAULT 15
  );
  CREATE TABLE IF NOT EXISTS alert_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    key TEXT NOT NULL,
    sent_at INTEGER NOT NULL,
    meta TEXT
  );
`);

export const db = drizzle(sqlite, { schema });

export interface IStorage {
  // Watchlist
  getWatchlist(): WatchlistItem[];
  addToWatchlist(item: InsertWatchlistItem): WatchlistItem;
  removeFromWatchlist(id: number): { changes: number };

  // Positions
  getPositions(): Position[];
  addPosition(item: InsertPosition): Position;
  removePosition(id: number): { changes: number };

  // Trade ideas
  getTradeIdeas(): TradeIdea[];
  saveTradeIdea(item: InsertTradeIdea): TradeIdea;
  removeTradeIdea(id: number): { changes: number };

  // Alert settings
  getAlertSettings(): AlertSettings;
  updateAlertSettings(patch: Partial<AlertSettings>): AlertSettings;

  // Alert log (dedup)
  wasRecentlySent(kind: string, key: string, withinMs: number): boolean;
  logSent(kind: string, key: string, meta?: string): void;
}

class SqliteStorage implements IStorage {
  getWatchlist(): WatchlistItem[] {
    return db.select().from(watchlist).all();
  }

  addToWatchlist(item: InsertWatchlistItem): WatchlistItem {
    return db.insert(watchlist).values(item).returning().get();
  }

  removeFromWatchlist(id: number) {
    return db.delete(watchlist).where(eq(watchlist.id, id)).run();
  }

  getPositions(): Position[] {
    return db.select().from(positions).all();
  }

  addPosition(item: InsertPosition): Position {
    return db
      .insert(positions)
      .values({ ...item, createdAt: Date.now() })
      .returning()
      .get();
  }

  removePosition(id: number) {
    return db.delete(positions).where(eq(positions.id, id)).run();
  }

  getTradeIdeas(): TradeIdea[] {
    return db.select().from(tradeIdeas).all();
  }

  saveTradeIdea(item: InsertTradeIdea): TradeIdea {
    return db
      .insert(tradeIdeas)
      .values({ ...item, createdAt: Date.now() })
      .returning()
      .get();
  }

  removeTradeIdea(id: number) {
    return db.delete(tradeIdeas).where(eq(tradeIdeas.id, id)).run();
  }

  getAlertSettings(): AlertSettings {
    let row = db.select().from(alertSettings).get();
    if (!row) {
      row = db.insert(alertSettings).values({}).returning().get();
    }
    return row;
  }

  updateAlertSettings(patch: Partial<AlertSettings>): AlertSettings {
    const existing = this.getAlertSettings();
    const { id, ...clean } = patch as any;
    db.update(alertSettings).set(clean).where(eq(alertSettings.id, existing.id)).run();
    return this.getAlertSettings();
  }

  wasRecentlySent(kind: string, key: string, withinMs: number): boolean {
    const cutoff = Date.now() - withinMs;
    const row = db
      .select()
      .from(alertLog)
      .where(and(eq(alertLog.kind, kind), eq(alertLog.key, key), gt(alertLog.sentAt, cutoff)))
      .get();
    return !!row;
  }

  logSent(kind: string, key: string, meta?: string): void {
    db.insert(alertLog).values({ kind, key, sentAt: Date.now(), meta: meta ?? null }).run();
    // Keep log table lean: delete entries older than 14 days
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    try {
      sqlite.prepare("DELETE FROM alert_log WHERE sent_at < ?").run(cutoff);
    } catch {}
  }
}

export const storage: IStorage = new SqliteStorage();

// Seed default watchlist if empty
const existing = storage.getWatchlist();
if (existing.length === 0) {
  const defaults: InsertWatchlistItem[] = [
    { symbol: "AAPL", assetClass: "stock", displayName: "Apple Inc." },
    { symbol: "MSFT", assetClass: "stock", displayName: "Microsoft" },
    { symbol: "NVDA", assetClass: "stock", displayName: "NVIDIA" },
    { symbol: "TSLA", assetClass: "stock", displayName: "Tesla" },
    { symbol: "SAP.DE", assetClass: "stock", displayName: "SAP SE" },
    { symbol: "BTC-USD", assetClass: "crypto", displayName: "Bitcoin" },
    { symbol: "ETH-USD", assetClass: "crypto", displayName: "Ethereum" },
    { symbol: "SOL-USD", assetClass: "crypto", displayName: "Solana" },
    { symbol: "EURUSD=X", assetClass: "forex", displayName: "EUR/USD" },
    { symbol: "GBPUSD=X", assetClass: "forex", displayName: "GBP/USD" },
    { symbol: "USDJPY=X", assetClass: "forex", displayName: "USD/JPY" },
  ];
  for (const d of defaults) storage.addToWatchlist(d);
}
