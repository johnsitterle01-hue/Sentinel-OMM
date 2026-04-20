# Sentinel — KI-Trading-Assistent

Dein persönlicher Trading-Assistent mit Live-Empfehlungen per Telegram.

## 📱 Quickstart (vom Handy)

Komplette Anleitung in **DEPLOYMENT.md** lesen.

### Kurzversion

1. **GitHub-Account** anlegen: [github.com/signup](https://github.com/signup)
2. **Neues Repo** erstellen: [github.com/new](https://github.com/new) → Name: `sentinel` → **private** auswählen
3. **Alle Dateien aus dieser ZIP** (entpackt) in das Repo hochladen (Drag & Drop auf github.com)
4. **Railway** verbinden: [railway.com](https://railway.com) → Login with GitHub → „Deploy from GitHub repo" → Repo auswählen
5. Im Service → **Settings** → **Networking** → **Generate Domain**
6. Im Service → **Settings** → **Volumes** → **+ New Volume** → Mount Path: `/app`
7. Die Railway-URL auf dem Handy öffnen → **Telegram-Alerts** → Bot-Token & Chat-ID eintragen → Test senden → Alerts aktivieren
8. Als App installieren: Safari/Chrome → Teilen → „Zum Home-Bildschirm"

Fertig. Ab jetzt bekommst du Signale direkt in dein Telegram. 🎯

## Features

- 📡 **Live-Daten** — Aktien, Krypto, Forex (Yahoo Finance, CoinGecko)
- 🧠 **News & Sentiment** — RSS-Feeds (MarketWatch, CNBC, WSJ, Cointelegraph) mit Bullish/Bearish-Einstufung
- 📅 **Event-Kalender** — CPI, Zinsentscheidungen, Earnings
- 📊 **Technische Analyse** — RSI, MACD, SMA, Trend- und Mustererkennung
- 🤖 **KI-Empfehlungen** — Entry, Stop-Loss, Take-Profit, Confidence-Score mit Begründung
- ⚖️ **Risikomanagement** — Portfolio-KPIs, Diversifikations-Check
- 🔔 **Telegram-Alerts** — Live-Push auf dein Handy

## Stack

Express + Vite + React + Tailwind + shadcn/ui + Drizzle ORM (SQLite)

## Deployment

Das Dockerfile ist Railway-ready. Siehe **DEPLOYMENT.md**.

## Lizenz

Privat — keine Anlageberatung. Nutzung auf eigenes Risiko.
