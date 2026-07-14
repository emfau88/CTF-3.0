# P1-Zwischenabschluss und Fortsetzungshandoff

Stand: 2026-07-14
Projekt: `C:\Users\madde\Documents\CTF-3.0`
Branch: `main`
Basis vor P1-B2: `1e56fb3` (`Complete P1 jump-link diagnostics`)
P1-B2-Abschluss: `6d498ba` (`Complete P1 authored traversal smoke`), nach
`origin/main` gepusht.
P1-C-Abschlussstand: Der Banner-Pilot ist umgesetzt; der Character-Special-
Idle-Pilot wurde nach menschlicher Sichtabnahme deaktiviert und wird nicht auf
weitere Charaktere ausgerollt.

## Fortsetzungsstand 2026-07-14: Font-Token- und Motion-Abschluss

Der kleine projektweite Typografie-Pass ist umgesetzt. Die drei Schriftketten
fuer UI, Display-Hierarchie und Diagnostik liegen zentral in `src/styles.css`
und als Phaser-kompatible Konstanten in `src/uiTypography.ts`. Direkte
Arial-/Consolas-Deklarationen in Menue, HUD, Pickups, Effekten, Diagnostik und
Legacy-Canvas wurden mechanisch auf diese Tokens umgestellt. Schriftgroessen,
Abstaende, Rendering-Logik und Gameplay blieben unveraendert.

Die fuer Mode-Auswahl, Result und League-Fortschritt vorhandene Motion-Sprache
wurde nicht erweitert: Sie bleibt kurz, zustandsgebunden und einmalig. Ein
neuer Vertragstest verhindert `infinite`-/`alternate`-Animationen und sichert
die bestehende `prefers-reduced-motion`-Reduktion ab.

### Verifizierte Gates dieses Abschlusses

- `npm.cmd run test:typecheck`: gruen.
- `npm.cmd test`: 80/80 gruen.
- `npm.cmd run build`: gruen; nur die bekannte Chunk-Warnung.
- Echte Browserabnahme bei 1366x768 und 1024x768: Startscreen, Quick Play und
  League HQ ohne horizontalen oder aeusseren vertikalen Seitenueberlauf.
- Quick Play zeigt 3/3 Mode-Karten und 9/9 Fighter-Portraets; League HQ bleibt
  in beiden Desktopbreiten lesbar und scrollt nur innerhalb seines Dashboards.
- Inter Variable und das tatsaechlich verwendete Barlow-Condensed-900-Gewicht
  wurden als geladen bestaetigt. Das laufende Canvas/HUD rendert mit geladener
  Inter-Schrift, ohne Console-Warnung oder Console-Fehler.
- Die aktuellen Squad-Portraets im League HQ erscheinen quadratisch und nicht
  vertikal gestreckt.

### Bewusste Verschiebung: Arena-Vorschauen

Arena-Vorschauen werden vorerst nicht umgesetzt. Die bestehenden Maps sollen
zuerst als zusammenhaengendes Map-/Modus-/Waffen-/Bot-System auditiert und
gestalterisch weiterentwickelt werden. Erst nach Freigabe hochwertiger finaler
Map-Richtungen koennen Vorschaubilder belastbar aus echten Arenen abgeleitet
werden. Das ist kein Blocker fuer diesen Font-/Motion-Abschluss und kein
offener Bestandteil des aktuellen UI-Pakets.

Geschuetzte untracked Arbeitsreste bleiben unveraendert bestehen:
`public/assets/ax9-mantis-idle-special-pilot-spritesheet-6x4.png`,
`public/assets/ui/portraits/xeno-runner-portrait.png`,
`src/adapters/phaser/characterSpecialIdle.ts` und `tmp/`. Sie duerfen nicht
versehentlich gestaged, geloescht oder in einen Produktcommit aufgenommen
werden.

## Fortsetzungsstand 2026-07-14: fuenf Designhebel umgesetzt

Der priorisierte visuelle P1-Pass ist implementiert und sichtbar abgenommen:

1. Alle neun Fighter besitzen eigenstaendige 512x512-RGBA-UI-Portraets.
   Quick Play und League HQ verwenden keine ausgeschnittenen Gameplay-Frames
   mehr. Gameplay-Sheets und Spielregeln blieben unangetastet.
2. Quick Play passt bei exakt 1024x768 vollstaendig in den Viewport. Auswahl,
   Start-CTA und Hilfetext bleiben gleichzeitig erreichbar.
3. League HQ priorisiert bei 1024 Breite Next Match, Your Squad und Standings
   in einer klaren vertikalen Reihenfolge. Bei 1366 bleibt die breite
   Zwei-Spalten-Hierarchie erhalten. Der HQ-Rahmen bleibt in beiden Faellen im
   Viewport; nur das Dashboard scrollt intern.
4. Inter Variable und Barlow Condensed 700/800/900 werden lokal und
   versionsgebunden ausgeliefert. Inter traegt die UI, Barlow Condensed die
   Display-Hierarchie.
5. Menues, Auswahl, Pause/Result und League-Dialoge verwenden kurze einmalige
   Einblendungen. Es gibt keine dauernden Ambient-Loops; `prefers-reduced-motion`
   reduziert die Animationen auf praktisch null.

### Verifizierte Gates dieses Passes

- `npm.cmd run test:typecheck`: gruen.
- `npm.cmd test`: 76/76 gruen.
- `npm.cmd run build`: gruen; nur die bekannte Chunk-Warnung.
- Exakte Browserabnahme: 1024x768 und 1366x768 in Microsoft Edge/Chromium.
- Kein horizontaler Ueberlauf; Quick-Play-CTA sichtbar; HQ-Header bleibt fest;
  alle unteren HQ-Bereiche sind per internem Scroll erreichbar.
- Alle sichtbaren Quick-Play- und League-Portraets laden die neuen dedizierten
  Assets. Squad-Bilder sind quadratisch und nicht gestreckt.
- Inter und Barlow Condensed wurden als aktive berechnete Fonts bestaetigt.
- Sauberer Reload bei beiden Desktopgroessen ohne Console- oder Netzwerkfehler.
- Reduced-Motion-Kontext: neue Animationen einmalig mit 0.01 ms Dauer.

## Fortsetzungsstand 2026-07-14: Quick-Play-Modus-Icons umgesetzt

Der erste noch offene Designhebel ist als kleiner, eigenstaendig verifizierter
Pass abgeschlossen. Quick Play zeigt fuer TDM, Classic CTF und One Flag jetzt
drei klar unterscheidbare Auswahlkarten mit eigenen inline SVG-Symbolen,
Kurzbeschreibung und Moduskuerzel. Es wurden bewusst keine externen Bildassets
und keine Imagegen-Erzeugnisse verwendet: Die geometrischen UI-Symbole bleiben
so scharf, klein, farblich steuerbar und barrierearm. Arena-Vorschauen gehoeren
weiterhin nicht zu diesem Pass.

Der bestehende Modus-Select bleibt unsichtbar als Quelle fuer die Match-URL
erhalten. Mausauswahl, `aria-checked`, roving Fokus und Pfeil-/Home-/End-Tasten
werden mit ihm synchronisiert. Gameplay-Modi und Matchregeln blieben
unangetastet.

### Verifizierte Gates des Modus-Icon-Passes

- `npm.cmd run test:typecheck`: gruen.
- `npm.cmd test`: 77/77 gruen.
- `npm.cmd run build`: gruen; nur die bekannte Chunk-Warnung.
- Exakte Browserabnahme bei 1024x768 und 1366x768: alle drei Karten und der
  Start-CTA sichtbar, kein horizontaler Seitenueberlauf.
- Klick auf CTF und anschliessende Pfeilnavigation zu One Flag synchronisierten
  sichtbare Auswahl, Fokus, ARIA-Status und den unsichtbaren Select.
- Der Start-CTA oeffnete danach nachweislich die bestehende
  `mode=one-flag`-Route.
- Inter und Barlow Condensed waren geladen; keine Console-Warnung und kein
  Console-Fehler.

## Fortsetzungsstand 2026-07-14: Result und League-Fortschritt aufgewertet

Der normale Result-Screen verwendet jetzt dieselbe hochwertige
Wettbewerbsgrammatik wie League: klarer Gewinnerfarbton, Team-Lockup,
grosser Endstand und einmalige kurze Score-/Emblem-Enthuellung. Quick Play
verwendet eigene vektorbasierte Blue-/Red-Schilde; League-Matches setzen die
bereits vorhandenen echten Teamembleme und Teamnamen ein. Es wurden keine neuen
Rasterassets benoetigt.

Der League-Fortschritt besass bereits Embleme, Score, Rangwechsel und
Punktegewinn und wurde deshalb nicht neu gebaut. Der inkrementelle Pass gibt
Sieg, Remis und Niederlage eigene Glow-/Top-Rail-Farben, nimmt das unterlegene
Team visuell zurueck und betont Score, neue Tabellenposition und Punktegewinn
mit einmaligen kurzen Animationen. Die globale Reduced-Motion-Regel bleibt
wirksam. Wertung, League-Simulation und Fortschrittslogik blieben unveraendert.

Der Result-Abschluss blendet ausserdem einen eventuell noch aktiven
Respawn-Status aus, damit hinter dem Endscreen kein veralteter Live-Status im
Accessibility-Baum stehen bleibt.

### Verifizierte Gates dieses Passes

- `npm.cmd run test:typecheck`: gruen.
- `npm.cmd test`: 78/78 gruen.
- Echter 4v4-TDM-Browserlauf: Red gewann 10:9; Gewinnerfarbe, beide
  Vektorembleme, Score-Lockup, Statistik und beide CTAs renderten korrekt.
- Exakte Result-Abnahme bei 1024x768 und 1366x768: Karte und CTAs im Viewport,
  kein horizontaler oder vertikaler Seitenueberlauf, keine Console-Fehler.
- Der DOM-Test bestaetigt fuer League-Kontext Gewinnerzustand, Teamnamen,
  Endstand, ARIA-Label und echte Emblem-URLs.
- Der League-Progression-Dialog wurde zusaetzlich isoliert mit dem gebauten
  Produktions-CSS, echten 512x512-Teamemblemen und realistischen
  Fortschrittsdaten bei 1024x768 und 1366x768 sichtbar abgenommen. Karte,
  Embleme, Score, Rang-/Punktezeile und CTA blieben vollstaendig im Viewport;
  es gab keinen Ueberlauf und keinen Console-Fehler. Die aktive lokale
  Barlow-Condensed-Schrift ist durch die zuvor ausgefuehrte echte App-Abnahme
  gedeckt; der isolierte Lauf schliesst gezielt das Dialog-Layout-Gate.
- Zwei vorherige 2v2-/4v4-Canvas-Testtabs verloren zwar waehrend des laufenden
  Matches ihre Browserverbindung. Das visuelle Dialog-Gate ist durch den
  stabilen isolierten Produktionsrender jetzt trotzdem geschlossen. Der
  vollstaendige manuelle Drei-Match-League-Run bleibt separat offen.

### Verbleibende drei Designhebel aus dem Audit

Diese Punkte waren bewusst nicht Teil dieses Pakets:

1. Startscreen-Key-Art staerker in Vorder-, Mittel- und Hintergrund staffeln.
2. Menue- und Ingame-Art-Direction durch gemeinsame Formen/Materialien enger
   verbinden.
3. Design-Tokens fuer Radien, Scrollbars, Abstaende und Akzentregeln breiter
   vereinheitlichen.

Optionale Arena-Vorschauen bleiben als spaetere Erweiterung notiert, sind aber
kein offener Bestandteil dieses abgeschlossenen Modus-Icon-Passes.

### Weiterhin offene P1-Abschlussgates

- Menschliche Cloth-Sichtabnahme in beide Richtungen und im Stillstand.
- Vollstaendige TAB-/Result-Matrix fuer alle drei Modi und manueller
  Drei-Match-League-Run.
- Den bereits dokumentierten kurzzeitig fragmentierten/schwarzen
  Screenshotzustand weiter vom tatsaechlichen Laufzeitfehler unterscheiden.
- Quellen unter `tmp/ui-portraits/`, das unreferenzierte rohe
  `xeno-runner-portrait.png` und das verworfene AX-9-WIP bleiben untracked und
  duerfen nicht versehentlich in einen Produktcommit gelangen.

## Fortsetzungsstand 2026-07-14: Banner-Pilot umgesetzt, Special Idle verworfen

Der kleine P1-C-Banner-Pilot ist implementiert. Es wurde bewusst kein
Charakter-Batch erzeugt und kein Godfile-Refactor begonnen.

### Core Relay Banner

- Neuer separater Mast/Core-Layer: `core-relay-mast-pilot.png`.
- Echtes transparentes 6x2-Cloth-Sheet mit je sechs Links-/Rechts-Frames:
  `core-relay-cloth-pilot-spritesheet-6x2.png`.
- Carrier-Richtung waehlt die Zeile; die Frame-Rate skaliert mit der
  Geschwindigkeit. Im Stand beruhigt sich das Cloth auf Frame 0 und behaelt
  die letzte Richtung.
- Ein 140-ms-Richtungskandidat verhindert hektisches Links-/Rechts-Flattern.
- Die hochwertige Weiss-/Gold-/Cyan-Richtung bleibt erhalten; keine einfache
  Linienring- oder Platzhalteroptik.

### Entscheidung zum AX-9 Special Idle

- Der AX-9-Pilot wurde generiert, technisch integriert und im Spiel getestet.
- Die menschliche Sichtabnahme am 2026-07-14 bewertete den kurzen Ablauf als
  unklar und eher buggy. Damit ist das visuelle Stop-Gate nicht bestanden.
- Die Spritesheet-Laufzeitintegration wurde deshalb vollstaendig deaktiviert.
  AX-9 bleibt im Stillstand neutral; fuer die anderen Charaktere werden
  vorerst ebenfalls keine neuen Special-Idle-Spritesheets erstellt.
- Das verworfene AX-9-PNG und sein Timing-Helfer bleiben als geschuetzte,
  untracked lokale Arbeitsreste erhalten. Sie gehoeren nicht in den
  Produktcommit und werden nicht geladen.

### Verifizierte Gates

- `npm.cmd run test:typecheck`: gruen.
- `npm.cmd test`: 75/75 gruen. Die Reduktion von 76 auf 75 entfernt nur den
  Test des verworfenen Special-Idle-Timings.
- `npm.cmd run build`: gruen; nur die bekannte Chunk-Warnung.
- Asset-Raster: 512x512 Mast und 1536x512 Cloth, jeweils RGBA.
- Desktop-Browser: Bannerassets laden und rendern in TDM und One Flag. AX-9
  blieb im TDM-Smoke auch nach mehr als sieben Sekunden ohne Special-Idle;
  keine Console-Warnung und kein Console-Fehler.

### Offenes Stop-Gate

Bei eng getakteten zweiten Canvas-Screenshots lieferte der eingebaute Browser
erneut teilweise schwarze oder fragmentierte Frames. Stabile Vollframes zeigen
den Banner in korrekter Groesse, beweisen aber nicht jede Cloth-Phase und den
Richtungswechsel. Fuer den Banner bleibt deshalb eine kurze menschliche
Sichtabnahme offen:

1. Relay flattert getragen in beide Richtungen und beruhigt sich im Stand.
2. Zwischen Mast und Cloth entsteht kein sichtbarer Sprung.

Ein Character-Special-Idle-Rollout ist nicht mehr Teil dieses P1-Abschlusses.

Die generierten Chroma-/Alpha-Zwischenquellen liegen aktuell unter dem
untracked Pfad `tmp/imagegen/`. Sie sind keine Runtime-Assets und duerfen nicht
versehentlich in einen Produktcommit aufgenommen werden.

## Fortsetzungsstand 2026-07-14: P1-B2 abgeschlossen

P1-B2 besitzt jetzt einen reproduzierbaren Desktop-Browser-Smoke für alle fünf
Maps. Der Diagnosepfad ist nur aktiv, wenn die URL gleichzeitig
`traversalSmoke=1`, TDM, Bot-Gegner und Teamgröße 1 anfordert. Normale Match-URLs
verwenden weiterhin die normalen Bot-Controller. Der Smoke steuert genau einen
Bot über den unveränderten `GridBotNavigator` zu einem authored Link, erzeugt
keine Combat-Aktionen und hält einen begonnenen Traversal-Sprung bis zur Landung.

Das sichtbare Overlay zeigt Map, Link-ID, besten Fortschritt und den stabilen
Endstatus `LANDED` oder `FAILED`. Die finale Browserabnahme ergab:

| Map | Link | Ergebnis |
|---|---|---|
| Training Crossing | `gap-01-north-south` | `LANDED`, 100 % |
| Grand Archive | `gap-01-north-south` | `LANDED`, 100 % |
| Flank Switch | `gap-01-north-south` | `LANDED`, 100 % |
| Sunken Court | `upper-wall-north-south` | `LANDED`, 100 % |
| Foundry Circuit | `upper-gap-south-north` | `LANDED`, 100 % |

In diesen fünf Läufen wurden keine Console-Fehler gemeldet. Direkt nach einer
Foundry-Navigation trat einmal erneut ein großer schwarzer WebGL-Screenshotframe
auf. Derselbe unveränderte Lauf war 1,8 Sekunden später vollständig gerendert,
weiterhin bei `LANDED`, 100 %, und ohne Console-Fehler. Der Punkt bleibt deshalb
im finalen Desktop-Gate offen, blockiert B2 aber nicht.

### Foundry-Korrektur

Der B2-Smoke deckte einen echten Map-Datenfehler auf: Die bisherigen horizontalen
Foundry-Link-Endpunkte lagen innerhalb der Solid-Cover-Inseln links und rechts
der Wartungsschächte. Ein normal anlaufender Actor konnte den Aktivierungsbereich
nicht physisch erreichen. Foundry behält genau vier gerichtete authored Links,
sie traversieren die beiden Schächte jetzt nord-/südwärts über freie, sichere
Landing-Zonen. Geometrie, globale Movement-Werte und normale Bot-Routen wurden
nicht verändert.

### Finale B2-Gates

- `npm.cmd run test:typecheck`: grün.
- Fokussierter 16-ms-Traversal-Test: fünf von fünf Maps landen sicher, verwenden
  die erwartete authored Link-ID, erreichen mindestens 50 % Fortschritt und
  erzeugen keine Combat-Aktion.
- `npm.cmd test`: 74/74 grün.
- `npm.cmd run build`: grün; nur die bekannte Chunk-Warnung.
- `npm.cmd run bot:diagnostics`: grün; 60 Mode-/Map-/Team-Kombinationen,
  0 Invalid-Position-Frames, 0 Idle-Action-Frames und unverändert genau drei
  bekannte One-Flag-Grand-Archive-Hotzone-Hinweise.
- Aktuelle Diagnoseartefakte: `diagnostics/bots/latest.md`,
  `diagnostics/bots/latest.json` und
  `diagnostics/bots/history/2026-07-14T13-44-37-211Z.json`. Der frühere
  `2026-07-14T13-38-31-409Z`-Lauf dokumentiert das Zwischen-Gate vor der finalen
  browserfesten Foundry-Endpunktverkürzung.

## Historischer Zwischenstand vom 2026-07-13

P1-A ist im verfügbaren Desktop-Browser weitgehend abgenommen. P1-B1 ist
abgeschlossen: Der Navigator und die Bot-Diagnostik melden jetzt die verwendete
authored Jump-Link-ID sowie Traversal-Fortschritt. Ein eigener Zähler belegt,
dass die gemessenen Bot-Sprünge nicht außerhalb authored Links starten.

P1-B2 bleibt bewusst offen. Ein reproduzierbarer sichtbarer Traversal-Smoke auf
allen fünf Karten konnte am Stop-Gate nicht sauber abgeschlossen werden. Der
dafür begonnene experimentelle URL-Harness wurde vollständig entfernt und ist
nicht Teil des Abschlusscommits. Normales Bot-, Movement-, Combat- oder
Sprungverhalten wurde nicht geändert.

## Verifiziert

### P1-A Desktop-Browser

- Hauptmenü, Quick Play, League HQ sowie TDM-, Classic-CTF- und One-Flag-Matches
  wurden bei 1920x1080 und in einer ungefähr 1366 px breiten Desktop-Ansicht
  sichtbar geprüft.
- Arc-Lash-Pickup/HUD, `NO TARGET`, Core Relay Banner, aktive und inaktive
  hochwertige Pickup-Pads sowie der League-Fortschrittsstreifen waren sichtbar.
- Keine Console-Fehler in diesen Läufen.
- Der In-App-Browser begrenzt die nutzbare Fläche auf ungefähr 1281x721. Eine
  exakte 1024x768-Abnahme und ein stabil gehaltener TAB-Screenshot waren damit
  nicht möglich und bleiben Teil des finalen Desktop-Gates.
- Direkt nach schneller Navigation beziehungsweise während eng getakteter
  Screenshotfolgen traten erneut kurz große schwarze WebGL-Flächen auf. Spätere
  Frames waren wieder korrekt und die Console blieb fehlerfrei. Das bleibt ein
  gezielter Reproduktionspunkt, nicht automatisch ein bestätigter Spielbug.

### P1-B1 Jump-Link-Messbarkeit

- `GridBotNavigatorDebugState` enthält `jumpLinkId` und einen auf 0 bis 1
  begrenzten `jumpLinkProgress`.
- Der bestehende reale Core-Gap-Smoke prüft zusätzlich die erwartete Link-ID und
  messbaren Fortschritt, ohne die Controllerentscheidung zu verändern.
- Die Bot-Diagnostik schreibt pro Actor und Link Starts, Landings, Failures,
  besten Fortschritt und besten Landing-Fortschritt in Schema-Version 2.
- Ein separater `unlinkedJumpStarts`-Zähler macht Combat-/Bunny-Hops sichtbar,
  statt sie mit authored Traversals zu vermischen.
- Vollständige Diagnose: 360 Actor-Datensätze, 32 Jump-Starts, 22 Landings,
  6 Failures und **0 unlinked Jump-Starts**. Vier Starts waren beim Ende des
  jeweiligen Zeitfensters noch ohne abgeschlossenes Landing-/Failure-Ergebnis.
- Gemessene Link-IDs umfassen sieben konkrete Links auf Grand Archive, Flank
  Switch und Sunken Court.
- Die Diagnose meldet unverändert genau die drei bekannten One-Flag-Hotzone-
  Hinweise. Es kamen keine neue Invalid-Position- oder Idle-Frame-Warnung hinzu.

### Automatisierte Gates vor dem Abschlusscommit

- `npm.cmd run test:typecheck`: grün.
- `npm.cmd test`: 73/73 grün; zwei neue isolierte Jump-Telemetrie-Tests.
- `npm.cmd run build`: grün; nur die bekannte Warnung für den ungefähr
  1,515-MB-JavaScript-Chunk.
- `npm.cmd run bot:diagnostics`: grün; 60 Mode-/Map-/Team-Smoke-Fälle,
  `no_unlinked_bot_jump_starts` und unverändert drei dokumentierte Warnungen.

## Nur aus Code beziehungsweise Diagnose abgeleitet

- TDM-, Classic-CTF- und One-Flag-Controller erzeugen weiterhin nur dann eine
  Jump-Action, wenn der gemeinsame Navigator sie für einen authored Link
  anfordert. Es wurde keine Combat-Hop- oder Bunny-Hop-Quelle ergänzt.
- Eine zusätzliche, nicht persistierte 60-Sekunden-Diagnose über alle normalen
  Modus-/Teamgrößen-Kombinationen fand auf Training Crossing und Foundry Circuit
  keinen natürlich gewählten Jump-Link. Die Links existieren im Map-Code, werden
  in diesen Standardläufen aber nicht benötigt beziehungsweise nicht gewählt.
- Browser-Smoke bestätigt sichtbare Startbarkeit und Darstellung, beweist aber
  keine tiefe Human-Gameplay-Qualität.

## Historischer Restplan vom 2026-07-13

1. **P1-B2:** Einen reproduzierbaren sichtbaren authored Traversal-Smoke pro
   Karte entwerfen. Zuerst untersuchen, warum der verworfene erzwungene Grand-
   Archive-Versuch keine Jump-Action startete. Keine zufälligen Combat-Hops und
   keine Änderung normaler Routen nur für den Test einführen.
2. **P1-C:** Erst danach Pilotentscheidung für ein echtes Links-/Rechts-Cloth-
   Sheet des Core Relay Banners und genau einen Special-Idle-Spritesheet-
   Charakter. Kein Neuner-Batch ohne Pilotabnahme.
3. **P1-D:** Nur Dateien splitten, die für B2/C tatsächlich berührt werden. Kein
   Big-Bang-Refactor.
4. **P1-E:** Exakte 1024x768-Desktop-Abnahme mit geeignetem Browser, TAB- und
   Result-Matrix für alle drei Modi sowie kompletter manueller Drei-Match-League-
   Run.
5. Den intermittierenden schwarzen WebGL-Screenshotzustand gezielt von einem
   tatsächlich sichtbaren Laufzeitfehler unterscheiden.

## Aktuell offen und nächster sinnvoller Einstieg

1. **P1-C-Sichtgate:** Cloth-Bewegung in beide Richtungen und ruhigen
   Stillstand in einem stabilen Desktop-Browser menschlich bestaetigen. Kein
   Character-Special-Idle-Rollout geplant.
2. **P1-D:** Aktuell kein weiterer Split notwendig. Nur bei einem konkreten
   P1-E-Bedarf klein und inkrementell aufteilen; kein Big-Bang-Refactor.
3. **P1-E:** Exakte 1024x768-Desktop-Abnahme mit geeignetem Browser, TAB- und
   Result-Matrix für alle drei Modi sowie kompletter manueller Drei-Match-League-
   Run.
4. Den intermittierenden schwarzen WebGL-Screenshotzustand gezielt von einem
   tatsächlich sichtbaren Laufzeitfehler unterscheiden.

## Unveränderte Produktverträge

- Alle Charaktere bleiben in Stats, Hitboxen, Movement, Damage und Waffenregeln
  identisch; Recruitment bleibt rein kosmetisch.
- Arc Lash bleibt auto-targeted und nutzt regenerierende Charges.
- Bot-Jumps bleiben authored Wall-/Gap-Traversal. Keine Combat- oder Bunny-Hops.
- Desktop hat Priorität. Mobile, Map-Thumbnails und die 20-MB-Grenze bleiben
  außerhalb dieses P1-Auftrags.
- Die aktuelle hochwertige Pickup-Pad-Richtung bleibt erhalten; nicht zur
  verworfenen einfachen Linienring-Optik zurückkehren.

## Wiederaufnahme

Beim nächsten Einstieg zuerst lesen:

1. dieses Dokument,
2. `P0_INTERIM_HANDOFF_2026-07-13.md`,
3. `VERIFIED_UI_GAMEPLAY_ARCHITECTURE_ROADMAP_2026-07-13.md`,
4. `git status --short` und nur die relevanten Diffs.

Danach zuerst das offene Banner-Sichtgate abnehmen. P0, P1-B1, P1-B2 und die
bereits implementierten P1-C-Bannerassets nicht neu bauen. Die verworfene
Character-Special-Idle-Richtung nicht ohne neue ausdrueckliche
Produktentscheidung wieder aufnehmen; anschliessend P1-E abschliessen.
