# CTF-3.0 Project Status - 2026-07-13

## Kurzurteil

Phase 0 ist technisch abgeschlossen. Der erste Hero-Map-/Combat-/CTF-KI-Slice
und die Arena-League V1 sind implementiert. Tests, Build, Bot-Diagnostik und
HTTP-Smoke sind gruen. Die visuelle Browserabnahme bleibt offen, weil auch der
erneute Verbindungsversuch keinen steuerbaren Browser in der
Ausfuehrungsumgebung gefunden hat.

Dieses Dokument ist zusammen mit `ARENA_LEAGUE_IMPLEMENTATION_PLAN.md` die
aktuelle Einstiegssicht fuer CTF-3.0. Die aelteren V2-Dokumente bleiben als
historische Architektur- und Verhaltensreferenz erhalten.

## Produktkurs

- Desktop-first Arena League gegen KI
- Classic CTF als erster Hero-Modus
- Mobile spaeter als eigenes vereinfachtes Control-Profil
- vorhandenen Gameplay-Core weiterverwenden, kein Total-Rewrite
- das produktnahe Arenen-Set bleibt vorerst auf vier klar profilierten Maps;
  weitere Waffen, Charaktere und Maps erst nach dem Nachweis des Core Loops

## Arena-League V1

- Fullscreen-Hauptmenue mit `League` und `Quick Play`
- sechs Teams und zwoelf benannte Charaktere mit Rolle, Eigenschaft und Rating
- zehn Spieltage als vollstaendige Doppelrunde
- Tabelle mit Siegen, Capture-Differenz und Ligapunkten
- eigene Zwei-Personen-Mannschaft, Gegnerakte und Charakter-Statistiken
- direkter 2v2-CTF-Spielstart auf Foundry Circuit
- Matchresultat und echte Spielerstatistiken fliessen in den Saisonstand ein;
  die beiden anderen Begegnungen werden deterministisch simuliert
- genau ein Transferfenster nach Spiel fuenf: Rivalen rekrutieren oder Kader
  behalten; keine Waehrung und kein Goldsystem
- versionierter lokaler Spielstand unter `core-arena.league.v2`
- kompakter Founders Circuit mit drei Matches gegen drei Rivalen
- kuratierter Einstiegsbogen ueber TDM, One Flag und Classic CTF mit jeweils
  passender Arena statt drei identischer CTF-Partien
- einmaliges Contract Briefing zeigt vor Saisonstart Modi, Arenen und Rivalen;
  danach fuehrt der Career-Einstieg direkt ins League HQ
- League HQ nutzt die Vierer-Tabelle kompakt und zeigt den Arena-Pfad direkt
  neben der ausgewaehlten Teamakte
- Arena-Pyramide als sichtbarer Karrierepfad; Solar Wardens und Void Runners bleiben fuer die naechste Liga vorgemerkt
- deterministische Gegnerergebnisse aus Teamstaerke, Stilprofil, Form und Matchup statt reinem Zufall oder versteckter Vollsimulation
- eigener Post-Match-Fortschrittsmoment mit Ergebnis, Tabellenbewegung, Ligapunkten und Aufstieg
- unbekannte oder beschaedigte Saves werden nicht geladen
- neue League-Logik liegt getrennt vom Gameplay-Core in `src/meta/league/`
- neues Menue-Key-Art: `public/assets/league-menu-arena-v1.png`
- Career und Quick Play verwenden denselben Subpage-Header mit identisch
  positioniertem `Main Menu`-Button links und kontextspezifischen Aktionen rechts
- das Hauptmenue verwendet kein vollflaechiges Glass-Panel mehr; lokale Scrims
  halten Text lesbar und lassen den groessten Teil des Arena-Key-Arts sichtbar
- sechs individuelle Teamembleme ersetzen die bisherigen Buchstabenkuerzel in
  Tabelle, Matchkarte, Teamakte, Saisonstart und Saisonabschluss
- ein zentrales Core-Arena-League-Emblem verbindet Hauptmenue, Career-Header
  und den visuellen League-Auftritt

## Character Skin Batch

- Neun aktive hochwertige Skins: Briarhorn, AX-9 Mantis, Null Courier,
  Aegis Vanguard, Xeno Runner, Volt Hound, Mirejaw, Scrapwing und Prism Bastion
- je Skin ein transparentes 6-x-4-Spritesheet mit 24 Frames bei 128 x 128 Pixeln
- vier Richtungen, vierteiliger Laufzyklus und eigener Jump-Frame
- in Quick Play ueber eine klickbare Galerie mit neun Portraits und grosser
  Vorschau direkt auswaehlbar; das reine Namens-Dropdown ist ersetzt
- globale kosmetische Skinpraeferenz wird lokal gespeichert
- Skin kann auch in der League HQ jederzeit gewechselt werden und wird in das
  naechste Ligamatch uebernommen
- alte Marines, Riot Droid und das alte Alien-Sheet werden nicht mehr geladen
  oder in Menues angeboten; vorhandene Einstellungen werden kompatibel auf
  Aegis Vanguard, AX-9 Mantis beziehungsweise Xeno Runner migriert
- League-Charakterkarten und Match-Bots verwenden nur noch die neue Neuner-
  Auswahl; alte Dateien bleiben vorerst als Rollback-Material unangetastet
- Skins sind vorerst frei verfuegbar; ein spaeteres Unlock-System kann auf
  Profilebene ergaenzt werden, ohne Saison-Saves zu veraendern
- Animationsrichtung verwendet die letzte echte Bewegungsrichtung. Diagonale
  Spruenge priorisieren die horizontale Blickrichtung, Null Couriers Down-Zyklus
  verwendet eine ruhigere Schrittfolge und Xeno Runner besitzt ein neu
  normalisiertes Sheet mit gerader Vorder-/Rueckenansicht sowie
  richtungskorrekten Jump-Frames

## Phase-0-Aenderungen

### Movement und Jump

- `V2_GROUND_PARITY_CONFIG` verwendet wieder:
  - Beschleunigung `1580`
  - Maximalgeschwindigkeit `228`
- Grund: Der zwischenzeitliche mobile Wert `150` machte vorhandene authored
  Jump-Traversals physikalisch unerreichbar und widersprach dem neuen
  Desktop-first-Kurs.
- Der Smoke prueft weiterhin, dass die konfigurierte Speed-Grenze tatsaechlich
  eingehalten wird, koppelt die generische Pruefung aber nicht doppelt an eine
  hartcodierte Zahl.
- Foundry Circuit besitzt als Desktop-first-Ausnahme zwei echte, optionale
  Wartungsschacht-Shortcuts. Sichere Umwege bleiben offen; authored
  `jumpLinks` fuehren Bots ueber die riskantere Abkuerzung.
- Mobile soll spaeter ueber Input-Magnitude, Aim-Hilfe und Traversal-Toleranz
  entschaerft werden, nicht ueber einen langsameren gemeinsamen Core.

### TDM-Bots

- Slots 2 bis 4 behalten nun auch im Nahkampf eine begrenzte Lane-Gewichtung.
- Dadurch laufen mehrere Teammitglieder seltener exakt auf denselben
  Standoff-Punkt.
- TDM Training Crossing 4v4 liegt ohne Basic Attack im aktuellen Diagnoselauf
  bei `55/372` Cluster-Frames fuer Blue/Red. Das fruehere 40-Prozent-Gate hing
  an haeufigen Basic-Kills, die Formationen laufend zuruecksetzten. 4v4 bleibt
  ein Beobachtungspunkt; Produktgate ist derzeit 2v2.

### Desktop-Aim und Bot-Railgun

- Der Desktop-Adapter berechnet die Schussrichtung jetzt von der echten
  Actor-Position zur per Kamera umgerechneten Maus-Weltposition.
- Zuvor wurde faelschlich die Bildschirmmitte als Ursprung verwendet. An
  Kartenraendern, an denen die Kamera nicht weiter scrollen kann, lag der Actor
  aber nicht in der Bildschirmmitte; dadurch wich der Schuss vom Cursor ab.
- Die Railgun des Spielers behaelt Schaden, Reichweite und Praezision.
- Nur Bot-Railgun-Aim erhaelt zwischen bevorzugter Rail-Distanz und maximaler
  Reichweite einen linear groesser werdenden, deterministischen Streufaktor.
  Der maximale Faktor betraegt `2.5`.
- Weltkoordinaten-Aim und distanzabhaengige Rail-Streuung sind durch eigene
  Regressionstests abgesichert.

### Waffen-HUD und Cooldowns

- Desktop verwendet fuer aufgesammelte Waffen ein flaches Dock direkt am
  unteren Bildschirmrand: Rocket `Q`, Rail `E`, Whip `F`. Gegenueber dem
  vorherigen Stand ist es etwa ein Viertel schmaler und deutlich flacher.
- Die Leiste ist eine reine Statusanzeige. Desktop feuert die Spezialwaffen
  direkt per Q/E/F; es gibt bewusst keinen Basic Attack, keinen aktiven
  Weapon-Switch und keine Mausradbelegung.
- Die Slots bleiben unabhaengig von Pickup-Reihenfolge und Bildschirmgroesse
  stabil. Tastaturhinweise und Ammo-Badges stehen direkt am jeweiligen Icon.
- Mobile verwendet Jump als rechten Daumenanker. Der tote Basic-FIRE-Button ist
  im Produktpfad ausgeblendet; Whip, Rocket und Rail bleiben im Ability-Bogen.
- Die Waffenicons verwenden nun eine gemeinsame sichtbare Zielgroesse statt
  asset-abhaengiger, unterschiedlich grosser Skalierungen.
- Alle Spezialwaffen inklusive Rocket verwenden einen radialen Cooldown-Wipe:
  Die verbleibende Zeit liegt als grauer Sektor ueber dem farbigen Icon, der
  bereits verstrichene Anteil wird im Uhrzeigersinn freigelegt.
- Eine zusaetzliche Sekundenanzeige in der Icon-Mitte erleichtert exaktes
  Timing. Eingaben waehrend Cooldowns werden nicht gepuffert.

### Foundry Circuit und Ressourcen

- `flow-circuit-v2` heisst im Produktmenue nun Foundry Circuit und ist die
  Standardarena fuer Classic CTF 2v2.
- Drei lesbare Routen trennen Praezision/Jump-Risiko, schnellen Objective-Weg
  und gedeckten Splash-Kampf. Lange Rail-Sichtlinien bleiben durch Coverinseln
  gebrochen.
- Sichere Whip-Pickups nahe den Basen verhindern waffenlose Starts ohne eine
  kostenlose permanente Standardwaffe. Rail liegt einzeln umkaempft, Rockets
  liegen im unteren Weg und an dessen Mitte.
- Arena-Pickups respawnen nach `12 s` statt `20 s`. Werte: Health `35`, Armor
  `25`, Rocket `3`, Rail `2`, Whip `5`.
- Die zuvor seitenverkehrte blaue Verteidigerroute von Flow Circuit ist
  korrigiert.

### Classic-CTF-Team-KI

- Der Slot-2-Verteidiger bleibt zu Hause, solange der menschliche Carrier noch
  tief in der gegnerischen Haelfte ist.
- Ab `45 %` Rueckwegfortschritt eskortiert er, sofern die eigene Flagge sicher
  ist. Eine gegnerische Flagge, die mindestens `55 %` des Rueckwegs geschafft
  hat und fallen gelassen wird, nimmt er auf.
- Eigene gestohlene oder fallengelassene Flaggen bleiben immer hoeher
  priorisiert; danach kehrt er automatisch zur Basisverteidigung zurueck.

### HUD und Basic Attack

- Basic Attack ist im Produkt-Runtime-Setup fuer Menschen und Bots vollstaendig
  abgeklemmt. Die Core-Faehigkeit bleibt nur als opt-in Test-/Referenzpfad.
- Die unteren BLUE-P1- und RED-BOT-Felder sind deaktiviert, damit sie weder
  Kacheln noch Kampfgeschehen verdecken.
- Das obere HUD besteht nur noch aus einer schmalen Score-/Timer-Zeile.
  `RED HOME` und `BLUE HOME` werden nicht mehr dargestellt; eine zweite,
  kurz gehaltene Zeile erscheint nur bei getragener oder fallengelassener
  Flagge.
- HUD-Text verwendet groessere Arial-Systemschrift, ganzzahlige Positionen und
  bis zu zweifache Texturaufloesung fuer schaerfere Canvas-Darstellung.
- Die permanente Steuerungszeile unten mittig ist entfernt. Matchstatistiken
  erscheinen am Desktop nur solange TAB gehalten wird, pausieren das Spiel
  nicht und schliessen auch bei Fokusverlust. Der alte Stats-Button bleibt nur
  fuer Touch-Steuerung erhalten.

### Teamkommandos

- Im Desktop-CTF kann der Spieler den blauen KI-Mitspieler mit `1 Defend`,
  `2 Follow` oder `3 Attack` steuern. Erneutes Druecken desselben Befehls
  schaltet zurueck auf `Auto`.
- `Follow` haelt einen Zielabstand von etwa `80-145` Einheiten und laesst den
  Bot weiterhin Gegner anvisieren und seine gesammelten Waffen einsetzen.
- Eigene gestohlene oder fallengelassene Flaggen ueberschreiben jeden manuellen
  Befehl als Notfallprioritaet.
- Eine kompakte Leiste links oben zeigt dauerhaft den aktiven Zustand
  `BOT: AUTO/DEFEND/FOLLOW/ATTACK` und darunter die Belegung
  `1 DEFEND`, `2 FOLLOW`, `3 ATTACK`. Auf Touch und sehr schmalen Viewports
  bleibt die Leiste ausgeblendet.
- Die drei Taktiken sind auch direkt anklickbar. Tastatur und Klick verwenden
  denselben Toggle-Zustand; erneute Auswahl der aktiven Taktik setzt `Auto`.
- Die Bot-Leiste verwendet groessere Schrift und mindestens zweifache interne
  Texturaufloesung, um die bisher unscharfe Kleinstdarstellung zu vermeiden.

### Scoreboard und Killfeed

- Das nicht pausierende TAB-Scoreboard verwendet ein dunkles Arena-Panel mit
  dichter Teamgruppierung statt einer weit auseinandergezogenen hellen
  Tabelle. Spieler werden innerhalb ihres Teams nach Impact sortiert.
- Sichtbar sind Kills, Deaths, K/D, Captures, Returns und Impact. Impact
  gewichtet Kills und Objective-Beitraege, zieht Deaths ab und markiert den
  aktuell staerksten Spieler als MVP.
- Unter Score-/Objective-HUD erscheinen maximal drei Killmeldungen fuer rund
  `4.2 s`. Rocket, Rail und Whip verwenden vorhandene Waffen-Icons; Fall und
  Suicide verwenden eigene Symbole. Angreifer und Opfer sind teamfarbig.
- Der Core uebergibt die tatsaechliche Waffe nun bis zum `actor.died`-Event,
  damit der Killfeed die Ursache nicht aus zeitlich benachbarten Events raten
  muss.

### Ergebnisflow, League-Portraits und Arenen-Set

- Der Match-Endscreen verwendet nun dieselbe dunkle Arena-Sprache wie das
  TAB-Scoreboard und die neuen Hauptmenues. Das alte fast weisse Kartenpanel
  ist entfernt; Tabelle, Typografie und Aktionen bleiben kompakt erfassbar.
- League-Charakterportraits sind echte quadratische Sprite-Zellen. Sie werden
  nicht mehr von 128-x-128 auf ein hochformatiges Feld gestreckt.
- `flow-lab-v2` ist als `Sunken Court` produktisiert: Ruineninszenierung,
  drei lesbare Routen, ein echter Chasm-Shortcut und sichere Umwege.
- Grand Archive besitzt wieder vier sichtbare Collapsed-Floor-Shortcuts.
  Base-Railguns wurden entfernt; Rail-Kontrolle entsteht in der umkaempften
  oberen Galerie.
- Flank Switch besitzt wieder vier echte Wartungsgruben samt Switch-Gates.
  Auch dort liegt Rail nur noch umkaempft und nicht sicher in beiden Bases.
- Alle drei Arenen behalten gespiegelte Geometrie, blockierte Spawn-Sichtlinien,
  authored Jump-Links und mindestens einen sicheren Weg um riskante Gaps.

### Pickup-Diagnostik

- Die semantische No-Progress-Erkennung verwendet nun eine kleine
  `0.5`-Distanz-Toleranz statt pauschal mindestens `4` Einheiten Fortschritt pro
  Frame zu verlangen.
- Health-, Armor- und Weapon-Pickup-Szenarien sammeln ihre Ziele wieder im
  vorgesehenen Diagnosefenster ein.

## Verifizierte Gates

Ausgefuehrt am 2026-07-13:

- `npm.cmd test`
  - Ergebnis: `56/56` Tests bestanden
- `npm.cmd run build`
  - Ergebnis: erfolgreich
  - Hauptchunk: `1,494.12 kB`, gzip `409.88 kB`
  - bekannte Vite-Warnung fuer Chunks ueber `500 kB`
- `npm.cmd run bot:diagnostics`
  - Ergebnis: erfolgreich
  - Basic Shots in allen Produkt-Szenarien: `0/0`
  - volle Smoke-Matrix: `60` Kombinationen
  - invalide Positionsframes: `0`
  - leere Bot-Action-Frames: `0`
- lokaler HTTP-Smoke auf `127.0.0.1:4173`
  - Root: HTTP `200`
  - Classic CTF / Foundry Circuit / 2v2 / Keyboard Route: HTTP `200`

Aktuelle Diagnoseartefakte:

- `diagnostics/bots/latest.md`
- `diagnostics/bots/latest.json`
- `diagnostics/bots/history/2026-07-13T15-31-12-615Z.json`

## Nur aus Code und Headless-Diagnostik abgeleitet

- authored Jump-Traversals sind rechnerisch und im Smoke erreichbar
- alle Modi/Maps/Teamgroessen initialisieren und Bots erzeugen Aktionen
- TDM-Clustering ist gegen das vorhandene Diagnose-Gate verbessert

Diese Punkte sind noch kein Beweis fuer gutes subjektives Spielgefuehl.

## Noch nicht visuell verifiziert

- korrigiertes Desktop-Maus-Aim und Q/E/F-Schussrichtung im realen Browser
- subjektives Movement bei `228`
- verkleinertes Waffen-Dock, radialer Cooldown-Wipe, TAB-Scoreboard und
  Botkommando-Leiste im Desktop-Canvas
- Klickflaechen und Schaerfe der Bot-Taktiken sowie Lesbarkeit, Icon-Groesse
  und Ausblendtempo des neuen Killfeeds im echten Match
- mobiler Ability-Bogen und Touch-Lesbarkeit in Landscape
- Jump-Lesbarkeit ueber Hindernisse
- HUD und Trefferfeedback im 2v2-CTF
- Foundry-Circuit-Routen, Wartungsschacht-Spruenge und Pickup-Rhythmus im
  kompletten 2v2-Match
- dunkler Endscreen, quadratische League-Portraits und Animationswirkung von
  Null Courier, Volt Hound sowie dem revidierten Xeno Runner
- Sunken Court, Grand Archive und Flank Switch in kompletten menschlichen
  CTF-/TDM-Matches; Headless-Navigation und Bot-Fortschritt sind gruen
- Touch-Layout nach Wiederherstellung des schnelleren Core-Tempos
- Mobile Landscape auf realen Android-/iOS-Geraeten
- Konsolenfreiheit waehrend eines kompletten Matches

## Offene Risiken

1. Das Desktop-Tempo wurde nach dem ersten Spieltest von `241.2` auf `228`
   reduziert. Der neue Wert ist technisch konsistent, muss aber noch subjektiv
   bestaetigt werden.
2. Die One-Flag-Diagnostik markiert weiterhin dynamische Carrier-/Escort-
   Projektionen als Beobachtungspunkt. Die Tests bleiben gruen.
3. Classic CTF 4v4 und One Flag 3v3/4v4 zeigen teils hohe Cluster-Werte, haben
   aber derzeit kein eigenes Produkt-Gate. Der Hero-Slice startet bewusst 2v2.
4. Der grosse JavaScript-Chunk ist fuer CrazyGames noch zu optimieren.
5. Browser- und reale Geraeteabnahme fehlen noch.

## Roadmap-Einordnung

- Phase 0 - Baseline: technisch abgeschlossen.
- Phase 1 - Desktop Movement/Aim: implementiert; subjektive Langzeitabnahme
  fuer Tempo, Jumps und Richtungslesbarkeit bleibt offen.
- Phase 2 - Combat/Waffenrollen: funktionaler Drei-Waffen-Slice steht;
  menschliche Match-Balance und Langzeit-Ressourcenkontrolle bleiben offen.
- Phase 3 - Classic-CTF-Hero-Slice: funktional komplett mit 2v2-Team-KI,
  Kommandos, Killfeed, Ergebnisflow und vier profilierten Arenen; zehn
  fehlerfreie manuelle Komplettmatches sind noch das Produktgate.
- Phase 4 - Ingame-Onboarding: noch nicht umgesetzt.
- Phase 5 - Liga/Team/Rekrutierung: V1 implementiert; komplette Saison und
  Transferentscheidung muessen manuell abgenommen werden.
- Phase 6 - Mobile-Control-Variante: bewusst verschoben.
- Phase 7 - Produktpolitur: UI-/Branding-/Character-Slice teilweise begonnen,
  aber Audio, Trefferfeedback, Accessibility und Content-Abnahme sind offen.
- Phase 8 - CrazyGames: noch nicht begonnen; Chunking, SDK, Ladezeit,
  Telemetrie und Portal-QA fehlen.

## Verbindliche Gates ab jetzt

Jeder Gameplay-Slice muss mindestens bestehen:

1. `npm.cmd test`
2. `npm.cmd run build`
3. relevante Bot-Diagnostik
4. Desktop-Browser-Smoke
5. Mobile-Landscape-Smoke, sobald Mobile/Input/HUD betroffen ist
6. dokumentierte Trennung zwischen verifiziert, aus Code abgeleitet und offen

## Naechster Schritt

Als Naechstes sollte kein weiterer Content entstehen. Das wichtigste Gate ist
eine strukturierte menschliche Desktop-Abnahme: je mehrere 2v2-Matches auf
Foundry Circuit, Sunken Court, Grand Archive und Flank Switch sowie eine
komplette Liga-Saison. Geprueft werden Laufzeiten, Jump-Shortcuts, waffenlose
Zeit, Rail-Kontrolle, Carrier-Eskorte, Ergebnisfluss und Transferentscheidung.
Danach folgt Phase 4 mit kurzem Ingame-Onboarding; erst anschliessend lohnen
sich weitere Waffen oder Arenen. Trefferfeedback bleibt spaetere Politur und
Eingabepuffer sind als Produktentscheidung ausgeschlossen.
