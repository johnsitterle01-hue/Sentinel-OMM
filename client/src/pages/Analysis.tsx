import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart, Bar, BarChart,
} from "recharts";
import { formatPrice, formatPct, assetClassLabel } from "@/lib/format";
import type { Candle, Quote, TechnicalAnalysis, WatchlistItem } from "@shared/schema";
import { TrendingUp, TrendingDown, Activity, Volume2, Target } from "lucide-react";

export default function Analysis() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const querySymbol = params.get("symbol");

  const { data: watchlist } = useQuery<WatchlistItem[]>({ queryKey: ["/api/watchlist"] });
  const [selected, setSelected] = useState<string>(querySymbol || "AAPL");
  const [range, setRange] = useState<"1mo" | "3mo" | "6mo" | "1y">("3mo");

  const { data: quote } = useQuery<Quote>({
    queryKey: ["/api/quote", selected],
    refetchInterval: 30000,
  });

  const { data: candles } = useQuery<Candle[]>({
    queryKey: ["/api/candles", selected, { range, interval: "1d" }],
  });

  const { data: ta } = useQuery<TechnicalAnalysis>({
    queryKey: ["/api/analysis", selected],
  });

  // Live AI trade idea for the selected symbol
  const { data: idea } = useQuery<any>({
    queryKey: ["/api/trade-idea", selected],
  });

  const chartData = (candles ?? []).map((c) => ({
    date: new Date(c.t * 1000).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
    price: c.c,
    volume: c.v,
    sma20: ta?.sma20,
    sma50: ta?.sma50,
  }));

  const up = (quote?.changePercent ?? 0) >= 0;
  const color = up ? "hsl(var(--bull))" : "hsl(var(--bear))";

  return (
    <div className="space-y-6">
      {/* Symbol selector + price */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-auto min-w-[200px]" data-testid="select-symbol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(watchlist ?? []).map((w) => (
                <SelectItem key={w.symbol} value={w.symbol}>
                  <span className="font-mono text-xs mr-2">{w.symbol}</span>
                  {w.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {quote && (
            <Badge variant="outline" className="text-xs">
              {assetClassLabel(quote.assetClass)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-md bg-muted">
          {(["1mo", "3mo", "6mo", "1y"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              data-testid={`range-${r}`}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                range === r ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "1mo" ? "1M" : r === "3mo" ? "3M" : r === "6mo" ? "6M" : "1J"}
            </button>
          ))}
        </div>
      </div>

      {/* Price card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{quote?.displayName || selected}</div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-bold tabular-nums font-mono">
                  {quote ? formatPrice(quote.price, quote.assetClass) : "—"}
                </span>
                {quote && (
                  <span className={`text-lg font-semibold tabular-nums ${up ? "text-bull" : "text-bear"}`} data-testid="text-price-change">
                    {up ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />}
                    {formatPct(quote.changePercent)}
                  </span>
                )}
              </div>
              {quote && (
                <div className="text-xs text-muted-foreground mt-1">
                  Veränd. {formatPrice(quote.change, quote.assetClass)} heute · Tief {formatPrice(quote.low24h, quote.assetClass)} · Hoch {formatPrice(quote.high24h, quote.assetClass)}
                </div>
              )}
            </div>
            {ta && (
              <div className="grid grid-cols-3 gap-4 md:gap-6 text-center md:text-right">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Trend</div>
                  <div className={`text-sm font-bold capitalize ${ta.trend === "bullish" ? "text-bull" : ta.trend === "bearish" ? "text-bear" : "text-foreground"}`}>
                    {ta.trend === "bullish" ? "Bullisch" : ta.trend === "bearish" ? "Bärisch" : "Seitwärts"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">RSI 14</div>
                  <div className="text-sm font-bold font-mono">{ta.rsi.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Volat.</div>
                  <div className="text-sm font-bold font-mono">{ta.volatility.toFixed(2)}%</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation card */}
      {idea && idea.direction && (
        <Card className={`border-l-4 ${idea.direction === "long" ? "border-l-bull" : idea.direction === "short" ? "border-l-bear" : "border-l-muted-foreground"}`}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6 justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Empfehlung</div>
                  <Badge
                    className={
                      idea.action === "long"
                        ? "bg-bull text-white hover:bg-bull"
                        : idea.action === "short"
                        ? "bg-bear text-white hover:bg-bear"
                        : "bg-muted text-foreground hover:bg-muted"
                    }
                    data-testid="badge-recommendation"
                  >
                    {idea.direction === "long" ? "KAUFEN (LONG)" : idea.direction === "short" ? "VERKAUFEN (SHORT)" : "ABWARTEN"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Confidence {Math.round(idea.confidence ?? 0)}%</span>
                </div>
                <div className="text-lg font-semibold mb-2">
                  {idea.direction === "long" && `Kaufen nahe ${formatPrice(idea.entry, quote?.assetClass)} — Stop-Loss ${formatPrice(idea.stopLoss, quote?.assetClass)} — Ziel ${formatPrice(idea.takeProfit, quote?.assetClass)}`}
                  {idea.direction === "short" && `Shorten nahe ${formatPrice(idea.entry, quote?.assetClass)} — Stop-Loss ${formatPrice(idea.stopLoss, quote?.assetClass)} — Ziel ${formatPrice(idea.takeProfit, quote?.assetClass)}`}
                  {idea.direction === "hold" && "Keine klare Setup-Kombination — aktuell nicht handeln."}
                </div>
                {Array.isArray(idea.rationale) && idea.rationale.length > 0 && (
                  <ul className="text-sm text-muted-foreground space-y-1 mt-3">
                    {idea.rationale.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-foreground">·</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {typeof idea.riskRewardRatio === "number" && idea.direction !== "hold" && (
                  <div className="text-xs text-muted-foreground mt-3">
                    Chance-Risiko-Verhältnis <span className="font-mono text-foreground font-semibold">{idea.riskRewardRatio.toFixed(2)} : 1</span>
                  </div>
                )}
              </div>
              {idea.direction !== "hold" && (
                <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold">Entry</div>
                    <div className="text-sm font-bold font-mono mt-1">{formatPrice(idea.entry, quote?.assetClass)}</div>
                  </div>
                  <div className="rounded-lg bg-bear/10 p-3">
                    <div className="text-[10px] uppercase text-bear font-semibold">Stop-Loss</div>
                    <div className="text-sm font-bold font-mono mt-1 text-bear">{formatPrice(idea.stopLoss, quote?.assetClass)}</div>
                  </div>
                  <div className="rounded-lg bg-bull/10 p-3">
                    <div className="text-[10px] uppercase text-bull font-semibold">Take-Profit</div>
                    <div className="text-sm font-bold font-mono mt-1 text-bull">{formatPrice(idea.takeProfit, quote?.assetClass)}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-4 border-t pt-3">
              ⚠ Keine Anlageberatung. Eigene Recherche erforderlich. Die Empfehlung basiert auf technischen Indikatoren und Sentiment der letzten Stunden.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kursentwicklung</CardTitle>
          <p className="text-xs text-muted-foreground">Mit SMA20 (blau) und SMA50 (orange)</p>
        </CardHeader>
        <CardContent>
          {!candles ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false} axisLine={false}
                    domain={["auto", "auto"]}
                    orientation="right"
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--popover-border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => formatPrice(v, quote?.assetClass)}
                  />
                  <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2.25} fill="url(#g1)" name="Kurs" isAnimationActive={false} />
                  {ta && <Line type="monotone" dataKey="sma20" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={false} name="SMA 20" strokeDasharray="3 3" />}
                  {ta && <Line type="monotone" dataKey="sma50" stroke="hsl(var(--chart-4))" strokeWidth={1.5} dot={false} name="SMA 50" strokeDasharray="3 3" />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Volume2 className="h-4 w-4" /> Volumen</CardTitle>
        </CardHeader>
        <CardContent>
          {!candles ? <Skeleton className="h-28 w-full" /> : (
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} orientation="right" width={60} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--popover-border))", borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="volume" fill={color} opacity={0.55} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indicators grid */}
      {ta && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <IndicatorCard
            label="RSI (14)"
            value={ta.rsi.toFixed(1)}
            signal={ta.rsiSignal === "overbought" ? "Überkauft" : ta.rsiSignal === "oversold" ? "Überverkauft" : "Neutral"}
            tone={ta.rsiSignal === "overbought" ? "warn" : ta.rsiSignal === "oversold" ? "warn" : "neutral"}
            sub={`30 = überverkauft · 70 = überkauft`}
            icon={Activity}
          />
          <IndicatorCard
            label="MACD"
            value={ta.macd.histogram.toFixed(3)}
            signal={ta.macdSignal === "bullish" ? "Bullisch" : ta.macdSignal === "bearish" ? "Bärisch" : "Neutral"}
            tone={ta.macdSignal === "bullish" ? "bull" : ta.macdSignal === "bearish" ? "bear" : "neutral"}
            sub={`MACD ${ta.macd.macd.toFixed(2)} · Signal ${ta.macd.signal.toFixed(2)}`}
            icon={Activity}
          />
          <IndicatorCard
            label="Trend"
            value={ta.trend === "bullish" ? "↑ Bullisch" : ta.trend === "bearish" ? "↓ Bärisch" : "→ Seitwärts"}
            signal={`Volumen ${ta.volumeTrend === "rising" ? "steigend" : ta.volumeTrend === "falling" ? "fallend" : "stabil"}`}
            tone={ta.trend === "bullish" ? "bull" : ta.trend === "bearish" ? "bear" : "neutral"}
            sub={`SMA20 ${formatPrice(ta.sma20, quote?.assetClass)} · SMA50 ${formatPrice(ta.sma50, quote?.assetClass)}`}
            icon={TrendingUp}
          />
          <IndicatorCard
            label="Unterstützung"
            value={formatPrice(ta.support, quote?.assetClass)}
            signal={`~${(((quote?.price ?? 0) - ta.support) / ta.support * 100).toFixed(1)}% entfernt`}
            tone="neutral"
            sub="Tiefststand letzte 60 Tage"
            icon={Target}
          />
          <IndicatorCard
            label="Widerstand"
            value={formatPrice(ta.resistance, quote?.assetClass)}
            signal={`~${((ta.resistance - (quote?.price ?? 0)) / (quote?.price ?? 1) * 100).toFixed(1)}% entfernt`}
            tone="neutral"
            sub="Höchststand letzte 60 Tage"
            icon={Target}
          />
          <IndicatorCard
            label="Volatilität"
            value={`${ta.volatility.toFixed(2)}%`}
            signal={ta.volatility > 4 ? "Hoch" : ta.volatility > 2 ? "Mittel" : "Niedrig"}
            tone={ta.volatility > 4 ? "warn" : "neutral"}
            sub="Standardabweichung 20-Tage-Returns"
            icon={Activity}
          />
        </div>
      )}

      {/* Patterns */}
      {ta && ta.patterns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Erkannte Muster & Anomalien</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ta.patterns.map((p, i) => {
                const isBull = /bullish|höhere|unterstützung|überverkauft/i.test(p);
                const isBear = /bärisch|niedrigere|widerstand|überkauft/i.test(p);
                return (
                  <Badge
                    key={i}
                    variant="outline"
                    className={`text-xs ${isBull ? "border-bull/40 text-bull bg-bull/5" : isBear ? "border-bear/40 text-bear bg-bear/5" : ""}`}
                  >
                    {p}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IndicatorCard({
  label, value, signal, tone, sub, icon: Icon,
}: {
  label: string; value: string; signal: string; sub: string;
  tone: "bull" | "bear" | "warn" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide">{label}</div>
            <div className="mt-1 text-lg font-bold tabular-nums font-mono">{value}</div>
            <div className={`mt-0.5 text-xs font-semibold ${color}`}>{signal}</div>
          </div>
          <Icon className={`h-4 w-4 ${color} opacity-60`} />
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground leading-snug">{sub}</div>
      </CardContent>
    </Card>
  );
}
