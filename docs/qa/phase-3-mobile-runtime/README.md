# Phase 3 — Match-Start, Mobile-HUD und Runtime

Status: technisch umgesetzt und zuletzt am 2026-08-08 geprüft. Die subjektive Abnahme auf einem echten Touch-Gerät bleibt sinnvoll.

## Ergebnis

- Jeder normale TDM-, Classic-CTF- und One-Flag-Match beginnt mit einem gemeinsamen zweisekündigen Countdown. Währenddessen stehen Spieler und Bots still, Weltzeit, Matchzeit und Spawn-Schutz laufen nicht weiter. Erst danach wird die Simulation für alle freigegeben.
- Die mobile Waffenleiste liest das Waffenroster der aktiven Map. Helix zeigt deshalb Arc Lash, Rail, Pulse und Shard; Rocket und Disc erscheinen dort nicht.
- Die vier Waffen liegen in einem kompakten Bogen um den kleineren Jump-Button. Die sichtbaren Symbole sind platzsparend, die Touchflächen bleiben größer und überschneiden sich nicht. Bei mehreren Treffkandidaten gewinnt zusätzlich immer der Mittelpunkt mit dem kleinsten Abstand.
- Der Jump-Button sitzt mit zwölf Pixel Rand unten rechts. Der laufende Kampf enthält dort keinen Fullscreen-Schalter mehr.
- Sound, Statistik und Menü sitzen mobil sechs Pixel vom oberen/rechten Rand entfernt. Der doppelte Fullscreen-Zugriff ist im mobilen Kampf ausgeblendet; in den Menüs bleibt Fullscreen weiterhin erreichbar.
- Das große Xeno-Runner-Statusfeld ist nur bei Touch-Steuerung ausgeblendet. Die zentrale Match-HUD verwendet mobil die kleine Micro-Darstellung direkt am oberen Rand.
- Das Combat-Log ist mobil auf 168 × 19 Pixel pro Zeile und höchstens zwei Meldungen begrenzt. Es sitzt direkt unter der rechten Utility-Leiste. Desktop-Layout und Desktop-Combat-Log bleiben unverändert.
- Helix verwendet auf Mobile und Desktop in allen drei Modi dieselbe aktive Map-ID und lädt ausschließlich `arena-master-v2.png`. Das alte Master bleibt als Projekt-Rückfalloption erhalten, wird im Spiel aber nicht geladen.
- Die Mobile-Kamera zeigt statt der allgemeinen 1280 × 720 mindestens 1120 × 640 Welteinheiten. Das entspricht auf dem 844 × 390 Referenz-Viewport rund 12,5 Prozent mehr Nähe. Die zeitbasierte Dämpfung reagiert unabhängig von 30 oder 60 FPS; Spawn, Respawn und große Positionssprünge werden ohne Kamerafahrt eingerastet.
- Hauptmenü, Quick Play und League bleiben im Hochformat sichtbar. Der äußere Menübereich scrollt vertikal; Titel, Zurück- und Fullscreen-Aktion bleiben auf dem 390 × 844 Referenz-Viewport getrennt und der Match-Start ist erreichbar.

## Runtime-Optimierungen

- Lebens-/Rüstungsbalken werden nur bei einer tatsächlichen Statusänderung neu gezeichnet.
- Spawn-Schutz teilt sich in statische Geometrie und eine nur alle 100 ms aktualisierte Fortschrittsanzeige.
- Pickup-Statusringe, Desktop-Waffenleiste und Mobile-Control-Grafik verwenden Zustands-Signaturen statt vollständigem Neuzeichnen in jedem Frame.
- Spawn-Pad-Partikel verwenden wiederverwendete Sprite-Objekte statt in jedem Frame alle Kreise in ein gemeinsames Vector-Graphics-Objekt neu zu zeichnen.

## Performance-Messung

Gemessen wurde derselbe Produktionsfall Helix TDM 4v4 mit ausschließlich Hard-Bots über acht laufende Sekunden. Chromium lief absichtlich mit SwiftShader, also einem langsamen Software-WebGL-Renderer. Die Zahlen sind ein reproduzierbarer Belastungsvergleich und keine Prognose für ein konkretes Handy.

| Metrik | Vorher | Nachher | Einordnung |
| --- | ---: | ---: | --- |
| Main-Thread TaskDuration | 4,177 s | 3,552 s | rund 15,0 % weniger |
| ScriptDuration | 3,290 s | 2,638 s | rund 19,8 % weniger |
| Frame-p95 | 100,0 ms | 83,3 ms | besser in diesem Lauf |
| Durchschnittlicher Frame | 45,2 ms | 46,7 ms | innerhalb der SwiftShader-Schwankung, weiterhin langsam |

Das Ergebnis bestätigt: unnötige CPU-/Zeichenarbeit wurde messbar reduziert. Ein Software-Renderer erreicht im 4v4-Stresstest trotzdem nur ungefähr 21 Bilder pro Sekunde; echtes Ruckeln auf schwacher Hardware ist daher weiterhin möglich. Der nächste Performance-Schritt wäre GPU-Profiling auf einem realen Mobilgerät, nicht weiteres blindes Kürzen der Spiellogik.

## Verifikation

| Gate | Ergebnis |
| --- | --- |
| Vollständige Unit-/Simulationssuite | 220/220 bestanden |
| TypeScript-Test-Typecheck | Bestanden |
| Production-Build | Bestanden; nur bekanntes Phaser-Chunk-Warning |
| Browser-E2E | 8/8 bestanden |
| Mobile Helix TDM, Classic CTF, One Flag | neue Map geladen, Legacy-Map nicht geladen |
| Mobile Portrait 390 × 844 | Hauptmenü und Quick Play sichtbar, kein relevanter Horizontalüberlauf oder Header-Overlap |
| Screenshot-Diagnostik | 6/6 ohne Console-, Page- oder Request-Fehler |

## Screenshot-Matrix

| Ansicht | Evidenz |
| --- | --- |
| Synchronisierter Mobile-Countdown | [844×390](screenshots/mobile-countdown-844x390.jpg) |
| Mobile TDM | [844×390](screenshots/mobile-tdm-844x390.jpg) |
| Mobile Classic CTF | [844×390](screenshots/mobile-ctf-844x390.jpg) |
| Mobile One Flag | [844×390](screenshots/mobile-one-flag-844x390.jpg) |
| Kompaktes Mobile-Combat-Log | [844×390](screenshots/mobile-combat-log-844x390.jpg) |
| Desktop-Regressionsansicht | [1280×720](screenshots/desktop-regression-1280x720.jpg) |

Exakte URLs, Bild-Hashes, Utility-Positionen und Browserdiagnostik stehen in [manifest.json](manifest.json). Reproduktion bei laufendem lokalen Server auf Port 5190:

```powershell
node scripts/capture-phase-3-mobile-runtime.mjs docs/qa/phase-3-mobile-runtime
```
