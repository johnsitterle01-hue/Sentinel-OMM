// Telegram Bot client - sends trade signal alerts to user's Telegram chat
// Uses HTTPS directly, no external deps. Token + chat_id come from DB settings.

import type { TradeIdeaLive, Quote, NewsItem, CalendarEvent } from "@shared/schema";

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

function escapeMarkdown(s: string): string {
  // Telegram MarkdownV2 requires escaping these chars
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export async function sendTelegramMessage(
  cfg: TelegramConfig,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.botToken || !cfg.chatId) return { ok: false, error: "Bot nicht konfiguriert" };
  try {
    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !(body as any).ok) {
      return { ok: false, error: (body as any).description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function formatPrice(n: number, assetClass?: string): string {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  if (assetClass === "forex") return n.toFixed(4);
  if (assetClass === "crypto" && n < 10) return n.toFixed(4);
  return n.toFixed(2);
}

export function formatSignalMessage(
  idea: TradeIdeaLive,
  quote?: Quote,
): string {
  const emoji = idea.direction === "long" ? "🟢" : "🔴";
  const label = idea.direction === "long" ? "KAUFEN (LONG)" : "VERKAUFEN (SHORT)";
  const name = idea.displayName || quote?.displayName || idea.symbol;
  const ac = idea.assetClass || quote?.assetClass;

  const lines: string[] = [];
  lines.push(`${emoji} *${escapeMarkdown(label)}*`);
  lines.push(`*${escapeMarkdown(name)}* \\(${escapeMarkdown(idea.symbol)}\\)`);
  lines.push("");
  lines.push(`📍 Entry:   \`${escapeMarkdown(formatPrice(idea.entry, ac))}\``);
  lines.push(`🛑 SL:      \`${escapeMarkdown(formatPrice(idea.stopLoss, ac))}\``);
  lines.push(`🎯 TP:      \`${escapeMarkdown(formatPrice(idea.takeProfit, ac))}\``);
  if (typeof idea.riskRewardRatio === "number") {
    lines.push(`⚖️  CRV:     ${escapeMarkdown(idea.riskRewardRatio.toFixed(2))} : 1`);
  }
  lines.push(`📊 Confidence: *${escapeMarkdown(Math.round(idea.confidence).toString())}%*`);

  if (Array.isArray(idea.rationale) && idea.rationale.length > 0) {
    lines.push("");
    lines.push("*Begründung:*");
    for (const r of idea.rationale.slice(0, 4)) {
      lines.push(`• ${escapeMarkdown(r)}`);
    }
  }

  lines.push("");
  lines.push("_Keine Anlageberatung \\- bitte eigene Prüfung_");

  return lines.join("\n");
}

export function formatNewsAlert(item: NewsItem): string {
  const sentEmoji = item.sentiment === "bullish" ? "🟢" : item.sentiment === "bearish" ? "🔴" : "⚪";
  const impactEmoji = item.impact === "high" ? "🚨" : item.impact === "medium" ? "⚠️" : "ℹ️";
  const lines: string[] = [];
  lines.push(`${impactEmoji} *High\\-Impact News*`);
  lines.push(`${sentEmoji} ${escapeMarkdown(item.sentiment.toUpperCase())}`);
  lines.push("");
  lines.push(`*${escapeMarkdown(item.title)}*`);
  lines.push("");
  lines.push(`_${escapeMarkdown(item.source)}_`);
  if (Array.isArray(item.relatedSymbols) && item.relatedSymbols.length > 0) {
    lines.push(`Betrifft: ${item.relatedSymbols.map((s) => `\`${escapeMarkdown(s)}\``).join(" · ")}`);
  }
  return lines.join("\n");
}

export function formatEventAlert(ev: CalendarEvent): string {
  const impactEmoji = ev.importance === "high" ? "🚨" : ev.importance === "medium" ? "⚠️" : "ℹ️";
  const when = new Date(ev.date).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const lines: string[] = [];
  lines.push(`📅 *Event in Kürze*`);
  lines.push(`${impactEmoji} ${escapeMarkdown(ev.importance.toUpperCase())}`);
  lines.push("");
  lines.push(`*${escapeMarkdown(ev.title)}*`);
  lines.push(`🌍 ${escapeMarkdown(ev.region)}`);
  lines.push(`🕒 ${escapeMarkdown(when)}`);
  if (ev.forecast) lines.push(`📈 Prognose: ${escapeMarkdown(ev.forecast)}`);
  if (ev.previous) lines.push(`📊 Zuvor: ${escapeMarkdown(ev.previous)}`);
  if (ev.expectedImpact) lines.push(`💥 Erwartung: ${escapeMarkdown(ev.expectedImpact)}`);
  return lines.join("\n");
}

export function formatTestMessage(): string {
  return [
    "✅ *Sentinel verbunden*",
    "",
    "Dein Handy empfängt jetzt Live\\-Signale\\.",
    "",
    "_Du kannst jederzeit in den Einstellungen anpassen, welche Alerts du erhalten willst\\._",
  ].join("\n");
}
