# Temple of the Drowned Sun – Übergabe

Stand nach vollständiger Integration und Abschlussprüfung.

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

## Abschlussprüfung

- Temple of the Drowned Sun ist in Quick Play auswählbar.
- Das CTF-Finale der dreirundigen Founders Circuit League nutzt nun Temple of the Drowned Sun. Foundry Circuit bleibt in Quick Play verfügbar.
- Finale Visual-QA in TDM, CTF und One-Flag: Basen, Mittelzone, Court-Corners, Cenoten und Jaguar-Motive bleiben sauber, symmetrisch und proportional.
- Das Desktop-Waffen-HUD besitzt für sehr kleine Playtest-Flächen eine eigene Mikro-Stufe. Normale kompakte und Desktop-Größen bleiben unverändert.
- Das neutrale One-Flag-Flaggentuch wurde separat verkleinert; Mast, Animation und Gameplay bleiben unverändert.
- Live-Playtest ohne Warnungen oder Fehler. Bei späteren Bot-Prüfungen weiterhin am Match-Ende sofort `Play Again` auslösen.

## Nicht Teil des Temple-Commits

- AX-9-Special-Idle-Spritesheet
- Xeno-Runner-Portrait
- `src/adapters/phaser/characterSpecialIdle.ts`
- `tmp/`
