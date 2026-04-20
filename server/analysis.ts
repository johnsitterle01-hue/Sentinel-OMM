import type { Candle, TechnicalAnalysis, TradeIdeaLive, Quote } from "@shared/schema";

// ============ Technical Indicators ============
export function sma(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

export function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function macd(values: number[]) {
  const emaFast = ema(values.slice(-60), 12);
  const emaSlow = ema(values.slice(-60), 26);
  const macdLine = emaFast - emaSlow;
  // signal is EMA(9) of the macd series — approximate
  const macdSeries: number[] = [];
  for (let i = 26; i <= values.length; i++) {
    const slice = values.slice(0, i);
    macdSeries.push(ema(slice, 12) - ema(slice, 26));
  }
  const signal = ema(macdSeries.slice(-20), 9);
  return { macd: macdLine, signal, histogram: macdLine - signal };
}

export function stdev(values: number[]): number {
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ============ Analysis ============
export function analyze(symbol: string, candles: Candle[]): TechnicalAnalysis {
  const closes = candles.map((c) => c.c);
  const volumes = candles.map((c) => c.v);
  const rsiVal = rsi(closes, 14);
  const macdVal = macd(closes);
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const s200 = sma(closes, Math.min(200, closes.length));
  const latest = closes[closes.length - 1] ?? 0;

  // Trend
  let trend: TechnicalAnalysis["trend"] = "sideways";
  if (s20 > s50 && s50 > s200 && latest > s20) trend = "bullish";
  else if (s20 < s50 && s50 < s200 && latest < s20) trend = "bearish";

  // Volume trend
  const recentVol = sma(volumes.slice(-10), 10);
  const olderVol = sma(volumes.slice(-30, -10), 20) || recentVol;
  const volumeTrend: TechnicalAnalysis["volumeTrend"] =
    recentVol > olderVol * 1.15 ? "rising" : recentVol < olderVol * 0.85 ? "falling" : "stable";

  // Volatility (stdev of daily % returns over last 20)
  const rets: number[] = [];
  for (let i = Math.max(1, closes.length - 20); i < closes.length; i++) {
    rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const volatility = stdev(rets) * 100;

  // Support / resistance — simple swing high/low of last 60 bars
  const slice = candles.slice(-60);
  const support = Math.min(...slice.map((c) => c.l));
  const resistance = Math.max(...slice.map((c) => c.h));

  // Patterns
  const patterns: string[] = [];
  if (latest > s20 && closes[closes.length - 2] <= s20) patterns.push("Bullisher SMA20-Crossover");
  if (latest < s20 && closes[closes.length - 2] >= s20) patterns.push("Bärischer SMA20-Crossover");
  if (rsiVal > 70) patterns.push("RSI Überkauft");
  if (rsiVal < 30) patterns.push("RSI Überverkauft");
  if (macdVal.histogram > 0 && macdVal.macd > macdVal.signal) patterns.push("MACD Bullish Crossover");
  if (macdVal.histogram < 0 && macdVal.macd < macdVal.signal) patterns.push("MACD Bearish Crossover");
  // Higher highs / lower lows
  const last10 = slice.slice(-10);
  const earlier10 = slice.slice(-20, -10);
  if (last10.length && earlier10.length) {
    const hhNow = Math.max(...last10.map((c) => c.h));
    const hhPrev = Math.max(...earlier10.map((c) => c.h));
    const llNow = Math.min(...last10.map((c) => c.l));
    const llPrev = Math.min(...earlier10.map((c) => c.l));
    if (hhNow > hhPrev && llNow > llPrev) patterns.push("Höhere Hochs & Tiefs");
    if (hhNow < hhPrev && llNow < llPrev) patterns.push("Niedrigere Hochs & Tiefs");
  }
  if (latest >= resistance * 0.995) patterns.push("Nahe Widerstand");
  if (latest <= support * 1.005) patterns.push("Nahe Unterstützung");

  return {
    symbol,
    rsi: rsiVal,
    rsiSignal: rsiVal > 70 ? "overbought" : rsiVal < 30 ? "oversold" : "neutral",
    macd: macdVal,
    macdSignal:
      macdVal.histogram > 0 && macdVal.macd > macdVal.signal
        ? "bullish"
        : macdVal.histogram < 0 && macdVal.macd < macdVal.signal
          ? "bearish"
          : "neutral",
    sma20: s20,
    sma50: s50,
    sma200: s200,
    trend,
    volumeTrend,
    volatility,
    patterns,
    support,
    resistance,
  };
}

// ============ AI Trade Idea Engine ============
export function generateTradeIdea(
  quote: Quote,
  candles: Candle[],
  ta: TechnicalAnalysis,
  newsSentiment: number, // -1 to 1
): TradeIdeaLive {
  const price = quote.price;

  // Scoring system — each signal votes bullish/bearish
  let score = 0;
  const reasons: string[] = [];

  if (ta.trend === "bullish") { score += 2; reasons.push("Trend über SMA20/50/200 ausgerichtet (bullisch)"); }
  else if (ta.trend === "bearish") { score -= 2; reasons.push("Preis unter allen SMAs — bärischer Trend"); }

  if (ta.macdSignal === "bullish") { score += 1.5; reasons.push("MACD zeigt bullisches Momentum"); }
  else if (ta.macdSignal === "bearish") { score -= 1.5; reasons.push("MACD zeigt bärisches Momentum"); }

  if (ta.rsi < 30) { score += 1; reasons.push(`RSI ${ta.rsi.toFixed(1)} — überverkaufte Zone, Rebound-Potenzial`); }
  else if (ta.rsi > 70) { score -= 1; reasons.push(`RSI ${ta.rsi.toFixed(1)} — überkauft, Korrektur möglich`); }
  else if (ta.rsi > 50) { score += 0.3; }
  else { score -= 0.3; }

  if (ta.volumeTrend === "rising" && ta.trend === "bullish") {
    score += 1; reasons.push("Steigendes Volumen bestätigt Aufwärtstrend");
  } else if (ta.volumeTrend === "rising" && ta.trend === "bearish") {
    score -= 1; reasons.push("Steigendes Volumen verstärkt Abwärtsbewegung");
  }

  if (newsSentiment > 0.25) { score += 1.2; reasons.push(`News-Sentiment positiv (${(newsSentiment * 100).toFixed(0)}%)`); }
  else if (newsSentiment < -0.25) { score -= 1.2; reasons.push(`News-Sentiment negativ (${(newsSentiment * 100).toFixed(0)}%)`); }

  // Near key levels
  if (price <= ta.support * 1.01) { score += 0.8; reasons.push(`Preis nahe Unterstützung ${ta.support.toFixed(2)}`); }
  if (price >= ta.resistance * 0.99) { score -= 0.8; reasons.push(`Preis nahe Widerstand ${ta.resistance.toFixed(2)}`); }

  const direction: "long" | "short" = score >= 0 ? "long" : "short";
  const absScore = Math.min(8, Math.abs(score));
  const confidence = Math.round(45 + (absScore / 8) * 45); // 45-90

  // ATR-style stop distance (use 1.5x volatility %)
  const riskPct = Math.max(0.8, Math.min(8, ta.volatility * 1.5));
  const rewardPct = riskPct * 2; // 2:1 reward:risk

  let entry = price;
  let stopLoss: number;
  let takeProfit: number;
  if (direction === "long") {
    stopLoss = price * (1 - riskPct / 100);
    takeProfit = price * (1 + rewardPct / 100);
  } else {
    stopLoss = price * (1 + riskPct / 100);
    takeProfit = price * (1 - rewardPct / 100);
  }

  const rrr = Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss);

  if (reasons.length === 0) {
    reasons.push("Kein starkes Signal — neutraler Markt, vorsichtige Positionierung empfohlen");
  }

  return {
    symbol: quote.symbol,
    displayName: quote.displayName,
    assetClass: quote.assetClass,
    direction,
    entry,
    stopLoss,
    takeProfit,
    riskRewardRatio: rrr,
    confidence,
    rationale: reasons,
    technicals: ta,
    sentiment: newsSentiment > 0.15 ? "bullish" : newsSentiment < -0.15 ? "bearish" : "neutral",
  };
}
