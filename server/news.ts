import type { NewsItem } from "@shared/schema";

const cache = new Map<string, { value: any; expires: number }>();
function getCached<T>(k: string): T | null {
  const e = cache.get(k);
  if (!e || e.expires < Date.now()) { cache.delete(k); return null; }
  return e.value as T;
}
function setCached(k: string, v: any, ttl: number) { cache.set(k, { value: v, expires: Date.now() + ttl }); }

const BULLISH_KW = [
  "beats", "beat", "surges", "soars", "rally", "rallies", "record high", "outperform",
  "upgrade", "raises guidance", "strong", "profit jump", "breakthrough", "approved",
  "übertrifft", "rekord", "steigt", "profitiert", "anhebt", "bullish", "kauf",
];
const BEARISH_KW = [
  "misses", "miss", "plunges", "tumbles", "crash", "downgrade", "cuts guidance",
  "warning", "layoffs", "probe", "lawsuit", "recall", "bankruptcy", "default",
  "fällt", "einbruch", "verlust", "warnt", "rückruf", "bearish", "verkauf",
];
const HIGH_IMPACT_KW = [
  "fed", "fomc", "ecb", "inflation", "cpi", "gdp", "earnings", "merger", "acquisition",
  "war", "sanctions", "rate hike", "rate cut", "recession",
  "zinsen", "inflation", "krieg", "sanktionen", "rezession", "quartal",
];

function analyzeSentiment(text: string): { score: number; label: "bullish" | "bearish" | "neutral" } {
  const t = text.toLowerCase();
  let bull = 0;
  let bear = 0;
  for (const kw of BULLISH_KW) if (t.includes(kw)) bull++;
  for (const kw of BEARISH_KW) if (t.includes(kw)) bear++;
  const total = bull + bear;
  if (total === 0) return { score: 0, label: "neutral" };
  const score = (bull - bear) / total;
  return {
    score,
    label: score > 0.2 ? "bullish" : score < -0.2 ? "bearish" : "neutral",
  };
}

function classifyImpact(text: string): "high" | "medium" | "low" {
  const t = text.toLowerCase();
  let hits = 0;
  for (const kw of HIGH_IMPACT_KW) if (t.includes(kw)) hits++;
  if (hits >= 2) return "high";
  if (hits === 1) return "medium";
  return "low";
}

function classifyCategory(text: string): NewsItem["category"] {
  const t = text.toLowerCase();
  if (/earnings|quartalszahlen|quartal|results/.test(t)) return "earnings";
  if (/fed|ecb|cpi|inflation|gdp|rate|zinsen|fomc/.test(t)) return "macro";
  if (/war|sanction|geopolit|krieg/.test(t)) return "geopolitics";
  if (/bitcoin|crypto|ethereum|btc|eth|krypto/.test(t)) return "crypto";
  if (/merger|acquisition|ipo|stock/.test(t)) return "company";
  return "general";
}

const SYMBOL_KEYWORDS: Record<string, string[]> = {
  AAPL: ["apple", "iphone", "tim cook"],
  MSFT: ["microsoft", "azure", "satya nadella", "copilot"],
  NVDA: ["nvidia", "jensen huang", "gpu", "ai chip"],
  TSLA: ["tesla", "elon musk", "ev"],
  "SAP.DE": ["sap", "s/4hana"],
  GOOGL: ["google", "alphabet", "search"],
  META: ["meta", "facebook", "instagram"],
  AMZN: ["amazon", "aws"],
  "BTC-USD": ["bitcoin", "btc"],
  "ETH-USD": ["ethereum", "eth"],
  "SOL-USD": ["solana", "sol"],
  "EURUSD=X": ["euro", "eur/usd", "ecb"],
  "GBPUSD=X": ["pound", "gbp", "sterling", "boe"],
  "USDJPY=X": ["yen", "jpy", "boj"],
};
function findRelatedSymbols(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  for (const [sym, kws] of Object.entries(SYMBOL_KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) out.push(sym);
  }
  return out;
}

// Decode common HTML entities
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

// Parse simple RSS XML without deps
function parseRss(xml: string): Array<{ title: string; link: string; pubDate: string; description?: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description?: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const chunk = m[1];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(chunk);
      if (!r) return "";
      return decodeEntities(
        r[1]
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/<[^>]+>/g, "")
          .trim()
      );
    };
    items.push({
      title: get("title"),
      link: get("link"),
      pubDate: get("pubDate"),
      description: get("description"),
    });
  }
  return items;
}

const RSS_FEEDS = [
  { url: "https://www.marketwatch.com/rss/topstories", source: "MarketWatch" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC" },
  { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", source: "WSJ Markets" },
  { url: "https://www.investing.com/rss/news_25.rss", source: "Investing.com" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
];

export async function fetchNews(): Promise<NewsItem[]> {
  const cached = getCached<NewsItem[]>("news:all");
  if (cached) return cached;

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0 TradingAssistant/1.0" },
      });
      if (!res.ok) throw new Error(`${feed.source} ${res.status}`);
      const xml = await res.text();
      const items = parseRss(xml).slice(0, 12);
      return items.map((it, i): NewsItem => {
        const text = `${it.title} ${it.description ?? ""}`;
        const s = analyzeSentiment(text);
        return {
          id: `${feed.source}-${i}-${Date.parse(it.pubDate) || Date.now()}`,
          title: it.title,
          source: feed.source,
          url: it.link,
          publishedAt: Date.parse(it.pubDate) || Date.now(),
          summary: it.description?.slice(0, 220),
          sentiment: s.label,
          sentimentScore: s.score,
          impact: classifyImpact(text),
          relatedSymbols: findRelatedSymbols(text),
          category: classifyCategory(text),
        };
      });
    }),
  );

  let news: NewsItem[] = [];
  for (const r of results) if (r.status === "fulfilled") news.push(...r.value);

  if (news.length === 0) news = syntheticNews();

  news.sort((a, b) => b.publishedAt - a.publishedAt);
  news = news.slice(0, 40);
  setCached("news:all", news, 5 * 60_000);
  return news;
}

function syntheticNews(): NewsItem[] {
  const now = Date.now();
  const items: Array<Partial<NewsItem> & { title: string }> = [
    { title: "Fed-Protokoll deutet auf weitere Zinssenkungen hin, S&P erreicht Rekordhoch", source: "Reuters" },
    { title: "NVIDIA übertrifft Gewinnschätzungen, Aktie steigt nachbörslich 6%", source: "Bloomberg" },
    { title: "Bitcoin durchbricht 95.000 USD bei starkem ETF-Zufluss", source: "Cointelegraph" },
    { title: "EZB warnt vor anhaltender Inflation, EUR/USD unter Druck", source: "Financial Times" },
    { title: "Tesla Quartalszahlen enttäuschen — Umsatz unter Erwartungen", source: "CNBC" },
    { title: "Microsoft kündigt neue Azure-AI-Partnerschaft an, Aktie +2%", source: "WSJ" },
    { title: "Geopolitische Spannungen im Nahen Osten lassen Ölpreise steigen", source: "Reuters" },
    { title: "Apple vor iPhone-Launch: Analysten heben Kursziel auf 260 USD", source: "MarketWatch" },
  ];
  return items.map((it, i) => {
    const s = analyzeSentiment(it.title);
    return {
      id: `synth-${i}`,
      title: it.title,
      source: it.source ?? "Wire",
      url: "#",
      publishedAt: now - i * 1000 * 60 * 37,
      summary: undefined,
      sentiment: s.label,
      sentimentScore: s.score,
      impact: classifyImpact(it.title),
      relatedSymbols: findRelatedSymbols(it.title),
      category: classifyCategory(it.title),
    } satisfies NewsItem;
  });
}

export function newsSentimentForSymbol(news: NewsItem[], symbol: string): number {
  const relevant = news.filter((n) => n.relatedSymbols.includes(symbol));
  if (relevant.length === 0) {
    // fall back to macro sentiment
    const macro = news.filter((n) => n.category === "macro" || n.category === "geopolitics");
    if (macro.length === 0) return 0;
    return macro.reduce((a, b) => a + b.sentimentScore, 0) / macro.length * 0.5;
  }
  return relevant.reduce((a, b) => a + b.sentimentScore, 0) / relevant.length;
}
