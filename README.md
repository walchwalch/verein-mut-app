# Verein M.U.T. – App

Kostenlose App des Verein M.U.T. (Mensch Umwelt Tier): Projekte, Neuigkeiten, Termine, Mitmachen.
Läuft als **Web-App** unter https://spenden.mutig.app (zum Testen) und später als **iOS-App** (Capacitor).

## So funktioniert es
- `fetcher/` – Abholdienst. Holt alle 2 Stunden Projekte (Menü „Was macht MUT?“), Beiträge und Termine von verein-mut.eu (WordPress-Schnittstelle + iCal), YouTube (RSS), Facebook/Instagram (Meta Graph API, nur mit Secret) und TikTok (nur mit Secret) und schreibt `data/feed.json`. Bilder werden verkleinert mitgespeichert.
- `www/` – die App (HTML/CSS/JS, keine Fremd-Bibliotheken). Lädt nur `feed.json`.
- `site/` – Datenschutz- und Supportseite (für den App Store).
- `.github/workflows/pages.yml` – Zeitplan: abholen + veröffentlichen auf GitHub Pages.
- `.github/workflows/ios.yml` – iOS-Build (erst nach Freigabe des Vereins-Developer-Kontos).
- `.github/workflows/screenshots.yml` – App-Store-Screenshots von der Live-Version.

## Zugangsdaten
Nur als GitHub-Secrets (Settings → Secrets and variables → Actions), nie im Code: `META_PAGE_TOKEN` (+ optional `META_PAGE_ID`, `IG_USER_ID`), für TikTok `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN`, für den iOS-Build `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`.

## Domain wechseln (vor App-Store-Start)
`PUBLIC_URL` in `www/app.js`, `fetcher/config.mjs`, `www/runners/background.js`, `scripts/snapshot.mjs`, `PAGES_DOMAIN` in `scripts/build-site.mjs` und die URLs in `site/` + `store/app-store-texte.md`.

## Lokal testen
`node scripts/build-site.mjs dev/site && node dev/make-sample.mjs dev/site` und `dev/site` mit einem Webserver öffnen.
