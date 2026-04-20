import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPct, formatPrice, assetClassLabel } from "@/lib/format";
import type { Position, Quote, RiskMetrics, WatchlistItem } from "@shared/schema";
import { Plus, Trash2, AlertCircle, CheckCircle2, PieChart as PieIcon, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Portfolio() {
  const { data: positions } = useQuery<Position[]>({ queryKey: ["/api/positions"], refetchInterval: 30000 });
  const { data: quotes } = useQuery<Quote[]>({ queryKey: ["/api/quotes"], refetchInterval: 30000 });
  const { data: risk } = useQuery<RiskMetrics>({ queryKey: ["/api/risk"], refetchInterval: 30000 });

  const removeMut = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk"] });
    },
  });

  const quoteBySymbol: Record<string, Quote> = {};
  (quotes ?? []).forEach((q) => (quoteBySymbol[q.symbol] = q));

  const pieData = risk ? Object.entries(risk.diversification.byAssetClass)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: assetClassLabel(k), value: v, key: k })) : [];

  const COLORS = {
    stock: "hsl(var(--chart-3))",
    crypto: "hsl(var(--chart-4))",
    forex: "hsl(var(--chart-5))",
  };

  return (
    <div className="space-y-6">
      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Portfoliowert</div>
            <div className="mt-1 text-2xl font-bold tabular-nums font-mono">
              {risk ? formatCurrency(risk.totalValue, "USD") : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Gesamt-P&L</div>
            <div className={`mt-1 text-2xl font-bold tabular-nums font-mono ${
              (risk?.totalPnl ?? 0) >= 0 ? "text-bull" : "text-bear"
            }`} data-testid="text-total-pnl">
              {risk ? formatCurrency(risk.totalPnl, "USD") : "—"}
            </div>
            <div className={`text-xs font-semibold ${(risk?.totalPnlPercent ?? 0) >= 0 ? "text-bull" : "text-bear"}`}>
              {risk ? formatPct(risk.totalPnlPercent) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1">
              <Shield className="h-3 w-3" /> Max Risiko / Trade
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums font-mono">
              {risk ? formatCurrency(risk.maxRiskPerTrade, "USD") : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">1% Regel</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Konzentration</div>
            <div className={`mt-1 text-2xl font-bold capitalize ${
              risk?.diversification.concentration === "high" ? "text-bear" :
              risk?.diversification.concentration === "medium" ? "text-amber-500" : "text-bull"
            }`}>
              {risk?.diversification.concentration === "high" ? "Hoch" :
                risk?.diversification.concentration === "medium" ? "Mittel" : "Niedrig"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diversification Pie */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PieIcon className="h-4 w-4" /> Verteilung
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={(COLORS as any)[d.key] ?? "hsl(var(--muted))"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => `${v.toFixed(1)}%`}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--popover-border))",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {pieData.map((d) => (
                    <div key={d.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: (COLORS as any)[d.key] }} />
                        {d.name}
                      </div>
                      <span className="font-mono font-semibold">{d.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Noch keine Positionen
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Risiko-Empfehlungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(risk?.diversification.recommendations ?? []).map((r, i) => {
                const isPositive = /solide|weiter so/i.test(r);
                return (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-md bg-muted/30">
                    {isPositive ? (
                      <CheckCircle2 className="h-4 w-4 text-bull shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm text-foreground/90">{r}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions table */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between flex">
          <div>
            <CardTitle className="text-base">Positionen</CardTitle>
            <p className="text-xs text-muted-foreground">Aktuelle Holdings mit Live-P&L</p>
          </div>
          <AddPositionDialog />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Symbol</th>
                  <th className="text-right font-semibold px-4 py-2.5">Menge</th>
                  <th className="text-right font-semibold px-4 py-2.5 hidden sm:table-cell">Einstieg</th>
                  <th className="text-right font-semibold px-4 py-2.5">Aktuell</th>
                  <th className="text-right font-semibold px-4 py-2.5">P&L</th>
                  <th className="text-right font-semibold px-4 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(positions ?? []).map((p) => {
                  const q = quoteBySymbol[p.symbol];
                  const cur = q?.price ?? p.entryPrice;
                  const pnl = (cur - p.entryPrice) * p.quantity;
                  const pnlPct = ((cur - p.entryPrice) / p.entryPrice) * 100;
                  return (
                    <tr key={p.id} data-testid={`position-${p.symbol}`}>
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold">{p.symbol}</div>
                        <Badge variant="outline" className="text-[9px] mt-0.5">{assetClassLabel(p.assetClass)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{p.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                        {formatPrice(p.entryPrice, p.assetClass)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{formatPrice(cur, p.assetClass)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
                        <div>{formatCurrency(pnl, "USD")}</div>
                        <div className="text-xs">{formatPct(pnlPct)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMut.mutate(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {positions && positions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Noch keine Positionen — füge eine hinzu, um Risiko-Analyse zu starten.
                  </td></tr>
                )}
                {!positions && Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddPositionDialog() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [assetClass, setAssetClass] = useState<"stock" | "crypto" | "forex">("stock");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");

  const { data: watchlist } = useQuery<WatchlistItem[]>({ queryKey: ["/api/watchlist"] });

  const addMut = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/positions", {
        symbol, assetClass,
        quantity: Number(quantity),
        entryPrice: Number(entryPrice),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk"] });
      setOpen(false);
      setSymbol(""); setQuantity(""); setEntryPrice("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-add-position">
          <Plus className="h-4 w-4 mr-1" /> Position
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Position hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Symbol aus Watchlist</label>
            <Select value={symbol} onValueChange={(v) => {
              setSymbol(v);
              const w = watchlist?.find((x) => x.symbol === v);
              if (w) setAssetClass(w.assetClass as any);
            }}>
              <SelectTrigger data-testid="select-position-symbol"><SelectValue placeholder="Symbol wählen" /></SelectTrigger>
              <SelectContent>
                {(watchlist ?? []).map((w) => (
                  <SelectItem key={w.symbol} value={w.symbol}>
                    {w.symbol} — {w.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Menge</label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} data-testid="input-quantity" />
            </div>
            <div>
              <label className="text-xs font-medium">Einstiegspreis</label>
              <Input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} data-testid="input-entry" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button
            disabled={!symbol || !quantity || !entryPrice || addMut.isPending}
            onClick={() => addMut.mutate()}
            data-testid="button-save-position"
          >
            {addMut.isPending ? "Speichern…" : "Hinzufügen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
