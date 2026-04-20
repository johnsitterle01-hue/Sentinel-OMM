# Sentinel — Deployment auf Railway

Diese Anleitung bringt Sentinel permanent online (24/7), damit die Telegram-Alerts funktionieren.

## Was du brauchst
- Einen GitHub-Account (falls noch nicht vorhanden: https://github.com/signup)
- Einen Railway-Account (https://railway.com) — kostenloser Einstieg, danach $5/Monat
- Deine Telegram-Bot-Zugangsdaten (in der App unter **Telegram-Alerts** einrichten)

## Schritt-für-Schritt

### 1. Projekt auf GitHub laden

```bash
cd /home/user/workspace/trading-assistant
git init
git add .
git commit -m "Initial Sentinel"
# Neues Repo auf github.com anlegen, dann:
git remote add origin https://github.com/DEIN_USER/sentinel.git
git branch -M main
git push -u origin main
```

### 2. Auf Railway deployen

1. Öffne https://railway.com/new und klicke **„Deploy from GitHub repo"**
2. Wähle dein `sentinel`-Repo aus — Railway erkennt automatisch das `Dockerfile` und baut
3. Warte ~3 Min bis der Build durch ist
4. Oben rechts auf **„Generate Domain"** klicken → du bekommst eine `https://sentinel-xxxx.up.railway.app` URL

### 3. Persistentes Volume anlegen (für die Datenbank)

Ohne Volume ist die Watchlist nach jedem Neustart weg.

1. In deinem Service → **„Variables"** Tab → daneben **„Volumes"**
2. **„+ New Volume"** → Mount Path: `/app` (das ist das Arbeitsverzeichnis)
3. Service neu deployen

### 4. Telegram verbinden

1. Öffne deine Railway-URL im Browser
2. Gehe zu **Telegram-Alerts** (linkes Menü)
3. Folge der Schritt-Anleitung (BotFather, userinfobot)
4. Token + Chat-ID eintragen → **Speichern** → **Test senden**
5. Wenn die Testnachricht ankommt: **Alerts aktivieren** oben rechts → Regeln speichern

Ab jetzt scannt Sentinel alle X Minuten deine Watchlist und schickt neue KAUFEN/VERKAUFEN-Signale, High-Impact-News und Event-Erinnerungen direkt an dein Handy. 🎯

## Tipps

- **Als App aufs Handy:** Öffne deine Railway-URL in Safari/Chrome → „Zum Home-Bildschirm" → Sentinel startet wie eine native App.
- **Schwellen anpassen:** Wenn du zu viele Signale bekommst, erhöhe die Mindest-Confidence (z.B. 75%). Wenn zu wenige: senken auf 55%.
- **Ruhezeiten:** Standardmäßig 23–7 Uhr keine Nachrichten. Unter Telegram-Alerts anpassbar.
- **Kosten:** Railway Free-Tier reicht für leichten Traffic. Bei Dauerbetrieb ~$5/Monat.

## Alternativen

- **Render.com** — ähnlich wie Railway, auch Dockerfile-basiert
- **Fly.io** — kostenloser Tier für kleine Apps
- **Eigene VPS** (Hetzner, DigitalOcean) — ~3€/Monat, mehr Kontrolle
