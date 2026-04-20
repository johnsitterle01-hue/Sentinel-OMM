import type { CalendarEvent } from "@shared/schema";

// Realistic economic calendar — generated from a deterministic template relative to "now".
// For true live data a paid API would be required (e.g. TradingEconomics, ForexFactory).
export function getCalendarEvents(): CalendarEvent[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const template: Array<Omit<CalendarEvent, "id" | "date"> & { offsetDays: number; hour: number }> = [
    {
      title: "US CPI (Verbraucherpreisindex) m/m",
      category: "cpi",
      region: "USA",
      importance: "high",
      forecast: "0.2%",
      previous: "0.3%",
      expectedImpact: "Hoher Einfluss auf USD, Treasuries & Gold. Überraschung nach oben = bärisch für Aktien.",
      offsetDays: 2,
      hour: 14,
    },
    {
      title: "Fed Funds Rate Entscheidung",
      category: "rates",
      region: "USA",
      importance: "high",
      forecast: "4.25%",
      previous: "4.50%",
      expectedImpact: "Zinssenkung erwartet. Dovish Fed = bullisch für Risk-Assets.",
      offsetDays: 8,
      hour: 20,
    },
    {
      title: "EZB Hauptrefinanzierungssatz",
      category: "rates",
      region: "Eurozone",
      importance: "high",
      forecast: "2.50%",
      previous: "2.75%",
      expectedImpact: "Entscheidet EUR/USD-Richtung. Dovish = EUR schwächer.",
      offsetDays: 5,
      hour: 14,
    },
    {
      title: "NVIDIA Q1 Earnings",
      category: "earnings",
      region: "USA",
      importance: "high",
      forecast: "EPS $0.89",
      previous: "EPS $0.81",
      expectedImpact: "Marktführer AI — setzt Ton für gesamten Tech-Sektor.",
      offsetDays: 3,
      hour: 22,
    },
    {
      title: "Apple Q2 Earnings",
      category: "earnings",
      region: "USA",
      importance: "high",
      forecast: "EPS $1.62",
      previous: "EPS $1.53",
      expectedImpact: "iPhone-Verkäufe & China-Geschäft im Fokus.",
      offsetDays: 10,
      hour: 22,
    },
    {
      title: "US Non-Farm Payrolls",
      category: "jobs",
      region: "USA",
      importance: "high",
      forecast: "185k",
      previous: "227k",
      expectedImpact: "Starke Daten = weniger Zinssenkungen = USD bullisch.",
      offsetDays: 4,
      hour: 14,
    },
    {
      title: "US BIP Q1 Preliminary",
      category: "gdp",
      region: "USA",
      importance: "medium",
      forecast: "2.1%",
      previous: "2.4%",
      expectedImpact: "Schwache Daten erhöhen Rezessionssorgen.",
      offsetDays: 7,
      hour: 14,
    },
    {
      title: "Deutsche Inflationsrate (vorläufig)",
      category: "cpi",
      region: "Deutschland",
      importance: "medium",
      forecast: "2.2%",
      previous: "2.3%",
      expectedImpact: "Signal für EZB-Politik.",
      offsetDays: 1,
      hour: 10,
    },
    {
      title: "Microsoft Q3 Earnings",
      category: "earnings",
      region: "USA",
      importance: "high",
      forecast: "EPS $3.12",
      previous: "EPS $2.95",
      expectedImpact: "Azure & Copilot-Wachstum sind Hauptfokus.",
      offsetDays: 6,
      hour: 22,
    },
    {
      title: "Tesla Q1 Earnings",
      category: "earnings",
      region: "USA",
      importance: "high",
      forecast: "EPS $0.55",
      previous: "EPS $0.41",
      expectedImpact: "Margen & Auslieferungszahlen im Blick.",
      offsetDays: 11,
      hour: 22,
    },
    {
      title: "FOMC Meeting Minutes",
      category: "fomc",
      region: "USA",
      importance: "medium",
      forecast: "—",
      previous: "—",
      expectedImpact: "Einblick in Fed-Diskussion zur Zinspolitik.",
      offsetDays: 14,
      hour: 20,
    },
    {
      title: "China BIP q/q",
      category: "gdp",
      region: "China",
      importance: "medium",
      forecast: "4.8%",
      previous: "5.3%",
      expectedImpact: "Wachstumsdynamik beeinflusst Rohstoffe & Krypto.",
      offsetDays: 9,
      hour: 4,
    },
    {
      title: "UK Inflation (CPI)",
      category: "cpi",
      region: "UK",
      importance: "medium",
      forecast: "2.4%",
      previous: "2.6%",
      expectedImpact: "Steuert BoE-Zinspfad, GBP/USD-Volatilität.",
      offsetDays: 12,
      hour: 7,
    },
  ];

  const baseDate = new Date(now);
  baseDate.setHours(0, 0, 0, 0);

  return template.map((t, i) => {
    const d = new Date(baseDate.getTime() + t.offsetDays * day);
    d.setHours(t.hour, 0, 0, 0);
    return {
      id: `evt-${i}`,
      title: t.title,
      date: d.getTime(),
      category: t.category,
      region: t.region,
      importance: t.importance,
      forecast: t.forecast,
      previous: t.previous,
      expectedImpact: t.expectedImpact,
    };
  });
}
