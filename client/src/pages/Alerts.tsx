import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/format";
import { AlertTriangle, Info, AlertCircle, BellRing } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertItem { id: string; title: string; detail: string; severity: string; timestamp: number; }

export default function Alerts() {
  const { data: alerts } = useQuery<AlertItem[]>({ queryKey: ["/api/alerts"], refetchInterval: 30000 });

  const critical = (alerts ?? []).filter((a) => a.severity === "critical").length;
  const warnings = (alerts ?? []).filter((a) => a.severity === "warning").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Kritisch
          </div>
          <div className="mt-1 text-2xl font-bold text-bear">{critical}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Warnung
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-500">{warnings}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1">
            <Info className="h-3 w-3" /> Info
          </div>
          <div className="mt-1 text-2xl font-bold">{(alerts ?? []).length - critical - warnings}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4" /> Echtzeit-Alerts
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Automatisch generiert aus Kurs­bewegungen und News. Aktualisiert alle 30 Sek.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(alerts ?? []).map((a) => {
            const Icon = a.severity === "critical" ? AlertTriangle : a.severity === "warning" ? AlertCircle : Info;
            const color =
              a.severity === "critical" ? "text-bear border-l-bear bg-bear/5" :
              a.severity === "warning" ? "text-amber-500 border-l-amber-500 bg-amber-500/5" :
              "text-foreground border-l-muted-foreground bg-muted/20";
            return (
              <div key={a.id} className={`flex items-start gap-3 p-3 rounded-md border-l-4 ${color}`} data-testid={`alert-${a.id}`}>
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {a.severity === "critical" ? "Kritisch" : a.severity === "warning" ? "Warnung" : "Info"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{formatTimeAgo(a.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {!alerts && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          {alerts && alerts.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Keine aktiven Alerts — alles ruhig.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
