# Phase 0: Technische und visuelle Baseline

Stand: 2026-08-05

Projekt: Core Arena / CTF-3.0

Branch: `main`

Commit: `cd661f66e11bc2c81310d121a917859dafe928e1`

Working Tree bei der Aufnahme: **dirty** (vorhandene, nicht zu Phase 0 gehörende Arbeiten; siehe `wip-before-phase-0.txt`)

## Zweck

Diese Baseline hält den Zustand vor den geplanten Verbesserungen nachvollziehbar fest. Sie ist kein Pixel-Golden-Test und keine Freigabe der Karten. Sie beantwortet drei Fragen:

1. Bauen und testen die vorhandenen Systeme sauber?
2. Wie sehen die drei Premium-Maps im echten Gameplay bei drei relevanten Viewports aus?
3. Stimmen sichtbare Architektur, Collider und Clearance in repräsentativen Ansichten plausibel überein?

## Technische Gates

| Gate | Ergebnis |
| --- | --- |
| `npm.cmd test` | **grün**, 198/198 Tests |
| `npm.cmd run test:typecheck` | **grün** |
| `npm.cmd run build` | **grün** |
| Browserdiagnostik während der 18 Captures | **0** Console Errors, Page Errors oder fehlgeschlagene Requests |

Der Build meldet weiterhin den bekannten Größenhinweis für `phaserBootstrap-C7PARBGP.js` (ca. 1.451 kB, gzip ca. 399 kB; Vite-Warnschwelle 500 kB). Das ist kein Phase-0-Blocker, sollte aber separat als Ladezeit-/Bundle-Thema behandelt werden.

## Aufnahmevertrag

- Modus: Classic CTF
- Teams: 2 gegen 2, Gegner Bots
- Steuerung: Tastatur
- Sound: aus
- Gameplay vor jedem Screenshot deterministisch pausiert
- Format: JPEG, Qualität 86
- Viewports: 1024×768, 1280×720 und 1920×1080
- Pro Map: Übersicht, drei Gameplay-Ansichten, Collision-Debug und Clearance-Heatmap

Die vollständigen URLs, Dateigrößen und SHA-256-Hashes stehen in [`manifest.json`](manifest.json). Insgesamt wurden 18 Bilder mit 4.517.493 Bytes erzeugt.

## Screenshot-Matrix

| Map | Übersicht | Gameplay | Diagnose |
| --- | --- | --- | --- |
| Helix Canopy | [1280×720](screenshots/helix-canopy/overview-1280x720.jpg) | [1024×768](screenshots/helix-canopy/gameplay-1024x768.jpg) · [1280×720](screenshots/helix-canopy/gameplay-1280x720.jpg) · [1920×1080](screenshots/helix-canopy/gameplay-1920x1080.jpg) | [Collision](screenshots/helix-canopy/collision-1280x720.jpg) · [Clearance](screenshots/helix-canopy/clearance-heatmap-1280x720.jpg) |
| Temple of the Drowned Sun | [1280×720](screenshots/drowned-sun-temple/overview-1280x720.jpg) | [1024×768](screenshots/drowned-sun-temple/gameplay-1024x768.jpg) · [1280×720](screenshots/drowned-sun-temple/gameplay-1280x720.jpg) · [1920×1080](screenshots/drowned-sun-temple/gameplay-1920x1080.jpg) | [Collision](screenshots/drowned-sun-temple/collision-1280x720.jpg) · [Clearance](screenshots/drowned-sun-temple/clearance-heatmap-1280x720.jpg) |
| Foundry Circuit | [1280×720](screenshots/foundry-circuit/overview-1280x720.jpg) | [1024×768](screenshots/foundry-circuit/gameplay-1024x768.jpg) · [1280×720](screenshots/foundry-circuit/gameplay-1280x720.jpg) · [1920×1080](screenshots/foundry-circuit/gameplay-1920x1080.jpg) | [Collision](screenshots/foundry-circuit/collision-1280x720.jpg) · [Clearance](screenshots/foundry-circuit/clearance-heatmap-1280x720.jpg) |

## Befunde

### P1 – Helix zeigt den vermuteten Bild-/Welt-Konflikt real im Gameplay

Der in der Fremdanalyse berechnete Proportionskonflikt ist nicht nur theoretisch. In allen drei Gameplay-Viewports ist an der linken Weltseite ein unbemalter dunkler Streifen sichtbar. Der Collision-Debug zeigt zugleich weiterlaufende Welt- und Kollisionsgeometrie. Damit ist die Aussage, dass unverzerrtes Masterbild und Weltbreite derzeit nicht deckungsgleich sein können, **bestätigt**.

Die Helix-Collider folgen den Pflanzeninseln im Überblick überwiegend plausibel. Die organischen Kanten werden jedoch sichtbar durch mehrere AABBs angenähert. Das bestätigt das strukturelle Registrierungsrisiko, beweist aber noch keine flächendeckenden Fehlkollisionen. Dafür braucht Phase 1 feste Landmarken und kontrollierte Lauf-/Projektilproben.

### P2 – Diagnose-Overlays sind als Prüfwerkzeug nur eingeschränkt lesbar

Collision- und Clearance-Legende werden bei 1280×720 durch HUD-Flächen überlagert beziehungsweise abgeschnitten. Labels am Viewportrand sind teilweise nicht vollständig sichtbar. Die Messdaten funktionieren, aber die Darstellung erschwert die schnelle Sichtprüfung.

### P3 – Die Übersichtsroute richtet die Karte oben statt mittig aus

Bei den breiten Temple- und Foundry-Mastern bleibt der ungenutzte vertikale Raum in `mapPreview=1` vollständig unterhalb der Karte. Das betrifft die QA-Übersicht, nicht die normale Gameplay-Kamera. Für belastbare Vorher-/Nachher-Übersichten sollte die Preview-Kamera die Karte zentrieren oder den Frame auf das tatsächliche Kartenformat zuschneiden.

### Positiver Befund – Temple und Foundry registrieren im Stichprobenbild sauber

Bei Temple und Foundry ist in den normalen Aufnahmen kein globaler Master-/Weltversatz sichtbar. Die eingeblendeten Collider liegen in den geprüften Ausschnitten plausibel auf den sichtbaren Deckungsobjekten. Das stützt die Fremdanalyse, dass ihr Hauptproblem nicht dieselbe Proportionsabweichung wie bei Helix ist. Es ersetzt noch keine semantische Landmarkenprüfung.

## Was diese Baseline noch nicht beweist

- subjektives Bewegungs-, Waffen- und Treffergefühl
- Audiomix und Feedback unter Last
- visuelle Kollisionslesbarkeit an jeder einzelnen Landmarke
- vollständige Match-Flows in allen Modi und Teamgrößen
- Bot-Verhalten, Fairness und Objective-Fortschritt über längere Matches

Diese Punkte werden nicht aus Standbildern abgeleitet, sondern in den folgenden Phasen mit gezielten Laufwegen, Projektilproben und reproduzierbaren Match-Audits geprüft.

## Reproduktion

Im Projektroot:

```powershell
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 5188
node scripts/capture-phase-0-baseline.mjs docs/qa/phase-0-2026-08-05
```

Optional kann die Basis-URL über `CTF_BASE_URL` gesetzt werden. Das Skript bricht ab, sobald ein Capture Console Errors, Page Errors oder fehlgeschlagene Requests erzeugt.

## Baseline-Regel

Die Bilder werden nur bei einer bewussten Änderung an Map-Master, Weltprojektion, Kamera, HUD oder Kollisionsvertrag erneuert. Vor einer Aktualisierung werden alter und neuer Satz nebeneinander geprüft; die Bilder sind zunächst Review-Artefakte, kein fragiler Pixel-Diff-CI-Test.
