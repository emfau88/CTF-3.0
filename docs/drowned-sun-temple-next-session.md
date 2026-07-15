# Temple of the Drowned Sun – Übergabe

Stand nach Phase 9 sowie dem Scope- und Visual-Cleanup.

## Erledigt

- Voll spielbare Map für TDM, CTF und One-Flag von 1v1 bis 4v4.
- Spawns, Pickups, Sprungverbindungen, Bots und Map-Qualitätsprüfungen sind grün.
- Temple-Assets werden nur für die Temple-Map vorgeladen; andere Maps bleiben davon unberührt.
- Sunken Court/Flow Lab wurde inhaltlich nicht verändert. Der Traversal-Smoke-Test nutzt intern sichere Prüfpositionen.
- Rote und blaue Basis besitzen dieselbe Größe und Motivgeometrie; Rot leuchtet nun klarer.
- Jaguar-/Panther-Motive werden proportional dargestellt.
- Doppelte Code-Rahmen über Basen, Mittelzone, Wänden und Cenoten wurden entfernt. Die Assets liefern jeweils den sichtbaren Einzelrahmen.
- Bot-Playtest am Match-Ende geprüft: Ergebnisbildschirm erkennen und `Play Again` anklicken startet die Runde korrekt neu.

## Nächste Sitzung

1. **Kamera/Zoom – höchste Priorität:** Die Temple-Map wirkt im Live-Playtest deutlich näher herangezoomt als die anderen Maps. Mit einer normalen Desktop-Prüffläche bleibt der Unterschied sichtbar. Kamera-Fit (`calculateArenaFitZoom`), Phaser-Resize und die kurze Maphöhe von 920 Einheiten im Vergleich zu den Bestandsmaps untersuchen. Keine globale Kameraänderung ohne direkten Vorher-/Nachher-Vergleich aller Maps.
2. **Finale Visual-QA nach dem Kamera-Fix:** Basen, Mittelzone, Court-Corners, Cenoten sowie beide Jaguar-Motive bei normaler Spielansicht prüfen und nur bei Bedarf fein skalieren.
3. **Waffen-HUD:** Größe und Position der Waffen-Buttons nach Pickups mapübergreifend vergleichen. Bisher nicht geändert; prüfen, ob es ein bestehendes responsives HUD-Verhalten statt eines Temple-Effekts ist.
4. **One-Flag-Flagge:** Stoff/Flaggentuch im Verhältnis zu den Charakteren prüfen und gegebenenfalls separat skalieren. Bisher nicht geändert.
5. **Playtest-Ablauf:** Bei Bot-Runden weiterhin den Ergebnisbildschirm überwachen und sofort `Play Again` auslösen, damit die Sichtprüfung nicht auf einem beendeten Match stehenbleibt.

## Nicht Teil des Temple-Commits

- AX-9-Special-Idle-Spritesheet
- Xeno-Runner-Portrait
- `src/adapters/phaser/characterSpecialIdle.ts`
- `tmp/`
