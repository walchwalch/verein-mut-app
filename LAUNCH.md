# Fahrplan bis zum App Store – „Verein M.U.T.“

## Jetzt schon fertig
- Web-App zum Testen: https://spenden.mutig.app (auch „Zum Home-Bildschirm“ am iPhone möglich)
- Inhalte kommen automatisch alle 2 Stunden von verein-mut.eu (Projekte, Beiträge, Termine) und YouTube.
- Datenschutzseite: https://spenden.mutig.app/datenschutz/ · Support: https://spenden.mutig.app/support/
- Store-Texte: `store/app-store-texte.md`, Screenshots: `store/screenshots-6.9` und `store/screenshots-6.5`

## A) Instagram + Facebook freischalten (Meta Graph API) – nur lesen, nur eigene Seite
Voraussetzung: Instagram @verein_mut ist ein **Business- oder Creator-Konto** und mit der Facebook-Seite „VereinMUT.eu“ verknüpft
(Instagram-App → Einstellungen → Kontotyp und Tools → Professionelles Konto; dann in der Meta Business Suite verknüpfen).

1. developers.facebook.com → „Meine Apps“ → **App erstellen** → Anwendungsfall „Andere“ → Typ **Business** → Name z. B. „MUT App Feed“, Business-Portfolio des Vereins wählen.
2. In der App: Produkt **„Instagram Graph API“** (bzw. „Instagram“ → „API-Einrichtung mit Facebook-Login“) und **„Facebook Login for Business“** hinzufügen.
3. **Graph API Explorer** öffnen (Tools → Graph API Explorer), oben die neue App wählen, „User Token“, Berechtigungen anhaken:
   `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `instagram_basic`, `business_management` → „Generate Access Token“ → mit deinem Facebook-Konto (Admin der Seite) bestätigen und die Seite + Instagram-Konto auswählen.
4. Kurzlebigen Token in einen **langlebigen** tauschen: Tools → **Access Token Debugger** → Token einfügen → „Extend Access Token“.
5. Mit dem langlebigen Token im Graph API Explorer `me/accounts` abfragen → beim Eintrag der Vereinsseite steht ein `access_token` = **dauerhafter Seiten-Token** (läuft nicht ab, solange du Admin bleibst und das Passwort nicht änderst).
6. GitHub → Repo verein-mut-app → Settings → Secrets and variables → Actions → **New repository secret**: Name `META_PAGE_TOKEN`, Wert = Seiten-Token. (Nicht in den Chat kopieren.)
7. Actions → „Inhalte abholen und Web-App veröffentlichen“ → **Run workflow**. Danach erscheinen Instagram- und Facebook-Beiträge in der App.

Die Meta-App kann im **Entwicklungsmodus** bleiben – für die eigene Seite ist keine App-Prüfung durch Meta nötig. Es werden nur Beiträge der Vereinsseite gelesen, keine fremden Inhalte.

## B) TikTok (nur falls ein offizieller Kanal angelegt wird)
Derzeit ist auf der Homepage kein TikTok-Kanal verlinkt. Falls einer kommt: developers.tiktok.com → App mit „Login Kit“ + „Display API“ (Scopes `user.info.basic`, `video.list`), App-Prüfung durch TikTok nötig. Danach Secrets `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN` und Variable `TIKTOK_PROFILE_URL` eintragen.

## C) Nach Freigabe des Apple-Developer-Kontos des Vereins (Organisation)
1. **Domain umstellen** (vor dem Einreichen): Vereinsdomain festlegen, z. B. `app.verein-mut.eu` (CNAME auf walchwalch.github.io bzw. auf das künftige Vereins-Repo) und im Code ersetzen (siehe README → „Domain wechseln“). Ideal: Repo in eine GitHub-Organisation des Vereins übertragen.
2. **Identifier anlegen**: developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → App IDs → `at.vereinmut.app` (Capabilities: keine zusätzlichen nötig; Hintergrundaktualisierung braucht kein Capability).
3. **App in App Store Connect anlegen**: Name „Verein M.U.T.“, Sprache Deutsch, Bundle-ID `at.vereinmut.app`, SKU `vereinmut-app-1`.
4. **API-Schlüssel** für den automatischen Build: App Store Connect → Benutzer und Zugriff → Integrationen → App Store Connect API → Schlüssel mit Rolle „App Manager“ → .p8 herunterladen.
5. **GitHub-Secrets** im Repo eintragen (selbst eintragen): `APPLE_TEAM_ID` (Team-ID des Vereinskontos), `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (kompletter Inhalt der .p8-Datei).
6. Actions → „iOS-App bauen und zu App Store Connect hochladen“ → Run workflow → Build erscheint in TestFlight → am iPhone testen (Benachrichtigungen, Kalender, Offline).
7. **Store-Eintrag** ausfüllen mit `store/app-store-texte.md` und den Screenshots, App-Datenschutz: „Daten werden nicht erfasst“, Altersfreigabe 4+, Preis: Gratis.
8. **Händlerstatus (DSA)**: Bei einer Gratis-App ohne Werbung und ohne Käufe kann „kein Händler“ angegeben werden – Entscheidung liegt bei dir.
9. **Verträge**: Für Gratis-Apps reicht die Standardvereinbarung, keine Bank-/Steuerdaten nötig.
10. Einreichen (vorher mit Thomas abstimmen).
