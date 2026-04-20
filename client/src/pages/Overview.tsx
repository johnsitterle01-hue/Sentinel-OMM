import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Zap, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { formatPrice, formatPct, formatTimeAgo, assetClassLabel } from "@/lib/format";
import type { Quote, NewsItem, TradeIdeaLive, CalendarEvent } from "@shared/schema";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertItem { id: string; title: string; detail: string; severity: string; timestamp: number; }

export default function Overview() {
  const { data: quotes } = useQuery<Quote[]>({ queryKey: ["/api/quotes"], refetchInterval: 30000 });
  const { data: news } = useQuery<NewsItem[]>({ queryKey: ["/api/news"], refetchInterval: 300000 });
  const { data: ideas } = useQuery<TradeIdeaLive[]>({ queryKey: ["/api/trade-ideas"], refetchInterval: 60000 });
  const { data: events } = useQuery<CalendarEvent[]>({ queryKey: ["/api/calendar"] });
  const { data: alerts } = useQuery<AlertItem[]>({ queryKey: ["/api/alerts"], refetchInterval: 60000 });

  const topMovers = (quotes ?? []).slice().sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 6);
  const topIdeas = (ideas ?? []).slice(0, 3);
  const highImpactNews = (() => {
    const all = news ?? [];
    const high = all.filter((n) => n.impact === "high");
    if (high.length >= 2) return high.slice(0, 4);
    // fallback to medium and high combined
    return all.filter((n) => n.impact !== "low").slice(0, 4).length >= 2
      ? all.filter((n) => n.impact !== "low").slice(0, 4)
      : all.slice(0, 4);
  })();
  const nextEvents = (events ?? []).slice().sort((a, b) => a.date - b.date).slice(0, 4);

  // Summary stats
  const gainers = (quotes ?? []).filter((q) => q.changePercent > 0).length;
  const losers = (quotes ?? []).filter((q) => q.changePercent < 0).length;
  const bullishNews = (news ?? []).filter((n) => n.sentiment === "bullish").length;
  const bearishNews = (news ?? []).filter((n) => n.sentiment === "bearish").length;
  const avgConf = topIdeas.length ? topIdeas.reduce((a, b) => a + b.confidence, 0) / topIdeas.length : 0;

  return (
    <div className="space-y-6">
      {/* Live ticker strip */}
      <div className="-mx-4 md:-mx-8 overflow-x-auto border-y border-border bg-card/40">
        <div className="flex gap-8 whitespace-nowrap px-4 md:px-8 py-2.5">
          {(quotes ?? []).map((q) => (
            <div key={q.symbol} className="flex items-center gap-2 text-xs" data-testid={`ticker-${q.symbol}`}>
              <span className="font-mono font-semibold text-foreground">{q.symbol}</span>
              <span className="text-muted-foreground">{formatPrice(q.price, q.assetClass)}</span>
              <span className={q.changePercent >= 0 ? "text-bull" : "text-bear"}>
                {formatPct(q.changePercent)}
              </span>
            </div>
          ))}
          {!quotes && <Skeleton className="h-4 w-full" />}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gewinner / Verlierer"
          primary={`${gainers} ↑ / ${losers} ↓`}
          hint={`${(quotes ?? []).length} Assets beobachtet`}
          accent={gainers >= losers ? "bull" : "bear"}
          icon={gainers >= losers ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="News-Sentiment"
          primary={`${bullishNews} ↑ / ${bearishNews} ↓`}
          hint={`${(news ?? []).length} Artikel analysiert`}
          accent={bullishNews >= bearishNews ? "bull" : "bear"}
          icon={Zap}
        />
        <StatCard
          label="Top-Idee Confidence"
          primary={avgConf ? `${Math.round(avgConf)}%` : "—"}
          hint="Ø der Top-3 KI-Ideen"
          accent="neutral"
          icon={Sparkline ? Zap : Zap}
        />
        <StatCard
          label="Aktive Alerts"
          primary={String((alerts ?? []).length)}
          hint={`${(alerts ?? []).filter((a) => a.severity === "critical").length} kritisch`}
          accent={((alerts ?? []).filter((a) => a.severity !== "info").length) > 0 ? "warn" : "neutral"}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Movers */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Top Bewegungen</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Größte prozentuale Veränderung deiner Watchlist</p>
            </div>
            <Link href="/markets" className="text-xs text-primary hover:underline flex items-center gap-1">
                Alle <ArrowUpRight className="h-3 w-3" />
              </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {topMovers.map((q) => (
                <MoverRow key={q.symbol} q={q} />
              ))}
              {!quotes && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3"><Skeleton className="h-8 w-full" /></div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Trade Ideas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">KI-Trade-Ideen</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Höchste Confidence</p>
            </div>
            <Link href="/ideas" className="text-xs text-primary hover:underline flex items-center gap-1">
                Alle <ArrowUpRight className="h-3 w-3" />
              </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {topIdeas.map((i) => (
              <MiniIdeaCard key={i.symbol} idea={i} />
            ))}
            {!ideas && Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High impact news */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">High-Impact News</CardTitle>
            <Link href="/news" className="text-xs text-primary hover:underline flex items-center gap-1">
                Alle <ArrowUpRight className="h-3 w-3" />
              </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {highImpactNews.map((n) => (
              <NewsRow key={n.id} n={n} />
            ))}
            {highImpactNews.length === 0 && news && (
              <p className="text-sm text-muted-foreground">Keine High-Impact-News aktuell.</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Nächste Events</CardTitle>
            <Link href="/calendar" className="text-xs text-primary hover:underline flex items-center gap-1">
                Alle <ArrowUpRight className="h-3 w-3" />
              </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextEvents.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label, primary, hint, accent, icon: Icon,
}: {
  label: string; primary: string; hint: string;
  accent: "bull" | "bear" | "neutral" | "warn";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color =
    accent === "bull" ? "text-bull" : accent === "bear" ? "text-bear" : accent === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className={`mt-1.5 text-xl font-bold tabular-nums ${color}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
              {primary}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
          </div>
          <div className={`h-9 w-9 rounded-md flex items-center justify-center bg-muted ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MoverRow({ q }: { q: Quote }) {
  const up = q.changePercent >= 0;
  // Fake sparkline data from current price band
  const spark = Array.from({ length: 20 }).map((_, i) => {
    const r = Math.sin(i * 0.4 + q.price) * (q.price * 0.005) + q.price;
    return r;
  });
  return (
    <Link href={`/analysis?symbol=${encodeURIComponent(q.symbol)}`} className="flex items-center justify-between px-4 py-3 hover-elevate active-elevate-2" data-testid={`row-mover-${q.symbol}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
            {q.symbol.replace(/-USD|\.DE|=X/g, "").slice(0, 4)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{q.displayName}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono">{q.symbol}</span>
              <span>·</span>
              <span>{assetClassLabel(q.assetClass)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:block w-20">
            <Sparkline data={spark} positive={up} height={30} />
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums font-mono">{formatPrice(q.price, q.assetClass)}</div>
            <div className={`text-xs font-mono tabular-nums ${up ? "text-bull" : "text-bear"}`}>
              {formatPct(q.changePercent)}
            </div>
          </div>
        </div>
      </Link>
  );
}

function MiniIdeaCard({ idea }: { idea: TradeIdeaLive }) {
  const long = idea.direction === "long";
  return (
    <Link href={`/ideas?symbol=${encodeURIComponent(idea.symbol)}`} className="block rounded-lg border border-card-border p-3 hover-elevate active-elevate-2" data-testid={`idea-card-${idea.symbol}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-sm">{idea.symbol}</span>
            <Badge variant={long ? "default" : "destructive"} className="h-5 text-[10px] font-semibold uppercase">
              {long ? "Long" : "Short"}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground leading-none mb-0.5">Confidence</div>
            <div className="text-sm font-bold tabular-nums">{idea.confidence}%</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <div className="text-muted-foreground">Entry</div>
            <div className="font-mono font-medium">{formatPrice(idea.entry, idea.assetClass)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">SL</div>
            <div className="font-mono font-medium text-bear">{formatPrice(idea.stopLoss, idea.assetClass)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">TP</div>
            <div className="font-mono font-medium text-bull">{formatPrice(idea.takeProfit, idea.assetClass)}</div>
          </div>
        </div>
      </Link>
  );
}

function NewsRow({ n }: { n: NewsItem }) {
  const sentColor = n.sentiment === "bullish" ? "text-bull" : n.sentiment === "bearish" ? "text-bear" : "text-muted-foreground";
  return (
    <a
      href={n.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md -mx-2 px-2 py-2 hover-elevate"
      data-testid={`news-row-${n.id}`}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.sentiment === "bullish" ? "bg-bull" : n.sentiment === "bearish" ? "bg-bear" : "bg-muted-foreground"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug line-clamp-2">{n.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{n.source}</span>
            <span>·</span>
            <span>{formatTimeAgo(n.publishedAt)}</span>
            <span>·</span>
            <span className={`${sentColor} font-medium capitalize`}>{n.sentiment}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

function EventRow({ e }: { e: CalendarEvent }) {
  const d = new Date(e.date);
  const impact = e.importance === "high" ? "bg-bear/15 text-bear" : e.importance === "medium" ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-start gap-3" data-testid={`event-${e.id}`}>
      <div className="w-14 shrink-0 text-center rounded-md border border-border py-1.5">
        <div className="text-[10px] uppercase font-semibold text-muted-foreground">{d.toLocaleDateString("de-DE", { month: "short" })}</div>
        <div className="text-base font-bold leading-none">{d.getDate()}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{e.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${impact}`}>{e.importance}</span>
          <span className="text-xs text-muted-foreground">{e.region}</span>
          {e.forecast && <span className="text-xs text-muted-foreground">· F: {e.forecast}</span>}
        </div>
      </div>
    </div>
  );
}
