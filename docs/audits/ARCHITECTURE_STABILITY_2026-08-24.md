# Core Arena — Architektur-, Stabilitäts- und Schärfecheck

Stand: 2026-08-24  
Geprüfter Branch: `codex/gameplay-fairness-helix` vor dem nächsten Commit

## Kurzurteil

**Gesamtzustand: stabil und praktisch wartbar (etwa 7/10).** Das Projekt ist
kein Pulverfass und braucht keinen Rewrite. Gameplay-Core, Phaser-Anbindung,
Map-Verträge und Tests bilden eine belastbare Basis. Die größten Risiken sind
bekannte, lokal begrenzte Wartungs-Hotspots in Menü, CSS und Phaser-UI sowie
Build-/Asset-Hygiene. Sie sollten inkrementell beim nächsten Eingriff in den
jeweiligen Bereich entschärft werden.

## Schärfe und Rendering

- Die drei neuen Hauptmenü-Embleme liegen als transparente 512 × 512 WebPs vor.
  Im geprüften Desktop-Viewport werden sie mit rund 125 px dargestellt
  (4,1-fache Quellreserve), mobil mit effektiv rund 58 px Breite
  (8,8-fache Quellreserve).
- Menü und Icons werden nicht über einen globalen CSS-Transform skaliert;
  `image-rendering: auto` ist korrekt. Desktop und Mobile zeigten keinen
  horizontalen Überlauf und keine weißen Bildrahmen.
- Desktop- und Mobile-Menühintergründe besitzen 1672 × 941 beziehungsweise
  853 × 1844 Pixel. Der Desktop-Hintergrund ist eher atmosphärisch weich als
  pixelig; Schrift, Vektorflächen und Icons bleiben davon unabhängig scharf.
- Das Phaser-Canvas verwendet derzeit ein Backing-Pixel pro CSS-Pixel. Das ist
  performant und auf normalen Displays sauber, kann aber auf echten
  High-DPI-Telefonen etwas weicher wirken. Eine auf etwa 1,25–1,5 begrenzte
  Renderauflösung wäre ein sinnvoller Geräteversuch, darf wegen der deutlich
  höheren GPU-Pixellast aber erst nach realem Mobile-Profiling aktiviert werden.

**Bewertung:** Das Menü ist scharf genug für Desktop und Mobile. Es besteht kein
Asset-Auflösungsfehler. Beim Gameplay ist High-DPI-Schärfe ein kontrollierter
Performance-Trade-off, kein akuter Defekt.

## Belastbare Basis

- TypeScript läuft mit `strict: true`; Tests und Scripts besitzen einen eigenen
  Typecheck. Im geprüften `src`/`tests`-Stand gibt es keine `@ts-ignore`,
  `@ts-nocheck`, `as any`, `TODO`, `FIXME` oder `HACK`-Marker.
- Der framework-neutrale Core enthält weder Phaser- noch DOM-/Storage-Zugriffe.
  `GameplayCoreRuntime` bleibt mit 325 Zeilen überschaubar; der kleine
  `PhaserGameBridge` verteilt Snapshots und Events über klar benannte Ports.
- Produktions-Build und Tree-Shaking funktionieren. Der 3459-zeilige
  Phaser-Smoke-Check wird trotz eines unnötigen Barrel-Exports nicht in den
  gebauten Browser-Chunk übernommen.
- 223 Unit-/Integrations-/Simulationschecks, Test-Typecheck und 10 Browser-E2E-
  Tests bestehen. Die CI installiert reproduzierbar mit `npm ci` und führt
  Tests, Typecheck, Build sowie Browser-Smokes vor dem Pages-Deploy aus.
- Map-, Landmark-, Team-, Bot- und Routenkonfigurationen besitzen explizite
  Verträge und Validierung. Das reduziert das Risiko stiller Contentfehler.

## Reale Wartungs-Hotspots

| Bereich | Befund | Risiko | Praktische Behandlung |
| --- | --- | --- | --- |
| Menücontroller | `v2Menu.ts` (1164 Zeilen) und `leagueMenu.ts` (1063) mischen DOM-Lesen, Events, Rendering und Navigation. | Mittel | Vor dem nächsten größeren Menüfeature je einen Controller/Renderer pro Screen herauslösen; kein Komplettumbau. |
| CSS-Kaskade | Fünf globale Stylesheets mit zusammen rund 5050 Zeilen werden nacheinander geladen; Refresh/Fidelity überschreiben ältere Regeln. | Mittel bis erhöht | Beim nächsten UI-Paket Menü, League, Gameplay-HUD und Legacy klar schichten; neue Overrides nicht weiter unten anhängen. |
| Phaser-UI | Mobile Input (1017 Zeilen) und Arena HUD (974) bündeln mehrere Subviews. | Mittel | Nur bei neuer Touch-/HUD-Arbeit Waffenbogen, Killfeed und Playerstatus einzeln auslagern. |
| Navigation | `GridBotNavigator.ts` hat 1097 Zeilen, bleibt aber fachlich kohärent: Grid, A*, Glättung, Jump-Links und Stuck-Recovery. | Niedrig bis mittel | Kein Godfile-Alarm; erst bei echter Änderung Pathfinding und Recovery trennen. |
| Smoke-/Diagnosetests | `PhaserGameBridge.smoke.ts` (3459) und mehrere Bot-Testdateien sind schwer zu navigieren. | Mittel für Änderungen, niedrig für Runtime | Nach Domänen splitten, sobald diese Tests wieder erweitert werden. Smoke-Export aus dem Produktions-Barrel entfernen. |
| Browser-Events | Main und Gameplay-Scene kommunizieren teilweise über frei benannte `CustomEvent`-Strings. | Niedrig bis mittel | Kleine typisierte Event-Fassade einführen, wenn der nächste Overlay-/HUD-Event hinzukommt. |
| Assets/Deployment | `public` umfasst rund 87,2 MB; der Build rund 89,3 MB. Alte und experimentelle Map-Varianten werden mit deployt, auch wenn sie nicht vorgeladen werden. | Mittel für Deploy/Repo, niedrig für Match-Laufzeit | Rückfallassets außerhalb von `public` archivieren; aktive Assets über Manifest/Preload selektiv halten. |
| CI-Auslösung | Der vollständige Workflow läuft bei Push auf `main`/`master`, aber nicht automatisch auf `pull_request`. | Mittel | Kleiner Workflow-Fix: PR-Trigger ergänzen, damit Fehler vor dem Merge sichtbar werden. |

## Abhängigkeiten und Sicherheit

`npm audit --omit=dev` meldet aktuell drei Befunde (ein niedriger, zwei hohe)
in Vite-Unterabhängigkeiten: esbuild, nanoid und PostCSS. Sie sind Build-/Dev-
Werkzeuge und nicht Teil des ausgelieferten Browser-Runtimes; damit besteht kein
akutes Spieler- oder Savegame-Risiko. Ein normaler `npm audit fix` kann die
betroffenen Lockfile-Versionen anheben und sollte als kleines eigenes
Wartungspaket mit anschließendem vollständigem Testlauf erfolgen.

## Empfohlene Reihenfolge

1. **Kleines Hygiene-Paket:** Dependency-Patches, PR-CI-Trigger und Smoke-Export
   aus dem Phaser-Barrel; danach alle bestehenden Gates.
2. **Beim nächsten Menüfeature:** `v2Menu`/`leagueMenu` screenweise entlasten und
   die CSS-Layer konsolidieren. Keine flächige Neuschreibung.
3. **Beim nächsten Mobile-/HUD-Feature:** nur den konkret berührten Subview aus
   den großen Phaser-Adaptern herauslösen.
4. **Vor größerem Release:** inaktive Master-/Pilot-Assets aus `public` in ein
   nicht deploytes Archiv verschieben; Rückfallmöglichkeit im Repository bleibt.
5. **Optionaler Geräteversuch:** Canvas-Resolution 1,25/1,5 auf echten
   High-DPI-Geräten gegen FPS, Frame-Pacing und Speicher messen.

Nicht empfohlen sind ein Enginewechsel, ein Core-Rewrite, ein neues UI-
Framework oder das vorsorgliche Zerteilen jeder größeren Datei. Die vorhandene
Architektur ist tragfähig; gezielte Entlastung an den genannten Nähten reicht.
