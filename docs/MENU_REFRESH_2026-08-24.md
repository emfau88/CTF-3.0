# Core Arena menu refresh

Stand: 2026-08-24

## Ergebnis

Das bisherige Menü wurde durch ein gemeinsames, responsives **Arena-Twilight**-
System ersetzt. Die Änderung betrifft Hauptmenü, Eigenes Match, League HQ,
Einstellungen und Hilfe; das Gameplay-Rendering und die Desktop-Steuerung
bleiben getrennt davon.

## Umgesetzter Umfang

- Hauptmenü mit drei klar getrennten Einstiegen: League, Schnellstart und
  Eigenes Match. Die finale Fidelity-Schicht übernimmt die stärkere
  Mockup-Hierarchie mit großen Markenflächen, abgeschrägten Navigationskarten
  und einer zusammenhängenden Utility-Leiste.
- Drei eigens erzeugte ImageGen-Embleme ersetzen die generischen Startscreen-
  Glyphen. Karriere, Schnellstart und Eigenes Match haben jetzt klar
  unterscheidbare Motive mit echter Alpha-Transparenz und ohne helle Bildrahmen.
- Eigenes Match als vier Schritte: Modus, Arena, Teams und Übersicht.
- Auf Desktop bleibt eine live synchronisierte Match-Zusammenfassung in allen
  vier Schritten sichtbar; auf Mobile wird sie zugunsten der Übersicht
  ausgeblendet, während der vollständige vierte Prüfschritt erhalten bleibt.
- Vollständige Premium-Map-Vorschau mit `object-fit: contain`; keine Arena wird
  für die Vorschau abgeschnitten. Auf Desktop bleiben Zurück/Weiter und die
  Match-Zusammenfassung selbst bei 1366 × 768 ohne Seitenscrollen sichtbar.
- League HQ mit Match-Dossier, Kader, Tabelle sowie sichtbarem Proving-,
  Contender- und Apex-Pfad. Der nächste Gegner wird auf einer dynamischen
  Matchup-Bühne mit den echten Captain- und Gegnerporträts dargestellt. Nur der
  Proving Circuit ist als spielbar markiert. Matchentscheidung, Kader und
  Ligapfad passen auf Desktop gemeinsam in den ersten Viewport; Tabelle und
  tiefergehende Details dürfen bewusst darunter gescrollt werden.
- Zentrale DE/EN-Übersetzung für statische und dynamisch erzeugte Menütexte.
  Die Wahl wird in `localStorage` gespeichert und sofort angewendet.
- Gemeinsame Desktop-, Tablet-, Mobile-Portrait- und kompakte
  Mobile-Landscape-Regeln mit Safe-Area-Abständen.
- Vollbildsteuerung im Menü und in der oberen rechten Match-Utility-Leiste,
  sofern der Browser die Fullscreen API anbietet. Mobile Aktionsbuttons bleiben
  davon räumlich getrennt.
- Reproduzierbare Screenshot-Erzeugung über
  `scripts/capture-menu-refresh.mjs`; ein abweichender Zielordner kann über
  `CORE_ARENA_SCREENSHOT_DIR` gesetzt werden.
- Textfreier League-Bühnenhintergrund als 100-KB-WebP; alle variablen Inhalte,
  Übersetzungen und Kämpfer bleiben echtes HTML beziehungsweise vorhandene
  transparente Spielporträts.

## Visuelle Belege

- [Desktop-Hauptmenü](screenshots/menu-refresh-2026-08-24-v2/main-menu-desktop-de.png)
- [Eigenes Match: Arena](screenshots/menu-refresh-2026-08-24-v2/custom-match-arena-desktop-de.png)
- [League HQ](screenshots/menu-refresh-2026-08-24-v2/league-hq-desktop-de.png)
- [Mobile-Hauptmenü](screenshots/menu-refresh-2026-08-24-v2/main-menu-mobile-de.png)

Die finalen PNGs werden mit Playwright bei Device Scale Factor 1 direkt aus
dem laufenden lokalen Build aufgenommen. Dadurch enthalten sie keine
DPI-bedingten weißen Zusatzflächen.

## QA-Vertrag

Automatisiert geprüft werden:

- 1440 × 900 Desktop: DE/EN-Umschaltung, Main Menu, alle vier
  Custom-Match-Schritte, vollständige Arena-Vorschau, League-Einstieg,
  horizontaler Überlauf und echter Fullscreen-Status.
- 1366 × 768 Desktop: Arena-Schritt inklusive sichtbarer Navigation ohne
  vertikalen oder horizontalen Seitenüberlauf.
- 390 × 844 Touch-Portrait: Main Menu, alle vier Custom-Match-Schritte,
  kollisionsfreie Kopfzeile, horizontaler Überlauf und echter
  Fullscreen-Status.
- 844 × 390 Touch-Landscape: Helix Canopy in TDM, Classic CTF und One Flag,
  obere Utility-Leiste, korrekte v2-Map-Ressource und Vollbildschalter.
- Unit-/DOM-Tests für Übersetzungen, Map-Picker, Menüassets und
  Fullscreen-Zustandslogik.
- TypeScript-Test-Typecheck, Production-Build und die vollständige vorhandene
  Test-Suite.

Finaler Lauf am 2026-08-24: **223/223 Unit-/Integrations-/Simulationstests**,
Test-Typecheck, Production-Build und **10/10 Browser-E2E-Tests** bestanden. Die
einzige Build-Meldung ist die unten dokumentierte, bereits bekannte
Phaser-Chunk-Warnung.

## Ehrliche Grenzen

- Online-Multiplayer, Accounts und Cloud-Speicherung existieren nicht.
- Contender und Apex sind sichtbare Zielstufen, aber noch nicht spielbar.
- Matches bleiben auf Mobilgeräten für Landscape optimiert; Portrait ist für
  Menüs freigegeben.
- Automatisierte Touch- und SwiftShader-Tests ersetzen noch keine Abnahme auf
  mehreren realen Mobilgeräten.
- Das bekannte große Phaser-Produktionschunk erzeugt weiterhin eine
  Vite-Warnung. Der Build ist erfolgreich; Code-Splitting bleibt eine separate
  Performance-Aufgabe.
