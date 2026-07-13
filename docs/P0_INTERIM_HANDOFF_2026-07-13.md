# P0-Zwischenabschluss und P1-Handoff

> Fortsetzungsstand nach dem P1-B1-Abschluss: siehe
> `P1_INTERIM_HANDOFF_2026-07-13.md`.

Stand: 2026-07-13  
Projekt: `C:\Users\madde\Documents\CTF-3.0`  
Branch/Basis: `main` bei `1d651a5`  
Fokus: PC-/Desktop-Browser; Mobile, Map-Thumbnails und 20-MB-Grenze sind bewusst spaeter.

## Kurzurteil

P0 ist umgesetzt und an allen automatisierten Gates gruen. Auf Grundlage der vorherigen Freigabe wurde P1 bereits begonnen. Auf Wunsch des Nutzers wurde der Scope danach gestoppt und an einer verifizierten Zwischenstation abgeschlossen. Der Arbeitsbaum ist absichtlich nicht committed oder gestaged und muss im naechsten Auftrag als geschuetzte WIP behandelt werden.

Verifikation am Zwischenabschluss:

- `npm.cmd run test:typecheck`: bestanden.
- `npm.cmd test`: **71/71 Tests bestanden**.
- `npm.cmd run build`: bestanden; nur die bekannte Vite-Warnung fuer den 1,515-MB-JS-Chunk.
- `npm.cmd run bot:diagnostics`: durchgelaufen; 60 Startkombinationen, 0 invalid position frames, 0 idle action frames.
- Desktop-Browser: P0-Viewport-/Map-Matrix war gruen. Die zuletzt ueberarbeiteten Pickup-Pads und das Core Relay Banner wurden im laufenden 1920x1080-Spiel visuell geprueft.

Die Bot-Diagnose meldet drei One-Flag-Hotzone-Hinweise (`escort-carrier`/`chase-enemy-carrier` blocked frames). Die Pfade wurden dennoch gefunden und beide Actors machten messbaren Fortschritt. In einzelnen groesseren Bot-Szenarien bleiben ausserdem kurze Zeitfenster mit komplett leerem Spezialwaffenbestand. Beides ist ein offener Gameplay-/Playtestpunkt, kein Stabilitaetsfehler.

## P0 - umgesetzt

### Desktop-UI und Rendering

- Career ist die klare Primaeraktion; Quick Play ist neutral.
- Ueberfluessige Kachelverschachtelung wurde auf Main/HQ/Recruitment reduziert.
- Quick-Play-CTA bleibt bei 1366x768 und 1024x768 erreichbar.
- Pause nutzt die dunkle V2-Surface; `:focus-visible` und kritische Kontraste wurden ergaenzt.
- Kamera-Fit verhindert helle/schwarze Restbaender auf kurzen Maps.
- Der grosse Arena-Renderer wurde in Kamera-, Actor-, Pickup- und Objective-Renderer zerlegt.
- Neue Desktop-Vertraege liegen in `tests/p0-desktop-ui.test.ts`.

### Recruitment bleibt rein kosmetisch

- Alle Charaktere behalten identische Arena-Stats, Hitboxen und Waffenregeln.
- `OVR`, mechanische Rollen und Character-Ratings wurden aus dem Recruitment-Vertrag entfernt.
- Rivalensimulation nutzt stabile Teamprofile und kann nicht durch einen kosmetischen Roster-Swap veraendert werden.
- Side-by-side-Vergleich mit `Recruit`/`Keep`, sichtbarem Hinweis auf identische Stats und ohne natives Confirm.

### Spawn-Schutz

- Jeder echte Spawn/Respawn erhaelt exakt 2 Sekunden Schutz gegen Direct Damage, Splash und Knockback.
- Angriff oder Objective-Interaktion beendet den Schutz; normale Bewegung nicht.
- Sichtbare Bubble, Team-Rim und lokaler Countdown.
- Eigene Events unterscheiden geblockten Schaden von echten Treffern.

### Ammo-Fairness und Arc-Lash-Grundfunktion

- Respawn gibt drei regenerierende Arc-Lash-Charges; eine Charge regeneriert alle 2,4 Sekunden bis zum Cap.
- Arc Lash sucht im Core automatisch den naechsten aktiven Gegner in Reichweite mit Sichtlinie und deterministischem Actor-ID-Tie-Break.
- Maus-Aim wird fuer Arc Lash ignoriert. Ohne Ziel gibt es `NO TARGET`, aber keinen Charge-/Cooldown-Verbrauch.
- Gleichzeitiger Pickup-Kontakt bevorzugt den menschlichen Ally; Bots vermeiden Weapon-Pickups nahe einem menschlichen Teampartner mit mindestens gleichem Bedarf.
- Ammo-, Jump-Start-, Landing- und Failure-Metriken wurden in die Diagnose aufgenommen.

## Bereits umgesetzte P1-Teilpakete

Diese Punkte sind bereits Code/WIP und duerfen nicht erneut von vorn implementiert werden:

- Arc-Lash-Pickup/HUD nutzen `public/assets/arc-lash-v2.png`; der Angriff zeigt einen cyan-weissen, gezackten Energietether statt des alten braunen Peitschenkegels.
- One Flag nutzt `public/assets/core-relay-banner.png`; das einzelne Bannerasset wird anhand der horizontalen Carrier-Bewegung geflippt und leicht geflattert.
- Pickup-Pads nutzen wieder das hochwertige vorhandene `spawn-pad.png` als typfarbiges Energy-Inlay, dazu das vierphasige `spawn-pad-glow-v2.png`, ADD-Glow und typfarbige Partikel. Die vom Nutzer als billig abgelehnte reine Linienring-Optik wurde entfernt. Inaktive Pads zeigen einen dezenten Respawn-Fortschritt und Sekundenwert.
- Das synthetische Dauer-Atmen ist entfernt. Alle neun Skins besitzen kurze, unterbrechbare, code-native Special-Idle-Posen nach 3,5-6 Sekunden Ruhe. Das sind noch keine neuen Special-Idle-Spritesheets.
- Result/TAB-Spalten sind modusabhaengig: TDM zeigt keine CAP/RET-Spalten; Objective-Modi schon. Die Präsentationslogik wurde nach `src/matchStatsPresentation.ts` ausgelagert und die Desktop-Schrift vergroessert.
- League HQ zeigt einen Drei-Match-Fortschrittsstreifen und standardmaessig den naechsten Gegner statt das eigene Squad doppelt. Niederlage/Draw plus rivalenbedingter Rangwechsel wird nicht mehr als eigener Erfolg formuliert; `0` Punkte ist neutral.
- Der Classic-CTF-2v2-Bot ankert nur kurz an der Base, rotiert danach als Sweeper Richtung Midfield, reagiert sofort auf Invader/Flag-Notfaelle und behaelt manuelle Teamkommandos als Override.
- Praesentation-Scale der Skins ist getestet und bleibt ohne Gameplay-/Hitbox-Auswirkung.

## Asset-Provenienz

`arc-lash-v2.png` und `core-relay-banner.png` wurden mit dem eingebauten Imagegen-Modus erzeugt, auf gruener Freistellflaeche ausgegeben, per Chroma-Key transparent gemacht und auf 512x512 optimiert. Der Hilfsschritt liegt in `scripts/optimize-transparent-asset.py`.

Verwendete Prompt-Briefs:

- Arc Lash: hochwertiges kompaktes industrielles Sci-Fi-Energielash-Geraet, diagonale lesbare Silhouette, isolierter Griff und Spule, cyan-weisser Lichtbogen mit dezenten Magenta-Akzenten, kein Text, isoliert auf rein gruener Flaeche.
- Core Relay Banner: neutrale hochwertige Sci-Fi-Relay-Standarte in Seitenansicht, heller Mast/Core, weiss-amberfarbenes holografisches Tuch nach rechts, cyanfarbener Relay-Kern, keine rote/blaue Teamfarbe, kein Text, isoliert auf rein gruener Flaeche.

Die Pickup-Pads wurden bewusst nicht neu generiert: Nach dem Asset-Audit war das bereits vorhandene `public/assets/spawn-pad.png` stilistisch passender und hochwertiger.

## Noch offen - nicht in diesem Auftrag weiter ausbauen

1. Bot-Jump-Diagnose kennt Starts/Landings/Failures, aber noch keine verwendete Jump-Link-ID und keinen Link-Fortschritt. Der sichtbare erfolgreiche Browser-Smoke pro Map fehlt ebenfalls. Keine zufaelligen Combat-Hops einfuehren.
2. Core Relay Banner ist ein hochwertiges einzelnes PNG mit Flip/Runtime-Flutter, noch kein echtes Links-/Rechts-Cloth-Spritesheet.
3. Idle-System ist fuer alle neun Charaktere funktional, nutzt aber Transform-Posen statt separater Special-Idle-Spritesheets. Zuerst im Browser einen Pilot-Charakter abnehmen, dann ueber echte Assets entscheiden.
4. Vollstaendiger manueller Drei-Match-League-Run nach den letzten P1-Aenderungen fehlt; DOM-Tests sind gruen.
5. TDM-/CTF-/One-Flag-TAB- und Result-Screens muessen noch einmal als komplette Desktop-Viewport-Matrix visuell abgenommen werden.
6. Weitere inkrementelle Godfile-Splits sind offen: `PhaserArenaHudPort.ts`, `PhaserWeaponEffectsPort.ts`, `tests/bot-diagnostics.ts`, `PhaserGameBridge.smoke.ts` und `leagueSeason.ts`. Kein Big-Bang-Refactor.
7. Der erste Screenshot direkt nach schneller Match-Routennavigation zeigte kurz grosse schwarze WebGL-Flächen; 1,3 Sekunden spaeter war derselbe Screen vollstaendig korrekt. Das war schon im Audit als intermittierender Schnellnavigationspunkt bekannt und muss gezielt reproduziert werden, bevor es als normaler Spielbug gilt.
8. Map-Thumbnails erst nach Map-Ueberarbeitung. Mobile/Touch spaeter als eigene Produktentscheidung. 20-MB-/Portalgrenze ebenfalls spaeter.

## Empfohlene Fortsetzung

Im neuen Auftrag zuerst nur den vorhandenen WIP verifizieren. Danach P1 in kleinen Stop-Gates beenden:

1. P1-A: sichtbare Desktop-Abnahme der bereits implementierten Assets/League-/Scoreboard-Teile; nur echte Regressionen reparieren.
2. P1-B: Jump-Link-ID/Progress-Diagnose und ein reproduzierbarer Traversal-Smoke, ohne Combat-Hop-Verhalten.
3. P1-C: Entscheidung und Pilot fuer echtes Banner-Cloth-Sheet und genau einen Special-Idle-Spritesheet-Charakter.
4. P1-D: gezielte Architektur-Splits nur an Dateien, die fuer die vorherigen Punkte beruehrt werden.
5. Abschlussgate: Typecheck, 71+ Tests, Build, Bot-Diagnostik, Desktop-Matrix und kompletter League-Run.

## Kopierfertiger Startprompt fuer einen neuen Chat

```text
Du uebernimmst ein bestehendes Spielprojekt, das du noch nicht kennst.

Projektpfad: C:\Users\madde\Documents\CTF-3.0
Branch/Basis: main bei 1d651a5. Der Arbeitsbaum ist umfangreich dirty und enthaelt absichtlich uncommittete P0- und P1-WIP. Nichts resetten, bereinigen, loeschen, stagen oder committen, ausser ich fordere das spaeter ausdruecklich an. Behandle alle vorhandenen Aenderungen als geschuetzte Arbeit.

Lies zuerst vollstaendig und in dieser Reihenfolge:
1. docs/P0_INTERIM_HANDOFF_2026-07-13.md
2. docs/VERIFIED_UI_GAMEPLAY_ARCHITECTURE_ROADMAP_2026-07-13.md
3. git status --short und den relevanten Diff, bevor du etwas aenderst.

Ziel: Die noch offenen P1-Aufgaben sicher und in kleinen, einzeln verifizierbaren Etappen abschliessen. P0 ist bereits umgesetzt; nicht neu bauen. Bereits begonnene P1-Teile ebenfalls nicht von vorn anfangen. PC-/Desktop-Browser hat Prioritaet. Mobile, Map-Thumbnails und 20-MB-Grenze bleiben ausserhalb dieses Auftrags.

Unveraenderliche Produktvertraege:
- Alle spielbaren Charaktere haben identische Gameplay-Stats, Hitboxen, Damage-, Movement- und Waffenregeln. Recruitment ist rein kosmetisch. Keine Character-Ratings oder Balance-Ebenen einfuehren.
- Arc Lash ist auto-targeted und nutzt regenerierende Charges; manuelles Maus-Aim darf sie nicht steuern.
- Bot-Jumps bleiben authored Wall-/Gap-Traversal. Keine zufaelligen Combat-Hops oder Bunny-Hops.
- Vorhandene WIP und Assets bewahren. Keine Map-Thumbnails vor der Map-Ueberarbeitung.

Aktuell verifizierte Gates am Handoff:
- npm.cmd run test:typecheck: gruen
- npm.cmd test: 71/71 gruen
- npm.cmd run build: gruen, bekannte Chunk-Warnung
- npm.cmd run bot:diagnostics: durchgelaufen; 0 invalid position frames, 0 idle action frames; drei dokumentierte One-Flag-Hotzone-Hinweise

Arbeitsweise:
1. Bleibe zunaechst read-only. Verifiziere, dass Dokument, Git-Status und Tests zum Handoff passen. Berichte explizit: verifiziert / nur aus Code abgeleitet / offen.
2. Lege danach einen kleinen P1-Abschlussplan mit Stop-Gates vor. Noch nichts implementieren, bis der Plan und die aktuelle WIP-Lage klar sind.
3. Empfohlene Reihenfolge: (A) Browser-Abnahme der bereits implementierten P1-Teile, (B) Jump-Link-ID/Progress plus sichtbarer Traversal-Smoke, (C) Pilotentscheidung fuer echtes Banner-Cloth-/Idle-Spritesheet, (D) nur notwendige inkrementelle Godfile-Splits, (E) kompletter Desktop-/League-Abschluss.
4. Nach jeder Etappe Tests/Typecheck/Build bzw. Diagnostik proportional zum Risiko ausfuehren und bei einem roten Gate stoppen.
5. Nicht behaupten, dass Browser-Smoke tiefe Gameplay-Qualitaet beweist. Offene Human-Playtests klar nennen.

Wichtig zum Pickup-Pad: Die reine typfarbene Linienring-Loesung wurde vom Nutzer als billig abgelehnt. Der aktuelle WIP nutzt stattdessen das hochwertige vorhandene spawn-pad.png als typfarbiges Energy-Inlay, das animierte spawn-pad-glow-v2.png und typfarbige Partikel. Diese Richtung bewahren und zuerst im Browser bewerten.

Beginne jetzt mit der read-only Orientierung und gib mir danach nur deinen verifizierten Status plus den vorgeschlagenen kleinen P1-Abschlussplan. Noch keine Codeaenderungen.
```
