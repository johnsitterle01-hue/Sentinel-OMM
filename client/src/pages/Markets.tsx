import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, formatPct, formatVolume, assetClassLabel } from "@/lib/format";
import type { Quote, WatchlistItem } from "@shared/schema";
import { Link } from "wouter";
import { Trash2, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Filter = "all" | "stock" | "crypto" | "forex";

export default function Markets() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: quotes } = useQuery<Quote[]>({ queryKey: ["/api/quotes"], refetchInterval: 30000 });
  const { data: watchlist } = useQuery<WatchlistItem[]>({ queryKey: ["/api/watchlist"] });

  const removeMut = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/watchlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
  });

  const list = (quotes ?? []).filter((q) => filter === "all" || q.assetClass === filter);
  const idBySymbol: Record<string, number> = {};
  (watchlist ?? []).forEach((w) => (idBySymbol[w.symbol] = w.id));

  // Summary per asset class
  const byClass = ["stock", "crypto", "forex"].map((ac) => {
    const items = (quotes ?? []).filter((q) => q.assetClass === ac);
    const avg = items.length ? items.reduce((a, b) => a + b.changePercent, 0) / items.length : 0;
    return { ac, count: items.length, avg };
  });

  return (
    <div className="space-y-6">
      {/* Asset class summary */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {byClass.map((c) => (
          <Card key={c.ac}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase font-medium tracking-wide">
                {assetClassLabel(c.ac)}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold">{c.count}</span>
                <span className="text-xs text-muted-foreground">Assets</span>
              </div>
              <div className={`mt-0.5 text-sm font-medium ${c.avg >= 0 ? "text-bull" : "text-bear"}`}>
                Ø {formatPct(c.avg)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + add */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-md bg-muted">
          {(["all", "stock", "crypto", "forex"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`filter-${f}`}
              className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Alle" : assetClassLabel(f)}
            </button>
          ))}
        </div>
        <AddSymbolDialog />
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">Symbol</th>
                <th className="text-right font-semibold px-4 py-2.5">Kurs</th>
                <th className="text-right font-semibold px-4 py-2.5 hidden sm:table-cell">24h-Bereich</th>
                <th className="text-right font-semibold px-4 py-2.5">Veränd.</th>
                <th className="text-right font-semibold px-4 py-2.5 hidden md:table-cell">Volumen</th>
                <th className="text-right font-semibold px-4 py-2.5 w-24">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((q) => {
                const up = q.changePercent >= 0;
                return (
                  <tr key={q.symbol} className="hover:bg-muted/30" data-testid={`row-${q.symbol}`}>
                    <td className="px-4 py-3">
                      <Link href={`/analysis?symbol=${encodeURIComponent(q.symbol)}`} className="flex items-center gap-3 hover:text-primary">
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center font-mono text-[11px] font-bold">
                            {q.symbol.replace(/-USD|\.DE|=X/g, "").slice(0, 4)}
                          </div>
                          <div>
                            <div className="font-semibold">{q.displayName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="font-mono">{q.symbol}</span>
                              <Badge variant="outline" className="h-4 text-[9px] font-medium">
                                {assetClassLabel(q.assetClass)}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                      {formatPrice(q.price, q.assetClass)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground tabular-nums hidden sm:table-cell">
                      {q.low24h != null && q.high24h != null
                        ? `${formatPrice(q.low24h, q.assetClass)} – ${formatPrice(q.high24h, q.assetClass)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums ${up ? "text-bull" : "text-bear"}`}>
                        {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {formatPct(q.changePercent)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground tabular-nums hidden md:table-cell">
                      {formatVolume(q.volume)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {idBySymbol[q.symbol] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`button-remove-${q.symbol}`}
                          onClick={() => removeMut.mutate(idBySymbol[q.symbol])}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!quotes && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AddSymbolDialog() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [assetClass, setAssetClass] = useState<"stock" | "crypto" | "forex">("stock");

  const addMut = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/watchlist", { symbol, displayName, assetClass }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setOpen(false);
      setSymbol(""); setDisplayName("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-add-symbol">
          <Plus className="h-4 w-4 mr-1" /> Symbol
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Symbol hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Symbol (Yahoo Finance Ticker)</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="z.B. AAPL, BTC-USD, EURUSD=X"
              data-testid="input-symbol"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Krypto: BTC-USD · Forex: EURUSD=X · Deutsche Aktien: .DE-Suffix
            </p>
          </div>
          <div>
            <label className="text-xs font-medium">Anzeigename</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="z.B. Apple Inc." data-testid="input-name" />
          </div>
          <div>
            <label className="text-xs font-medium">Anlageklasse</label>
            <Select value={assetClass} onValueChange={(v) => setAssetClass(v as any)}>
              <SelectTrigger data-testid="select-asset-class"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Aktie</SelectItem>
                <SelectItem value="crypto">Krypto</SelectItem>
                <SelectItem value="forex">Forex</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button
            disabled={!symbol || !displayName || addMut.isPending}
            onClick={() => addMut.mutate()}
            data-testid="button-save-symbol"
          >
            {addMut.isPending ? "Speichern…" : "Hinzufügen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
