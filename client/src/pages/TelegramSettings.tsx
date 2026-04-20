import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Send, Bell, Clock, TrendingUp, Newspaper, CalendarDays, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

interface AlertSettings {
  id: number;
  telegramBotToken: string;
  telegramChatId: string;
  enabled: boolean | number;
  minConfidence: number;
  sendSignals: boolean | number;
  sendHighImpactNews: boolean | number;
  sendUpcomingEvents: boolean | number;
  quietHoursStart: number;
  quietHoursEnd: number;
  checkIntervalMinutes: number;
  hasToken?: boolean;
}

export default function TelegramSettings() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AlertSettings>({ queryKey: ["/api/alert-settings"] });

  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState<string>("");
  const [initialized, setInitialized] = useState(false);

  // local state mirror for the toggles
  const [enabled, setEnabled] = useState(false);
  const [sendSignals, setSendSignals] = useState(true);
  const [sendNews, setSendNews] = useState(true);
  const [sendEvents, setSendEvents] = useState(true);
  const [minConfidence, setMinConfidence] = useState(65);
  const [quietStart, setQuietStart] = useState(23);
  const [quietEnd, setQuietEnd] = useState(7);
  const [interval, setInterval] = useState(15);

  if (data && !initialized) {
    setEnabled(!!data.enabled);
    setSendSignals(!!data.sendSignals);
    setSendNews(!!data.sendHighImpactNews);
    setSendEvents(!!data.sendUpcomingEvents);
    setMinConfidence(data.minConfidence ?? 65);
    setQuietStart(data.quietHoursStart ?? 23);
    setQuietEnd(data.quietHoursEnd ?? 7);
    setInterval(data.checkIntervalMinutes ?? 15);
    setChatId(data.telegramChatId ?? "");
    setInitialized(true);
  }

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      return apiRequest("PATCH", "/api/alert-settings", patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alert-settings"] });
      toast({ title: "Gespeichert" });
    },
    onError: (e: any) => toast({ title: "Fehler", description: String(e?.message || e), variant: "destructive" }),
  });

  const test = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/alert-settings/test", {});
      return r.json();
    },
    onSuccess: (r: any) => {
      if (r?.ok) toast({ title: "✓ Testnachricht gesendet", description: "Schau in dein Telegram." });
      else toast({ title: "Fehler", description: r?.error || "Unbekannt", variant: "destructive" });
    },
  });

  const scan = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/alert-settings/scan", {});
      return r.json();
    },
    onSuccess: (r: any) =>
      toast({
        title: `Scan abgeschlossen`,
        description: `${r.sent} gesendet · ${r.skipped} übersprungen${r.errors?.length ? ` · ${r.errors.length} Fehler` : ""}`,
      }),
  });

  const saveCreds = () => {
    const patch: Record<string, unknown> = {};
    if (token && !token.startsWith("•")) patch.telegramBotToken = token;
    patch.telegramChatId = chatId;
    save.mutate(patch);
    setToken("");
  };

  const saveRules = () => {
    save.mutate({
      enabled,
      sendSignals,
      sendHighImpactNews: sendNews,
      sendUpcomingEvents: sendEvents,
      minConfidence,
      quietHoursStart: quietStart,
      quietHoursEnd: quietEnd,
      checkIntervalMinutes: interval,
    });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Lade…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Status banner */}
      <Card className={enabled && data?.hasToken ? "border-bull/40 bg-bull/5" : "border-dashed"}>
        <CardContent className="p-5 flex items-center gap-4">
          {enabled && data?.hasToken ? (
            <CheckCircle2 className="h-6 w-6 text-bull shrink-0" />
          ) : (
            <XCircle className="h-6 w-6 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1">
            <div className="font-semibold">
              {enabled && data?.hasToken ? "Live-Alerts aktiv" : "Live-Alerts inaktiv"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {enabled && data?.hasToken
                ? `Sentinel scannt alle ${interval} Min deine Watchlist und sendet neue Signale an Telegram.`
                : "Verbinde deinen Telegram-Bot unten und aktiviere Alerts."}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => scan.mutate()} disabled={!enabled || !data?.hasToken || scan.isPending}>
            Jetzt scannen
          </Button>
        </CardContent>
      </Card>

      {/* Step-by-step setup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" /> Telegram-Bot verbinden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ol className="text-sm space-y-2 text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">1.</span> Öffne in Telegram den Kontakt{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                @BotFather <ExternalLink className="h-3 w-3" />
              </a>{" "}
              und sende <code className="px-1 py-0.5 rounded bg-muted text-foreground">/newbot</code>. Wähle einen Namen (z.B. „Sentinel Alerts") und einen eindeutigen Username (endet auf _bot).
            </li>
            <li>
              <span className="font-semibold text-foreground">2.</span> Du bekommst einen <b>Bot-Token</b> (sieht aus wie <code className="px-1 py-0.5 rounded bg-muted text-foreground">123456:ABC-DEF…</code>). Kopiere ihn.
            </li>
            <li>
              <span className="font-semibold text-foreground">3.</span> Schreibe deinem neuen Bot eine beliebige Nachricht („hi"), damit er antworten darf.
            </li>
            <li>
              <span className="font-semibold text-foreground">4.</span> Öffne{" "}
              <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                @userinfobot <ExternalLink className="h-3 w-3" />
              </a>{" "}
              und starte den Bot. Er zeigt dir deine <b>Chat-ID</b> (eine Zahl).
            </li>
            <li>
              <span className="font-semibold text-foreground">5.</span> Trage Token & Chat-ID hier ein und drücke „Speichern", dann „Test senden".
            </li>
          </ol>

          <div className="grid gap-3 pt-2">
            <div>
              <Label htmlFor="token" className="text-xs uppercase text-muted-foreground">Bot-Token</Label>
              <Input
                id="token"
                type="password"
                placeholder={data?.hasToken ? data.telegramBotToken : "123456:ABC-DEF…"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-1"
                data-testid="input-telegram-token"
              />
              {data?.hasToken && !token && (
                <p className="text-[11px] text-muted-foreground mt-1">Token gespeichert. Leer lassen, um nicht zu ändern.</p>
              )}
            </div>
            <div>
              <Label htmlFor="chatid" className="text-xs uppercase text-muted-foreground">Chat-ID</Label>
              <Input
                id="chatid"
                placeholder="z.B. 123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="mt-1"
                data-testid="input-telegram-chatid"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={saveCreds} disabled={save.isPending} data-testid="button-save-credentials">
                Speichern
              </Button>
              <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending || !data?.hasToken} data-testid="button-test-telegram">
                Test senden
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Was soll ich senden?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/30">
            <div className="flex items-start gap-3">
              <Bell className={`h-5 w-5 mt-0.5 ${enabled ? "text-bull" : "text-muted-foreground"}`} />
              <div>
                <div className="font-semibold text-sm">Alerts aktiviert</div>
                <div className="text-xs text-muted-foreground">Master-Schalter. Ohne das wird nichts gesendet.</div>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-enabled" />
          </div>

          <div className="space-y-3 pl-2">
            <ToggleRow icon={TrendingUp} label="Kauf- / Verkauf-Signale" hint="Bei jeder neuen KI-Empfehlung über deiner Confidence-Schwelle" checked={sendSignals} onChange={setSendSignals} />
            <ToggleRow icon={Newspaper} label="High-Impact News" hint="Wichtige Marktnews (Fed, Zinsen, Earnings, Geopolitik)" checked={sendNews} onChange={setSendNews} />
            <ToggleRow icon={CalendarDays} label="Events (nächste 24 h)" hint="Erinnerung an CPI, Zinsentscheidungen, große Earnings" checked={sendEvents} onChange={setSendEvents} />
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs uppercase text-muted-foreground">Mindest-Confidence: {minConfidence}%</Label>
            <Slider min={40} max={90} step={5} value={[minConfidence]} onValueChange={([v]) => setMinConfidence(v)} />
            <p className="text-[11px] text-muted-foreground">Nur Signale mit mindestens dieser Confidence senden. Höher = weniger, aber stärkere Signale.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Scan-Intervall: alle {interval} Min</Label>
            <Slider min={5} max={60} step={5} value={[interval]} onValueChange={([v]) => setInterval(v)} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Ruhezeiten</Label>
            <div className="flex items-center gap-3">
              <Input type="number" min={0} max={23} value={quietStart} onChange={(e) => setQuietStart(Number(e.target.value))} className="w-24" />
              <span className="text-muted-foreground text-sm">bis</span>
              <Input type="number" min={0} max={23} value={quietEnd} onChange={(e) => setQuietEnd(Number(e.target.value))} className="w-24" />
              <span className="text-xs text-muted-foreground">Uhr (keine Nachrichten)</span>
            </div>
          </div>

          <Button onClick={saveRules} disabled={save.isPending} className="w-full sm:w-auto" data-testid="button-save-rules">
            Regeln speichern
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, hint, checked, onChange }: {
  icon: any; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
