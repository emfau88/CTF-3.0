# Premium-Map Bot-Audit

- Lauf: 2026-07-19T15-07-29-969Z
- Zeitpunkt: 2026-07-19T15:07:29.969Z
- Git: 3b6c35598c9660e93095c85f5993bb88efc9a8a2 (dirty)
- Matrix: 3 Maps x 3 Modi x 6 Laeufe
- Teamgroesse: 2v2
- Dauer je Lauf: 18000 ms bei 34 ms/Frame

## Aggregierte Ergebnisse

| Map | Modus | Laeufe | Kritisch | Warnungen | Score Avg | Flag-Pickups Avg | Captures Avg | Weg/s | max. Move-Stall | max. stiller Hold | max. waffenloser Hold | blockierte Ziele | Pfadfehler |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| helix-canopy-v2 | TDM | 6 | 0 | 11 | 3.67 | 0 | 0 | 154.27 | 1360 ms | 6868 ms | 6868 ms | 6.1 % | 0.5 % |
| helix-canopy-v2 | Classic CTF | 6 | 0 | 8 | 0.5 | 1.67 | 0.5 | 196.09 | 6460 ms | 2176 ms | 2176 ms | 4.8 % | 0.1 % |
| helix-canopy-v2 | One Flag | 6 | 0 | 2 | 1.67 | 3.17 | 1.67 | 201.05 | 4522 ms | 578 ms | 578 ms | 0.2 % | 0 % |
| drowned-sun-temple-v2 | TDM | 6 | 0 | 29 | 0.17 | 0 | 0 | 69.49 | 34 ms | 14008 ms | 14008 ms | 2.3 % | 0 % |
| drowned-sun-temple-v2 | Classic CTF | 6 | 0 | 0 | 1.5 | 2 | 1.5 | 203.4 | 578 ms | 714 ms | 714 ms | 0.4 % | 0 % |
| drowned-sun-temple-v2 | One Flag | 6 | 0 | 0 | 0.33 | 4.17 | 0.33 | 196.14 | 34 ms | 748 ms | 748 ms | 0 % | 0 % |
| flow-circuit-v2 | TDM | 6 | 0 | 12 | 3.17 | 0 | 0 | 145.18 | 34 ms | 5848 ms | 5780 ms | 16.1 % | 0 % |
| flow-circuit-v2 | Classic CTF | 6 | 0 | 0 | 0 | 1.83 | 0 | 202.07 | 476 ms | 1496 ms | 1496 ms | 3.9 % | 0 % |
| flow-circuit-v2 | One Flag | 6 | 0 | 0 | 0.83 | 3 | 0.83 | 196.3 | 102 ms | 1156 ms | 1156 ms | 0 % | 0 % |

## CTF-Kommandowirkung

| Map | Profil | Laeufe | Befolgt | Notfall-Override | Konflikt | Pickups Avg | Captures Avg |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| helix-canopy-v2 | auto | 2 | n/a | n/a | n/a | 1.5 | 0.5 |
| helix-canopy-v2 | defend | 1 | 100 % | 0 % | 0 % | 1 | 0 |
| helix-canopy-v2 | follow | 1 | 51.3 % | 48.7 % | 0 % | 3 | 1 |
| helix-canopy-v2 | attack | 1 | 60.2 % | 39.8 % | 0 % | 1 | 1 |
| helix-canopy-v2 | cycle | 1 | 86.4 % | 13.6 % | 0 % | 2 | 0 |
| drowned-sun-temple-v2 | auto | 2 | n/a | n/a | n/a | 2 | 2 |
| drowned-sun-temple-v2 | defend | 1 | 69.2 % | 30.8 % | 0 % | 2 | 1 |
| drowned-sun-temple-v2 | follow | 1 | 66.7 % | 33.3 % | 0 % | 2 | 2 |
| drowned-sun-temple-v2 | attack | 1 | 51.9 % | 48.1 % | 0 % | 2 | 1 |
| drowned-sun-temple-v2 | cycle | 1 | 71.1 % | 28.9 % | 0 % | 2 | 1 |
| flow-circuit-v2 | auto | 2 | n/a | n/a | n/a | 1.5 | 0 |
| flow-circuit-v2 | defend | 1 | 62.3 % | 37.7 % | 0 % | 2 | 0 |
| flow-circuit-v2 | follow | 1 | 72.6 % | 27.4 % | 0 % | 2 | 0 |
| flow-circuit-v2 | attack | 1 | 56 % | 44 % | 0 % | 2 | 0 |
| flow-circuit-v2 | cycle | 1 | 99 % | 1 % | 0 % | 2 | 0 |

## Automatische Befunde

- weaponless-standoff: 49
- blocked-goal-rate: 37
- move-intent-stall: 9
- combat-deadlock: 5
- path-miss-rate: 1

## Wichtigste Einzelbefunde

- **INFO weaponless-standoff** · helix-canopy-v2 · TDM · Lauf 0 · blue-player: Standoff hielt 2482 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **WARNING weaponless-standoff** · helix-canopy-v2 · TDM · Lauf 0 · red-player: Standoff hielt 5202 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **INFO blocked-goal-rate** · helix-canopy-v2 · TDM · Lauf 0 · red-player: 41 % der aktiven Frames zielten auf eine blockierte Zelle.
- **WARNING weaponless-standoff** · helix-canopy-v2 · TDM · Lauf 0 · red-player-2: Standoff hielt 2584 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **INFO blocked-goal-rate** · helix-canopy-v2 · TDM · Lauf 1 · blue-player-2: 9 % der aktiven Frames zielten auf eine blockierte Zelle.
- **INFO blocked-goal-rate** · helix-canopy-v2 · TDM · Lauf 1 · red-player: 10.5 % der aktiven Frames zielten auf eine blockierte Zelle.
- **INFO blocked-goal-rate** · helix-canopy-v2 · TDM · Lauf 2 · blue-player: 13.2 % der aktiven Frames zielten auf eine blockierte Zelle.
- **WARNING move-intent-stall** · helix-canopy-v2 · TDM · Lauf 2 · red-player: Trotz Bewegungsabsicht 1360 ms ohne Fortschritt.
- **WARNING blocked-goal-rate** · helix-canopy-v2 · TDM · Lauf 2 · red-player: 11.9 % der aktiven Frames zielten auf eine blockierte Zelle.
- **WARNING move-intent-stall** · helix-canopy-v2 · TDM · Lauf 2 · red-player-2: Trotz Bewegungsabsicht 1360 ms ohne Fortschritt.
- **WARNING blocked-goal-rate** · helix-canopy-v2 · TDM · Lauf 2 · red-player-2: 15.8 % der aktiven Frames zielten auf eine blockierte Zelle.
- **WARNING path-miss-rate** · helix-canopy-v2 · TDM · Lauf 3 · blue-player-2: 9.8 % der aktiven Frames hatten Bewegungsabsicht, aber keinen Pfad.
- **WARNING blocked-goal-rate** · helix-canopy-v2 · TDM · Lauf 3 · blue-player-2: 14.3 % der aktiven Frames zielten auf eine blockierte Zelle.
- **INFO weaponless-standoff** · helix-canopy-v2 · TDM · Lauf 4 · blue-player-2: Standoff hielt 2482 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **WARNING weaponless-standoff** · helix-canopy-v2 · TDM · Lauf 4 · red-player-2: Standoff hielt 4182 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **WARNING weaponless-standoff** · helix-canopy-v2 · TDM · Lauf 5 · blue-player: Standoff hielt 3876 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **INFO weaponless-standoff** · helix-canopy-v2 · TDM · Lauf 5 · red-player: Standoff hielt 1972 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **WARNING weaponless-standoff** · helix-canopy-v2 · TDM · Lauf 5 · red-player-2: Standoff hielt 6868 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **INFO blocked-goal-rate** · helix-canopy-v2 · Classic CTF · Lauf 0 · blue-player-2: 14.3 % der aktiven Frames zielten auf eine blockierte Zelle.
- **WARNING move-intent-stall** · helix-canopy-v2 · Classic CTF · Lauf 0 · red-player-2: Trotz Bewegungsabsicht 2550 ms ohne Fortschritt.
- **INFO blocked-goal-rate** · helix-canopy-v2 · Classic CTF · Lauf 1 · red-player-2: 11.7 % der aktiven Frames zielten auf eine blockierte Zelle.
- **INFO weaponless-standoff** · helix-canopy-v2 · Classic CTF · Lauf 2 · blue-player: Standoff hielt 2176 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **WARNING move-intent-stall** · helix-canopy-v2 · Classic CTF · Lauf 2 · blue-player-2: Trotz Bewegungsabsicht 3468 ms ohne Fortschritt.
- **WARNING blocked-goal-rate** · helix-canopy-v2 · Classic CTF · Lauf 2 · blue-player-2: 10.4 % der aktiven Frames zielten auf eine blockierte Zelle.
- **WARNING move-intent-stall** · helix-canopy-v2 · Classic CTF · Lauf 2 · red-player-2: Trotz Bewegungsabsicht 3332 ms ohne Fortschritt.
- **WARNING move-intent-stall** · helix-canopy-v2 · Classic CTF · Lauf 3 · blue-player: Trotz Bewegungsabsicht 6460 ms ohne Fortschritt.
- **WARNING blocked-goal-rate** · helix-canopy-v2 · Classic CTF · Lauf 3 · blue-player: 8.7 % der aktiven Frames zielten auf eine blockierte Zelle.
- **WARNING move-intent-stall** · helix-canopy-v2 · Classic CTF · Lauf 3 · red-player-2: Trotz Bewegungsabsicht 2176 ms ohne Fortschritt.
- **WARNING blocked-goal-rate** · helix-canopy-v2 · Classic CTF · Lauf 3 · red-player-2: 15 % der aktiven Frames zielten auf eine blockierte Zelle.
- **INFO blocked-goal-rate** · helix-canopy-v2 · Classic CTF · Lauf 5 · blue-player-2: 13.8 % der aktiven Frames zielten auf eine blockierte Zelle.
- **INFO blocked-goal-rate** · helix-canopy-v2 · Classic CTF · Lauf 5 · red-player-2: 12.8 % der aktiven Frames zielten auf eine blockierte Zelle.
- **WARNING move-intent-stall** · helix-canopy-v2 · One Flag · Lauf 2 · red-player: Trotz Bewegungsabsicht 4250 ms ohne Fortschritt.
- **WARNING move-intent-stall** · helix-canopy-v2 · One Flag · Lauf 5 · red-player: Trotz Bewegungsabsicht 4522 ms ohne Fortschritt.
- **WARNING combat-deadlock** · drowned-sun-temple-v2 · TDM · Lauf 0: Mindestens die Haelfte der Bots hielt ohne einsetzbare Waffe lange Abstand; der Lauf erzeugte keinen Score.
- **WARNING weaponless-standoff** · drowned-sun-temple-v2 · TDM · Lauf 0 · blue-player: Standoff hielt 12784 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **WARNING weaponless-standoff** · drowned-sun-temple-v2 · TDM · Lauf 0 · blue-player-2: Standoff hielt 13838 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **WARNING weaponless-standoff** · drowned-sun-temple-v2 · TDM · Lauf 0 · red-player: Standoff hielt 12784 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **WARNING weaponless-standoff** · drowned-sun-temple-v2 · TDM · Lauf 0 · red-player-2: Standoff hielt 13838 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- **WARNING combat-deadlock** · drowned-sun-temple-v2 · TDM · Lauf 1: Mindestens die Haelfte der Bots hielt ohne einsetzbare Waffe lange Abstand; der Lauf erzeugte keinen Score.
- **WARNING weaponless-standoff** · drowned-sun-temple-v2 · TDM · Lauf 1 · blue-player: Standoff hielt 12784 ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.
- … 61 weitere Befunde stehen in der JSON-Datei.

## Einordnung

- `intentionalHoldMs` ist eine bewusste Standoff-Entscheidung und kein Navigatorfehler.
- `silent-combat-hold` markiert erst einen langen Standoff ohne erfolgreichen Schuss.
- `respawnInactiveMs` ist Tot-/Respawnzeit und wird nicht als Bot-Leerlauf gewertet.
- CTF-Notfaelle (eigene Flagge verloren oder selbst Flagge getragen) duerfen menschliche Kommandos ueberstimmen.
- Die Laeufe sind reproduzierbar, variieren aber kontrolliert die Startpositionen. Sie sind kein Ersatz fuer visuelles Spielgefuehl-QA.
