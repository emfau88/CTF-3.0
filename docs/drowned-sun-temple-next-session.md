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
- Kamera-Zoom für kleine Playtest-Flächen korrigiert: Unterhalb normaler Desktop-Größe bleibt eine gemeinsame Mindest-Sichtfläche von 1280×720 Welt-Einheiten erhalten. Normale Desktop-Auflösungen und der Schutz vor leeren Kartenrändern bleiben unverändert.

## Nächste Sitzung

1. **Finale Visual-QA:** Basen, Mittelzone, Court-Corners, Cenoten sowie beide Jaguar-Motive bei der korrigierten Spielansicht prüfen und nur bei Bedarf fein skalieren.
2. **Waffen-HUD:** Größe und Position der Waffen-Buttons nach Pickups mapübergreifend vergleichen. Bisher nicht geändert; prüfen, ob es ein bestehendes responsives HUD-Verhalten statt eines Temple-Effekts ist.
3. **One-Flag-Flagge:** Stoff/Flaggentuch im Verhältnis zu den Charakteren prüfen und gegebenenfalls separat skalieren. Bisher nicht geändert.
4. **Playtest-Ablauf:** Bei Bot-Runden weiterhin den Ergebnisbildschirm überwachen und sofort `Play Again` auslösen, damit die Sichtprüfung nicht auf einem beendeten Match stehenbleibt.

## Nicht Teil des Temple-Commits

- AX-9-Special-Idle-Spritesheet
- Xeno-Runner-Portrait
- `src/adapters/phaser/characterSpecialIdle.ts`
- `tmp/`
