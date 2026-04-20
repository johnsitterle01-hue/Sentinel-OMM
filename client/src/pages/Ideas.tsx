import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatPrice, assetClassLabel } from "@/lib/format";
import type { TradeIdeaLive } from "@shared/schema";
import { ArrowUpRight, ArrowDownRight, Bookmark, Target, Shield, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Ideas() {
  const { data: ideas } = useQuery<TradeIdeaLive[]>({ queryKey: ["/api/trade-ideas"], refetchInterval: 60000 });
  const { toast } = useToast();

  const saveMut = useMutation({
    mutationFn: async (idea: TradeIdeaLive) =>
      apiRequest("POST", "/api/saved-ideas", {
        symbol: idea.symbol,
        assetClass: idea.assetClass,
        direction: idea.direction,
        entry: idea.entry,
        stopLoss: idea.stopLoss,
        takeProfit: idea.takeProfit,
        confidence: idea.confidence,
        rationale: idea.rationale.join(" · "),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-ideas"] });
      toast({ title: "Trade-Idee gespeichert", description: "In deinen Favoriten verfügbar." });
    },
  });

  const longs = (ideas ?? []).filter((i) => i.direction === "long").length;
  const shorts = (ideas ?? []).filter((i) => i.direction === "short").length;
  const highConf = (ideas ?? []).filter((i) => i.confidence >= 70).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Long-Ideen</div>
            <div className="mt-1 text-2xl font-bold text-bull">{longs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Short-Ideen</div>
            <div className="mt-1 text-2xl font-bold text-bear">{shorts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Hohe Confidence</div>
            <div className="mt-1 text-2xl font-bold">{highConf}</div>
            <div className="text-[10px] text-muted-foreground">≥ 70%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(ideas ?? []).map((idea) => <IdeaCard key={idea.symbol} idea={idea} onSave={() => saveMut.mutate(idea)} />)}
        {!ideas && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
      </div>
    </div>
  );
}

function IdeaCard({ idea, onSave }: { idea: TradeIdeaLive; onSave: () => void }) {
  const long = idea.direction === "long";
  const color = long ? "bull" : "bear";
  const accentBg = long ? "bg-bull/5 border-bull/20" : "bg-bear/5 border-bear/20";

  return (
    <Card className={`${accentBg} border-2`} data-testid={`idea-${idea.symbol}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold">{idea.symbol}</span>
              <Badge variant="outline" className="text-[10px]">{assetClassLabel(idea.assetClass)}</Badge>
              <Badge className={`text-[10px] ${long ? "bg-bull/20 text-bull hover:bg-bull/20" : "bg-bear/20 text-bear hover:bg-bear/20"}`}>
                {long ? <><ArrowUpRight className="h-3 w-3 mr-0.5" /> Long</> : <><ArrowDownRight className="h-3 w-3 mr-0.5" /> Short</>}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{idea.displayName}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Confidence</div>
            <div className={`text-2xl font-bold text-${color}`}>{idea.confidence}%</div>
            <div className="w-16 mt-1"><Progress value={idea.confidence} /></div>
          </div>
        </div>

        {/* Levels */}
        <div className="grid grid-cols-3 gap-3 my-4 p-3 rounded-md bg-background/60 border border-border">
          <div>
            <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground font-semibold">
              <Target className="h-3 w-3" /> Entry
            </div>
            <div className="text-base font-bold tabular-nums font-mono mt-0.5">{formatPrice(idea.entry, idea.assetClass)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] uppercase text-bear font-semibold">
              <Shield className="h-3 w-3" /> Stop-Loss
            </div>
            <div className="text-base font-bold tabular-nums font-mono mt-0.5 text-bear">{formatPrice(idea.stopLoss, idea.assetClass)}</div>
            <div className="text-[10px] text-muted-foreground">
              {(Math.abs(idea.stopLoss - idea.entry) / idea.entry * 100).toFixed(1)}% Risiko
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] uppercase text-bull font-semibold">
              <TrendingUp className="h-3 w-3" /> Take-Profit
            </div>
            <div className="text-base font-bold tabular-nums font-mono mt-0.5 text-bull">{formatPrice(idea.takeProfit, idea.assetClass)}</div>
            <div className="text-[10px] text-muted-foreground">
              {(Math.abs(idea.takeProfit - idea.entry) / idea.entry * 100).toFixed(1)}% Gewinn
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-muted-foreground">
            R:R-Verhältnis <span className="font-mono font-bold text-foreground">1:{idea.riskRewardRatio.toFixed(2)}</span>
          </span>
          <span className="text-muted-foreground">
            Sentiment <span className={`capitalize font-semibold ${idea.sentiment === "bullish" ? "text-bull" : idea.sentiment === "bearish" ? "text-bear" : ""}`}>{idea.sentiment}</span>
          </span>
        </div>

        {/* Rationale */}
        <div className="space-y-1.5 mb-4">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold">KI-Begründung</div>
          <ul className="space-y-1">
            {idea.rationale.slice(0, 4).map((r, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <span className={`mt-1 h-1 w-1 rounded-full ${long ? "bg-bull" : "bg-bear"} shrink-0`} />
                <span className="text-foreground/90">{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 pt-3 border-t border-border">
          <Link href={`/analysis?symbol=${encodeURIComponent(idea.symbol)}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-${idea.symbol}`}>
              Analyse ansehen
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={onSave} data-testid={`button-save-${idea.symbol}`}>
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
