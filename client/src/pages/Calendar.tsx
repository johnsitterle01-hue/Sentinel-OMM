import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CalendarEvent } from "@shared/schema";
import { AlertTriangle, Briefcase, Calendar as CalendarIcon, Globe, LineChart, Percent, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Calendar() {
  const { data: events } = useQuery<CalendarEvent[]>({ queryKey: ["/api/calendar"] });

  // Group by day
  const byDay = new Map<string, CalendarEvent[]>();
  (events ?? [])
    .slice()
    .sort((a, b) => a.date - b.date)
    .forEach((e) => {
      const d = new Date(e.date);
      const key = d.toDateString();
      const arr = byDay.get(key) ?? [];
      arr.push(e);
      byDay.set(key, arr);
    });

  const highImpactCount = (events ?? []).filter((e) => e.importance === "high").length;
  const earningsCount = (events ?? []).filter((e) => e.category === "earnings").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Kommende Events</div>
            <div className="mt-1 text-2xl font-bold">{(events ?? []).length}</div>
            <div className="text-[10px] text-muted-foreground">nächste 14 Tage</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> High Impact
            </div>
            <div className="mt-1 text-2xl font-bold text-bear">{highImpactCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> Earnings
            </div>
            <div className="mt-1 text-2xl font-bold">{earningsCount}</div>
          </CardContent>
        </Card>
      </div>

      {!events && <Skeleton className="h-96 w-full" />}

      <div className="space-y-4">
        {Array.from(byDay.entries()).map(([day, list]) => (
          <DaySection key={day} day={day} events={list} />
        ))}
      </div>
    </div>
  );
}

function DaySection({ day, events }: { day: string; events: CalendarEvent[] }) {
  const d = new Date(day);
  const isToday = d.toDateString() === new Date().toDateString();
  const isPast = d < new Date(new Date().setHours(0,0,0,0));
  return (
    <div>
      <div className="flex items-center gap-3 mb-2 sticky top-16 bg-background/80 backdrop-blur py-2 -mx-4 md:-mx-8 px-4 md:px-8 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-wide">
            {d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
          </span>
          {isToday && <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px]">Heute</Badge>}
          {isPast && !isToday && <Badge variant="outline" className="text-[10px]">Vergangen</Badge>}
        </div>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{events.length} Event{events.length > 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-2">
        {events.map((e) => <EventRow key={e.id} e={e} />)}
      </div>
    </div>
  );
}

function EventRow({ e }: { e: CalendarEvent }) {
  const d = new Date(e.date);
  const impactColor =
    e.importance === "high" ? "border-l-bear bg-bear/5" :
    e.importance === "medium" ? "border-l-amber-500 bg-amber-500/5" :
    "border-l-muted-foreground";
  const Icon =
    e.category === "cpi" ? Percent :
    e.category === "rates" || e.category === "fomc" ? LineChart :
    e.category === "earnings" ? Briefcase :
    e.category === "gdp" || e.category === "jobs" ? TrendingUp :
    CalendarIcon;

  return (
    <Card className={`border-l-4 ${impactColor}`} data-testid={`calendar-event-${e.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 shrink-0 text-center">
            <div className="text-lg font-mono font-bold">{d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="text-[10px] uppercase text-muted-foreground">Uhr</div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{e.title}</h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className={`text-[10px] uppercase ${
                  e.importance === "high" ? "border-bear/40 text-bear" :
                  e.importance === "medium" ? "border-amber-500/40 text-amber-600 dark:text-amber-500" : ""
                }`}>
                  {e.importance === "high" ? "Hoch" : e.importance === "medium" ? "Mittel" : "Niedrig"}
                </Badge>
                <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                  <Globe className="h-2.5 w-2.5" /> {e.region}
                </Badge>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{e.expectedImpact}</p>

            {(e.forecast || e.previous) && (
              <div className="flex items-center gap-4 mt-2.5 text-xs">
                {e.forecast && (
                  <div>
                    <span className="text-muted-foreground">Prognose: </span>
                    <span className="font-mono font-semibold">{e.forecast}</span>
                  </div>
                )}
                {e.previous && (
                  <div>
                    <span className="text-muted-foreground">Vorher: </span>
                    <span className="font-mono font-semibold">{e.previous}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
