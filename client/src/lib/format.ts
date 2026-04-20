export function formatPrice(n: number | undefined | null, assetClass?: string): string {
  if (n == null || isNaN(n)) return "—";
  if (assetClass === "forex") return n.toFixed(4);
  if (Math.abs(n) >= 10000) return n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 100) return n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
  return n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

export function formatPct(n: number | undefined | null, withSign = true): string {
  if (n == null || isNaN(n)) return "—";
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatCurrency(n: number | undefined | null, currency = "EUR"): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { style: "currency", currency, maximumFractionDigits: 2 });
}

export function formatVolume(n: number | undefined | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d === 1 ? "" : "en"}`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function assetClassLabel(ac: string): string {
  return ac === "stock" ? "Aktie" : ac === "crypto" ? "Krypto" : ac === "forex" ? "Forex" : ac;
}
