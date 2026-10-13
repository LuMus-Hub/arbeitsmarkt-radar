# Project State

## Produkt

Der **Arbeitsmarkt Radar** ist ein responsiver Prototyp mit ausschließlich lokalen, klar gekennzeichneten Demodaten. Ein bearbeitbares Berufsprofil aktualisiert clientseitig Opportunity Scores, Deutschlandkarte, Regionen-Ranking und Regionsdetails. Nutzerkonten und Live-Jobdaten sind nicht angebunden. Profile können explizit über eine anonyme, cookiegebundene ID in Cloudflare D1 gespeichert und beim nächsten Besuch im selben Browser geladen werden. `/` und `/test` verwenden getrennte HttpOnly-Cookies und damit getrennte Profil-IDs.

## Aktuelle Oberfläche

- `/`: klassische Produktoberfläche mit Profilkonfiguration, Karte, Ranking und Regionsdetail.
- `/test`: zuerst ein Startscreen mit Kennzeichnung „Prototyp · simulierte Demodaten“; „Test starten“ öffnet dieselbe klassische `RadarApp` ohne CinematicIntro. Bei einem neuen Testprofil öffnet sich die vorhandene Profilbearbeitung automatisch und verlangt mindestens ein Tätigkeitsfeld sowie einen Skill. Gespeicherte Profile werden geladen und nicht überschrieben. Während des Tests kann „Neue Testperson“ das Testprofil serverseitig löschen und eine neue anonyme Testsitzung starten.
- `/design-minds` und die alternative Research-Darstellung wurden entfernt; die klassische Produktoberfläche ist die einzige Ansicht.
- Die klassische Ansicht besitzt ein scrollgesteuertes Intro aus Canvas, SVG und CSS. Es wird bei `prefers-reduced-motion` übersprungen und per `localStorage` höchstens einmal in 12 Stunden gezeigt.
- Die Topbar zeigt dynamisch das erste gewählte Tätigkeitsfeld und das Erfahrungslevel; ohne Tätigkeitsfeld erscheint eine neutrale Aufforderung. Profiländerungen aktualisieren den React-State sofort; Speichern und Laden erfolgen über `/api/profile`. Die normalen Profil-Defaults bleiben unverändert.
- `document.modelContext` registriert, sofern vom Host angeboten, das Tool `configure_job_profile`.

## Daten und Berechnung

- `lib/market-data.ts`: Profiltypen, Auswahloptionen und 12 Demoregionen mit WGS84-Koordinaten, Marktkennzahlen, Skill-Nachfrage, rollenspezifischer Nachfrage für fünf Tätigkeitsfelder, Arbeitgebern und Beispielstellen.
- `lib/scoring.ts`: deterministische, clientseitige Berechnung. Gewichtung: passende Stellen 40 %, Nachfrage 20 %, Trend 15 %, Gehalt 15 %, Arbeitsmarktlage 10 %. Skills und Tätigkeitsfelder bestimmen die Stellenpassung und -zahl; regionale Präferenzen geben bei deutschlandweiter Mobilität 3 Zusatzpunkte, ohne Mobilität erhalten bevorzugte Regionen 3 Punkte und andere Regionen einen Abschlag von 9 Punkten sowie eine reduzierte Stellenzahl. Scores werden auf 0–100 begrenzt.
- `public/germany-states.geojson`: lokale WGS84-Geometrien aller 16 Bundesländer.

## Karte

`components/opportunity-map.tsx` nutzt MapLibre GL. Bundesländer und Regionen werden als GeoJSON-Quellen mit nativen Fill-, Line-, Circle- und Symbol-Layern dargestellt. Score- oder Auswahländerungen aktualisieren die Quellen über `setData`, ohne die Karte neu zu erzeugen. Zoom, Pan, Hover, Bundesland-Fokus, Regionsauswahl und Reset sind implementiert. Für fehlendes WebGL existiert ein interaktiver SVG-Fallback mit derselben Koordinatenbasis.

## Technik und Struktur

- React 19, TypeScript 5.9, Next.js 16 API über Vinext, Vite 8 und pnpm 11.
- Tailwind CSS 4, gemeinsame Styles in `app/globals.css`, UI-Bausteine unter `components/ui`.
- Cloudflare-/Sites-Build mit D1-Binding `DB`. `db/schema.ts` definiert die `profiles`-Tabelle; Drizzle-Migrationen liegen unter `drizzle/`. `db/index.ts` stellt `getDb()` bereit. R2 ist nicht gebunden.
- Node.js `>=22.13.0`; TypeScript läuft im Strict-Modus.
- Es gibt derzeit keine automatisierten Tests und keinen `test`-Script.

## Befehle

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```
