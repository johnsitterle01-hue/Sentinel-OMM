import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertWatchlistSchema, insertPositionSchema, insertTradeIdeaSchema } from "@shared/schema";
import type { Quote, RiskMetrics, TradeIdeaLive } from "@shared/schema";
import { fetchQuote, fetchCandles } from "./marketData";
import { analyze, generateTradeIdea } from "./analysis";
import { fetchNews, newsSentimentForSymbol } from "./news";
import { getCalendarEvents } from "./calendar";
import { sendTelegramMessage, formatTestMessage } from "./telegram";
import { runAlertScan } from "./alertScheduler";

export async function registerRoutes(_httpServer: Server, app: Express): Promise<void> {
  // ---------- Alert settings ----------
  app.get("/api/alert-settings", (_req, res) => {
    const s = storage.getAlertSettings();
    // Mask bot token — only return last 4 chars for display
    const masked = s.telegramBotToken
      ? `••••••${s.telegramBotToken.slice(-4)}`
      : "";
    res.json({ ...s, telegramBotToken: masked, hasToken: !!s.telegramBotToken });
  });

  app.patch("/api/alert-settings", (req, res) => {
    const body = req.body || {};
    const patch: Record<string, unknown> = {};
    if (typeof body.telegramBotToken === "string" && body.telegramBotToken && !body.telegramBotToken.startsWith("•"))
      patch.telegramBotToken = body.telegramBotToken.trim();
    if (typeof body.telegramChatId === "string") patch.telegramChatId = body.telegramChatId.trim();
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled ? 1 : 0;
    if (typeof body.minConfidence === "number") patch.minConfidence = Math.max(0, Math.min(100, body.minConfidence));
    if (typeof body.sendSignals === "boolean") patch.sendSignals = body.sendSignals ? 1 : 0;
    if (typeof body.sendHighImpactNews === "boolean") patch.sendHighImpactNews = body.sendHighImpactNews ? 1 : 0;
    if (typeof body.sendUpcomingEvents === "boolean") patch.sendUpcomingEvents = body.sendUpcomingEvents ? 1 : 0;
    if (typeof body.quietHoursStart === "number") patch.quietHoursStart = body.quietHoursStart;
    if (typeof body.quietHoursEnd === "number") patch.quietHoursEnd = body.quietHoursEnd;
    if (typeof body.checkIntervalMinutes === "number") patch.checkIntervalMinutes = Math.max(5, body.checkIntervalMinutes);
    const updated = storage.updateAlertSettings(patch as any);
    res.json({ ok: true, enabled: !!updated.enabled });
  });

  app.post("/api/alert-settings/test", async (_req, res) => {
    const s = storage.getAlertSettings();
    if (!s.telegramBotToken || !s.telegramChatId) {
      return res.status(400).json({ ok: false, error: "Bot-Token oder Chat-ID fehlt" });
    }
    const result = await sendTelegramMessage(
      { botToken: s.telegramBotToken, chatId: s.telegramChatId },
      formatTestMessage(),
    );
    res.json(result);
  });

  app.post("/api/alert-settings/scan", async (_req, res) => {
    const result = await runAlertScan();
    res.json(result);
  });

  // ---------- Watchlist ----------
  app.get("/api/watchlist", (_req, res) => {
    res.json(storage.getWatchlist());
  });
  app.post("/api/watchlist", (req, res) => {
    const parsed = insertWatchlistSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.addToWatchlist(parsed.data));
  });
  app.delete("/api/watchlist/:id", (req, res) => {
    res.json(storage.removeFromWatchlist(Number(req.params.id)));
  });

  // ---------- Quotes ----------
  app.get("/api/quotes", async (_req, res) => {
    const items = storage.getWatchlist();
    const quotes = await Promise.all(
      items.map((i) => fetchQuote(i.symbol, i.assetClass as any, i.displayName)),
    );
    res.json(quotes.filter(Boolean));
  });

  app.get("/api/quote/:symbol", async (req, res) => {
    const items = storage.getWatchlist();
    const known = items.find((i) => i.symbol === req.params.symbol);
    const assetClass = (req.query.assetClass as any) || known?.assetClass || "stock";
    const displayName = known?.displayName || req.params.symbol;
    const q = await fetchQuote(req.params.symbol, assetClass, displayName);
    if (!q) return res.status(404).json({ error: "not found" });
    res.json(q);
  });

  // ---------- Candles ----------
  app.get("/api/candles/:symbol", async (req, res) => {
    const range = (req.query.range as any) || "3mo";
    const interval = (req.query.interval as any) || "1d";
    const candles = await fetchCandles(req.params.symbol, range, interval);
    res.json(candles);
  });

  // ---------- Technical analysis ----------
  app.get("/api/analysis/:symbol", async (req, res) => {
    const candles = await fetchCandles(req.params.symbol, "6mo", "1d");
    const ta = analyze(req.params.symbol, candles);
    res.json(ta);
  });

  // ---------- News ----------
  app.get("/api/news", async (_req, res) => {
    const n = await fetchNews();
    res.json(n);
  });

  // ---------- Calendar ----------
  app.get("/api/calendar", (_req, res) => {
    res.json(getCalendarEvents());
  });

  // ---------- Trade ideas (AI) ----------
  app.get("/api/trade-ideas", async (_req, res) => {
    const items = storage.getWatchlist();
    const news = await fetchNews();
    const ideas: TradeIdeaLive[] = [];
    for (const item of items) {
      try {
        const q = await fetchQuote(item.symbol, item.assetClass as any, item.displayName);
        if (!q) continue;
        const candles = await fetchCandles(item.symbol, "6mo", "1d");
        const ta = analyze(item.symbol, candles);
        const sentiment = newsSentimentForSymbol(news, item.symbol);
        ideas.push(generateTradeIdea(q, candles, ta, sentiment));
      } catch (err) {
        console.error("idea error", item.symbol, err);
      }
    }
    // Sort by confidence desc
    ideas.sort((a, b) => b.confidence - a.confidence);
    res.json(ideas);
  });

  app.get("/api/trade-idea/:symbol", async (req, res) => {
    const items = storage.getWatchlist();
    const known = items.find((i) => i.symbol === req.params.symbol);
    if (!known) return res.status(404).json({ error: "unknown symbol" });
    const q = await fetchQuote(known.symbol, known.assetClass as any, known.displayName);
    if (!q) return res.status(500).json({ error: "quote fail" });
    const candles = await fetchCandles(known.symbol, "6mo", "1d");
    const ta = analyze(known.symbol, candles);
    const news = await fetchNews();
    const sentiment = newsSentimentForSymbol(news, known.symbol);
    res.json(generateTradeIdea(q, candles, ta, sentiment));
  });

  app.get("/api/saved-ideas", (_req, res) => {
    res.json(storage.getTradeIdeas());
  });
  app.post("/api/saved-ideas", (req, res) => {
    const parsed = insertTradeIdeaSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.saveTradeIdea(parsed.data));
  });
  app.delete("/api/saved-ideas/:id", (req, res) => {
    res.json(storage.removeTradeIdea(Number(req.params.id)));
  });

  // ---------- Positions / Risk ----------
  app.get("/api/positions", (_req, res) => res.json(storage.getPositions()));
  app.post("/api/positions", (req, res) => {
    const parsed = insertPositionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.addPosition(parsed.data));
  });
  app.delete("/api/positions/:id", (req, res) => {
    res.json(storage.removePosition(Number(req.params.id)));
  });

  app.get("/api/risk", async (_req, res) => {
    const positions = storage.getPositions();
    if (positions.length === 0) {
      return res.json({
        totalValue: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        maxRiskPerTrade: 0,
        currentExposure: 0,
        diversification: {
          byAssetClass: {},
          concentration: "low",
          recommendations: ["Noch keine Positionen — beginne klein mit maximal 1-2% Risiko pro Trade."],
        },
      } satisfies RiskMetrics);
    }

    // Fetch current quotes for all positions
    const quotes: Record<string, Quote> = {};
    for (const p of positions) {
      const q = await fetchQuote(p.symbol, p.assetClass as any, p.symbol);
      if (q) quotes[p.symbol] = q;
    }

    let totalValue = 0;
    let totalCost = 0;
    const byAssetClass: Record<string, number> = { stock: 0, crypto: 0, forex: 0 };
    for (const p of positions) {
      const cur = quotes[p.symbol]?.price ?? p.entryPrice;
      const value = cur * p.quantity;
      const cost = p.entryPrice * p.quantity;
      totalValue += value;
      totalCost += cost;
      byAssetClass[p.assetClass] = (byAssetClass[p.assetClass] || 0) + value;
    }
    const pnl = totalValue - totalCost;
    const pnlPct = totalCost ? (pnl / totalCost) * 100 : 0;

    // Concentration analysis
    const shares: Record<string, number> = {};
    for (const [k, v] of Object.entries(byAssetClass)) {
      shares[k] = totalValue ? (v / totalValue) * 100 : 0;
    }
    const maxShare = Math.max(...Object.values(shares));
    const concentration: "low" | "medium" | "high" = maxShare > 70 ? "high" : maxShare > 45 ? "medium" : "low";

    const recommendations: string[] = [];
    if (concentration === "high") recommendations.push("Starke Konzentration in einer Anlageklasse — Diversifikation empfohlen.");
    if (shares.crypto > 30) recommendations.push("Krypto-Anteil über 30% — hohe Volatilität, Stop-Loss-Disziplin wichtig.");
    if (shares.stock < 40 && positions.length > 2) recommendations.push("Aktien sollten typischerweise das Portfolio-Rückgrat bilden.");
    if (positions.length < 4) recommendations.push("Weniger als 4 Positionen — Single-Name-Risiko ist hoch.");
    if (positions.length > 15) recommendations.push("Über 15 Positionen — schwer zu überwachen, evtl. konsolidieren.");
    if (recommendations.length === 0) recommendations.push("Portfolio ist solide diversifiziert. Weiter so.");

    // Max risk per trade: 1% of portfolio is the classic rule
    const maxRiskPerTrade = totalValue * 0.01;

    res.json({
      totalValue,
      totalPnl: pnl,
      totalPnlPercent: pnlPct,
      maxRiskPerTrade,
      currentExposure: totalValue,
      diversification: { byAssetClass: shares, concentration, recommendations },
    } satisfies RiskMetrics);
  });

  // ---------- Alerts ----------
  // (Simple derived alerts — based on watchlist movers + high-impact news)
  app.get("/api/alerts", async (_req, res) => {
    const items = storage.getWatchlist();
    const alerts: Array<{ id: string; title: string; detail: string; severity: "info" | "warning" | "critical"; timestamp: number }> = [];
    const quotes = await Promise.all(items.map((i) => fetchQuote(i.symbol, i.assetClass as any, i.displayName)));
    for (const q of quotes) {
      if (!q) continue;
      if (Math.abs(q.changePercent) > (q.assetClass === "crypto" ? 5 : q.assetClass === "forex" ? 1.2 : 3)) {
        alerts.push({
          id: `move-${q.symbol}`,
          title: `${q.displayName} bewegt sich ${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`,
          detail: `Aktueller Preis: ${q.price.toFixed(2)}. Ungewöhnlich starke Bewegung.`,
          severity: Math.abs(q.changePercent) > 6 ? "critical" : "warning",
          timestamp: q.updatedAt,
        });
      }
    }
    const news = await fetchNews();
    for (const n of news.slice(0, 5)) {
      if (n.impact === "high") {
        alerts.push({
          id: `news-${n.id}`,
          title: n.title,
          detail: `${n.source} · ${n.sentiment}`,
          severity: "info",
          timestamp: n.publishedAt,
        });
      }
    }
    alerts.sort((a, b) => b.timestamp - a.timestamp);
    res.json(alerts.slice(0, 20));
  });
}
