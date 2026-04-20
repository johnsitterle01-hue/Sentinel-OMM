import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/format";
import type { NewsItem } from "@shared/schema";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Filter = "all" | "bullish" | "bearish" | "neutral";
type Impact = "all" | "high" | "medium" | "low";

export default function News() {
  const [filter, setFilter] = useState<Filter>("all");
  const [impact, setImpact] = useState<Impact>("all");

  const { data: news } = useQuery<NewsItem[]>({ queryKey: ["/api/news"], refetchInterval: 300000 });

  const filtered = (news ?? []).filter((n) =>
    (filter === "all" || n.sentiment === filter) &&
    (impact === "all" || n.impact === impact),
  );

  // Aggregate sentiment stats
  const stats = {
    bullish: (news ?? []).filter((n) => n.sentiment === "bullish").length,
    bearish: (news ?? []).filter((n) => n.sentiment === "bearish").length,
    neutral: (news ?? []).filter((n) => n.sentiment === "neutral").length,
  };

  const overallSentiment =
    stats.bullish > stats.bearish * 1.2 ? "bullisch" :
    stats.bearish > stats.bullish * 1.2 ? "bärisch" : "neutral";

  return (
    <div className="space-y-6">
      {/* Sentiment overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase font-semibold">Gesamt-Sentiment</div>
            <div className={`mt-1 text-xl font-bold capitalize ${
              overallSentiment === "bullisch" ? "text-bull" : overallSentiment === "bärisch" ? "text-bear" : "text-foreground"
            }`}>
              {overallSentiment}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{(news ?? []).length} Artikel</div>
          </CardContent>
        </Card>
        <SentimentBar label="Bullisch" value={stats.bullish} total={(news ?? []).length} tone="bull" icon={TrendingUp} />
        <SentimentBar label="Bärisch" value={stats.bearish} total={(news ?? []).length} tone="bear" icon={TrendingDown} />
        <SentimentBar label="Neutral" value={stats.neutral} total={(news ?? []).length} tone="neutral" icon={Minus} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 rounded-md bg-muted">
          {(["all", "bullish", "bearish", "neutral"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`filter-sentiment-${f}`}
              className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Alle" : f === "bullish" ? "Bullisch" : f === "bearish" ? "Bärisch" : "Neutral"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-md bg-muted">
          {(["all", "high", "medium", "low"] as Impact[]).map((f) => (
            <button
              key={f}
              onClick={() => setImpact(f)}
              data-testid={`filter-impact-${f}`}
              className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition-colors ${
                impact === f ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Alle Impacts" : f === "high" ? "Hoch" : f === "medium" ? "Mittel" : "Niedrig"}
            </button>
          ))}
        </div>
      </div>

      {/* News list */}
      <div className="space-y-3">
        {filtered.map((n) => <NewsCard key={n.id} n={n} />)}
        {!news && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        {news && filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            Keine Artikel mit diesen Filtern.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

function SentimentBar({ label, value, total, tone, icon: Icon }: {
  label: string; value: number; total: number;
  tone: "bull" | "bear" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pct = total ? (value / total) * 100 : 0;
  const color = tone === "bull" ? "bg-bull text-bull" : tone === "bear" ? "bg-bear text-bear" : "bg-muted-foreground text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
              <Icon className="h-3 w-3" /> {label}
            </div>
            <div className={`mt-1 text-2xl font-bold ${color.split(" ")[1]}`}>{value}</div>
          </div>
          <div className="text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</div>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className={color.split(" ")[0]} style={{ width: `${pct}%`, height: "100%" }} />
        </div>
      </CardContent>
    </Card>
  );
}

function NewsCard({ n }: { n: NewsItem }) {
  const sentimentColor =
    n.sentiment === "bullish" ? "border-l-bull" :
    n.sentiment === "bearish" ? "border-l-bear" : "border-l-muted-foreground";

  const impactBadge =
    n.impact === "high" ? "bg-bear/15 text-bear border-bear/30" :
    n.impact === "medium" ? "bg-amber-500/15 text-amber-600 dark:text-amber-500 border-amber-500/30" :
    "bg-muted text-muted-foreground";

  return (
    <a
      href={n.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
      data-testid={`news-card-${n.id}`}
    >
      <Card className={`border-l-4 ${sentimentColor} hover-elevate active-elevate-2 cursor-pointer`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <Badge variant="outline" className={`text-[10px] uppercase border ${impactBadge}`}>
                  {n.impact === "high" ? "High Impact" : n.impact === "medium" ? "Medium" : "Low"}
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize">{n.category}</Badge>
                {n.relatedSymbols.slice(0, 3).map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px] font-mono">{s}</Badge>
                ))}
              </div>
              <h3 className="text-sm font-semibold leading-snug">{n.title}</h3>
              {n.summary && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{n.summary}</p>}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="font-medium">{n.source}</span>
                <span>·</span>
                <span>{formatTimeAgo(n.publishedAt)}</span>
                <span>·</span>
                <span className={`font-semibold capitalize ${
                  n.sentiment === "bullish" ? "text-bull" : n.sentiment === "bearish" ? "text-bear" : ""
                }`}>
                  {n.sentiment} ({(n.sentimentScore * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
