// Alert scheduler - periodically scans watchlist, news, calendar and sends
// Telegram alerts for new signals. Dedup via alert_log.

import { storage } from "./storage";
import { fetchQuote, fetchCandles } from "./marketData";
import { analyze, generateTradeIdea } from "./analysis";
import { fetchNews, newsSentimentForSymbol } from "./news";
import { getCalendarEvents } from "./calendar";
import {
  sendTelegramMessage,
  formatSignalMessage,
  formatNewsAlert,
  formatEventAlert,
  type TelegramConfig,
} from "./telegram";
import type { TradeIdeaLive } from "@shared/schema";

// Dedup windows
const SIGNAL_DEDUP_MS = 6 * 60 * 60 * 1000; // 6h — same symbol+direction
const NEWS_DEDUP_MS = 24 * 60 * 60 * 1000; // 24h
const EVENT_DEDUP_MS = 24 * 60 * 60 * 1000; // 24h

function isQuietHours(nowHour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return nowHour >= start && nowHour < end;
  // wraps midnight (e.g. 23 -> 7)
  return nowHour >= start || nowHour < end;
}

let currentTimer: NodeJS.Timeout | null = null;

export async function runAlertScan(): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const settings = storage.getAlertSettings();
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  if (!settings.enabled || !settings.telegramBotToken || !settings.telegramChatId) {
    return { sent: 0, skipped: 0, errors: ["Alerts deaktiviert oder Bot nicht konfiguriert"] };
  }

  const cfg: TelegramConfig = {
    botToken: settings.telegramBotToken,
    chatId: settings.telegramChatId,
  };

  const nowHour = new Date().getHours();
  const quiet = isQuietHours(nowHour, settings.quietHoursStart, settings.quietHoursEnd);
  if (quiet) return { sent: 0, skipped: 1, errors: ["Ruhezeit aktiv"] };

  // Fetch news once — used for both signals (sentiment input) and news alerts
  let newsCached: Awaited<ReturnType<typeof fetchNews>> = [];
  try { newsCached = await fetchNews(); } catch {}

  // ========== SIGNALS ==========
  if (settings.sendSignals) {
    const watchlist = storage.getWatchlist();
    for (const item of watchlist) {
      try {
        const [quote, candles] = await Promise.all([
          fetchQuote(item.symbol, item.assetClass as any, item.displayName),
          fetchCandles(item.symbol, "3mo", "1d"),
        ]);
        if (!quote || !candles || candles.length < 30) { skipped++; continue; }
        const ta = analyze(item.symbol, candles);
        const sentiment = newsSentimentForSymbol(newsCached, item.symbol);
        const idea: TradeIdeaLive = generateTradeIdea(quote, candles, ta, sentiment);

        if (idea.confidence < settings.minConfidence) { skipped++; continue; }

        const key = `${idea.symbol}:${idea.direction}`;
        if (storage.wasRecentlySent("signal", key, SIGNAL_DEDUP_MS)) { skipped++; continue; }

        const text = formatSignalMessage(idea, quote);
        const res = await sendTelegramMessage(cfg, text);
        if (res.ok) {
          storage.logSent("signal", key, `conf=${idea.confidence}`);
          sent++;
        } else {
          errors.push(`${item.symbol}: ${res.error}`);
        }
      } catch (e: any) {
        errors.push(`${item.symbol}: ${e?.message || e}`);
      }
    }
  }

  // ========== HIGH-IMPACT NEWS ==========
  if (settings.sendHighImpactNews) {
    try {
      const news = newsCached.length > 0 ? newsCached : await fetchNews();
      const highImpact = news.filter((n) => n.impact === "high").slice(0, 5);
      for (const item of highImpact) {
        if (storage.wasRecentlySent("news", item.id, NEWS_DEDUP_MS)) { skipped++; continue; }
        const text = formatNewsAlert(item);
        const res = await sendTelegramMessage(cfg, text);
        if (res.ok) {
          storage.logSent("news", item.id);
          sent++;
        } else {
          errors.push(`news: ${res.error}`);
        }
      }
    } catch (e: any) {
      errors.push(`news: ${e?.message || e}`);
    }
  }

  // ========== UPCOMING EVENTS (next 24h) ==========
  if (settings.sendUpcomingEvents) {
    try {
      const events = getCalendarEvents();
      const soon = events.filter((e) => {
        const dt = e.date - Date.now();
        return e.importance === "high" && dt > 0 && dt < 24 * 60 * 60 * 1000;
      });
      for (const ev of soon) {
        if (storage.wasRecentlySent("event", ev.id, EVENT_DEDUP_MS)) { skipped++; continue; }
        const text = formatEventAlert(ev);
        const res = await sendTelegramMessage(cfg, text);
        if (res.ok) {
          storage.logSent("event", ev.id);
          sent++;
        } else {
          errors.push(`event: ${res.error}`);
        }
      }
    } catch (e: any) {
      errors.push(`event: ${e?.message || e}`);
    }
  }

  return { sent, skipped, errors };
}

export function startAlertScheduler() {
  const tick = async () => {
    try {
      const settings = storage.getAlertSettings();
      const interval = Math.max(5, settings.checkIntervalMinutes || 15);
      if (settings.enabled) {
        const res = await runAlertScan();
        if (res.sent > 0) console.log(`[alerts] ${res.sent} gesendet, ${res.skipped} übersprungen`);
        if (res.errors.length) console.log(`[alerts] errors:`, res.errors);
      }
      if (currentTimer) clearTimeout(currentTimer);
      currentTimer = setTimeout(tick, interval * 60 * 1000);
    } catch (e) {
      console.error("[alerts] scan failed:", e);
      if (currentTimer) clearTimeout(currentTimer);
      currentTimer = setTimeout(tick, 15 * 60 * 1000);
    }
  };
  // First run: 60s after boot
  currentTimer = setTimeout(tick, 60 * 1000);
  console.log("[alerts] scheduler started");
}
