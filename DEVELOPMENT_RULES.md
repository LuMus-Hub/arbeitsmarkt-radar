# Development Rules

## Sitzungsstart

1. Im Repository-Root arbeiten und zuerst `PROJECT_STATE.md`, `package.json`, den betroffenen Code sowie `git status --short --branch` prüfen.
2. Der aktuelle Code ist die maßgebliche Quelle. Dokumentation und frühere Chats dürfen ihm nicht widersprechen.
3. Vorhandene uncommittete Änderungen gehören dem Nutzer: nicht überschreiben, zurücksetzen oder ungefragt mitcommitten.

## Änderungsregeln

- Nur den beauftragten Umfang ändern; bestehende Funktionen und Designs außerhalb davon erhalten.
- Daten (`lib/market-data.ts`), Berechnung (`lib/scoring.ts`) und Darstellung getrennt halten.
- Score-Gewichtung, Demodaten, Routen oder Produktlogik nur auf ausdrücklichen Auftrag ändern.
- Demowerte immer als Demo kennzeichnen; keine simulierten Werte als Live-Daten darstellen.
- Keine Secrets, API-Schlüssel, Zugangsdaten oder `.env*`-Dateien committen. Externe Schlüssel gehören ausschließlich in ignorierte Umgebungsvariablen.
- Neue Abhängigkeiten, Datenbanken oder externe Dienste nur hinzufügen, wenn sie für den Auftrag nötig sind.

## Karten- und Intro-Invarianten

- Kartenkoordinaten immer als WGS84 `[longitude, latitude]` führen. Geografische Marker als MapLibre-Layer rendern; keine Pixelpositionen oder CSS-Transforms für ihre Verortung verwenden.
- Score-Updates über bestehende GeoJSON-Quellen/`setData` ausführen und die MapLibre-Instanz nicht unnötig neu erzeugen.
- Intro und interaktive Karte getrennt halten. Das Intro darf den MapLibre-Container, Marker oder geografische Daten nicht transformieren.
- `prefers-reduced-motion`, Tastaturbedienung, mobile Layouts und den SVG-Kartenfallback erhalten.

## Qualität und Git

- Änderungen mit `apply_patch` vornehmen und kompakt, typisiert sowie wiederverwendbar halten.
- Vor Übergabe mindestens `pnpm lint` und `pnpm build` ausführen. Neue eigenständige Logik nach Möglichkeit mit Tests und einem dokumentierten Test-Script absichern.
- Vor jedem Commit Diff und Status prüfen. Commits eng begrenzen und nur die beauftragten Dateien stagen.
- Kein Amend, Rebase, Reset, Force-Push oder Push ohne ausdrücklichen Auftrag.
- Build-Ausgaben, Abhängigkeiten, lokale Toolzustände und Umgebungsdateien bleiben unversioniert.
- `PROJECT_STATE.md` nur aktualisieren, wenn sich der aktuelle Aufbau, Funktionsumfang, Datenfluss oder die Befehle ändern; keine Historie oder Roadmap eintragen.

## Kommunikation

Nach größeren Schritten kurz berichten: **Entwicklungsstand**, **Meine nächsten To-dos**, **Entscheidungsalternativen** und **Nächster technischer Schritt**. Unter To-dos nur Punkte nennen, die tatsächlich eine Eingabe, Registrierung, Entscheidung oder einen Schlüssel des Nutzers erfordern.
