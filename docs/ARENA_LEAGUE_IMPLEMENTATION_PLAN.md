# Arena League Implementation Plan

Stand: 2026-07-13

## 1. Produktentscheidung

Das Projekt wird nicht komplett neu geschrieben. Die vorhandene V2-Core-Basis
wird weiterverwendet, aber das Produkt wird neu fokussiert.

### Zielbild

Ein schnelles browserbasiertes 2D-Arena-Spiel gegen KI mit:

- Desktop-first-Steuerung und hoher Skill-Ceiling
- Classic CTF als Hero-Modus
- kurzen, wiederholbaren Matches
- einer Solo-Liga mit eigenem Team
- Rekrutierung und Entwicklung von KI-Teammitgliedern
- einer spaeteren, bewusst vereinfachten Mobile-Steuerungsvariante
- CrazyGames als erster geplanter Distributions- und Monetarisierungskanal

### Leitversprechen

Der Spieler soll durch Movement, Aim, Prediction, Waffenwahl, Mapkenntnis und
Objective-Entscheidungen deutlich besser werden koennen. Liga- und
Teamfortschritt sollen motivieren, aber spielerisches Koennen nicht ersetzen.

### Technische Grundentscheidung

Behalten:

- `src/core/` als autoritative Gameplay-Basis
- bestehende GameMode-Grenzen
- WorldMap-Daten und Validierung
- Waffen-, Pickup-, Movement- und Objective-Systeme
- Bot-Controller, Navigation und Diagnostik
- Phaser-Ports und Adaptergrenzen
- bestehende automatisierte Tests als Ausgangspunkt

Gezielt ueberarbeiten oder neu ergaenzen:

- Desktop-Input und Steuerungsdarstellung
- Mobile-Input als eigenes Control-Profil
- Onboarding und Produktfluss
- Liga-, Saison-, Roster- und Rekrutierungssystem
- persistente Spielstaende
- CrazyGames-SDK-Adapter
- kommerzieller Build ohne unnoetige Legacy-Last

## 2. Scope-Regeln

Bis das Grundgeruest bewiesen ist, gelten diese Grenzen:

- keine weiteren Waffen
- keine weiteren Charaktere ausser zwingenden Testvarianten
- keine weitere vollwertige Map neben dem Ausbau der vorhandenen Hero-Map
- kein Online-Multiplayer
- kein allgemeiner KI-Neubau
- kein weiterer Kampagnen-/PvE-Levelpfad
- keine komplexe Item-, Skilltree- oder Ausruestungswirtschaft
- keine Monetarisierung vor einem guten und stabilen Core Loop

Neue Waffen und Charaktere werden erst freigegeben, wenn der Hero-Slice seine
technischen und spielerischen Gates besteht.

## 3. Ziel-Vertikalschnitt

Der erste vollstaendig produktnahe Slice besteht aus:

- Classic CTF
- Foundry Circuit (`flow-circuit-v2`) als erste Fokus-Map
- 2v2: ein Mensch plus ein KI-Mitspieler gegen zwei KI-Gegner
- Desktop-Steuerung
- Rocket, Railgun und Whip; kein Basic Attack im Produktmodus
- etwa drei Minuten Ziel-Matchdauer
- Ergebnisbildschirm mit Matchstatistik
- Liga-Fortschritt nach dem Match
- genau einer klaren Rekrutierungsentscheidung
- lokaler, versionierter Spielstand

TDM dient spaeter als schneller Trainings- oder Einstiegsmodus. One Flag bleibt
erhalten, wird aber erst nach dem Hero-Slice produktseitig gehaertet.

## 4. Phasenplan

## Phase 0 - Baseline stabilisieren

Ziel: Einen ehrlichen, reproduzierbaren Ausgangspunkt herstellen.

Aufgaben:

- [x] Bestehende 30 Tests wieder vollstaendig gruen bekommen.
- [x] Movement-Konflikt zwischen aktuellem `maxSpeed` und altem
      `241.2`-Smoke-Gate fachlich entscheiden und Tests aktualisieren.
- [x] TDM-Team-Clustering reproduzieren und lokal beheben.
- [x] Health-/Armor-/Weapon-Pickup-Simulationen stabilisieren.
- [x] Leere Gap-Geometrie und weiterhin vorhandene Jump-Links bereinigen oder
      als bewusstes Zwischenstadium dokumentieren.
- [x] Aktuelle CTF-3.0-Dokumentation von ueberholten CTF-2.0-Aussagen trennen.
- [x] Verbindliche lokale und CI-Gates festlegen.

Abnahme:

- `npm.cmd test` ist komplett gruen.
- `npm.cmd run build` ist gruen.
- Bot-Diagnostik laeuft reproduzierbar.
- Desktop- und Mobile-Landscape-Smoke starten ohne Konsolenfehler.
- Keine ungeprueften WIP-Aenderungen liegen im Produktpfad.

Status 2026-07-13: Technische Gates sind gruen. Die visuelle Desktop-/Mobile-
Abnahme bleibt offen, weil in der Ausfuehrungsumgebung kein steuerbarer Browser
verfuegbar war. Details stehen in `PROJECT_STATUS_2026-07-13.md`.

## Phase 1 - Desktop Movement und Aiming beweisen

Ziel: Das Spiel muss sich bereits ohne Liga motivierend und praezise anfuehlen.

Vorgesehene Steuerung:

- WASD beziehungsweise tastaturlayoutgerechte Bewegung
- Maus fuer unabhaengiges Aiming
- Maus fuer Zielrichtung; Schuesse nur ueber die direkten Waffentasten
- `Q` fuer Rocket, `E` fuer Rail und `F` fuer Whip als direkte Quick-Casts
- Space fuer Jump
- keine zusaetzliche Dash-/Ability-Taste im ersten Slice

Aufgaben:

- [ ] Desktop-Input aus dem diagnostischen Adapter zu einem klar benannten
      Produktadapter entwickeln.
- [ ] Maus-Aim gegen Kamera, Zoom und verschiedene Viewports absichern.
      Teilstand 2026-07-13: Actor-zu-Cursor-Aim verwendet Weltkoordinaten und
      hat einen Regressionstest; die manuelle Viewport-Abnahme ist noch offen.
- [x] Desktop-Quick-Casts eindeutig festlegen: Spezialwaffen direkt per Q/E/F;
      kein Basic Attack, kein aktiver Weapon-Switch und kein Mausrad.
- [ ] Jump-Rolle festlegen: taktische Abkuerzung, Cover-Ueberquerung oder
      Hazard-Clear; kein nutzloser Zusatzbutton.
- [ ] Movement-Werte in kurzen Vergleichslaeufen testen: Beschleunigung,
      Max-Speed, Richtungswechsel, Air-Control und Jump-Timing.
- [ ] Lesbares Treffer-, Schaden- und Cooldown-Feedback sicherstellen.
      Teilstand 2026-07-13: Desktop-Waffenleiste, mobiler Ability-Bogen und
      radialer Cooldown-Wipe mit Sekundenanzeige sind implementiert; die
      visuelle Abnahme ist noch offen.
- [x] Match-HUD auf eine schmale Score-/Timer-Zeile reduzieren; normale
      `HOME`-Flaggenzustaende ausblenden und nur aktive Flaggenereignisse
      anzeigen.
- [x] Desktop-Waffenanzeige als flaches, randnahes Q/E/F-Dock verkleinern und
      die permanente Steuerungs-Textzeile aus dem Kampf-HUD entfernen.
- [x] nicht pausierendes Match-Scoreboard auf TAB-Halten legen; beim Loslassen
      oder Fokusverlust automatisch schliessen.
- [x] CTF-Botkommandos mit aktiver Taktik und kompakter 1/2/3-Tastenlegende
      dauerhaft links oben anzeigen.
- [x] Botkommandos zusaetzlich als klickbare, hochaufgeloeste HUD-Chips
      anbieten und Tastatur-/Mauszustand gemeinsam verwalten.
- [x] TAB-Scoreboard als dichte Teamtabelle mit K/D, Objective-Werten,
      Impact-Sortierung und MVP-Markierung gestalten.
- [x] dezenten Killfeed unter dem Match-Header mit Rocket-, Rail-, Whip-,
      Fall- und Suicide-Ursache implementieren.
- [ ] Kontrollschema im ersten Match visuell und ohne Textwand vermitteln.

Abnahme:

- Spieler kann gleichzeitig strafing, zielen und schiessen.
- Rocket-Prediction und Rail-Präzision sind bewusst erlernbar.
- Movement fuehlt sich kontrolliert schnell an und bleibt visuell lesbar.
- Zehn interne Testmatches erzeugen keine wiederkehrende
  Steuerungsverwirrung.
- Keine Kernaktion benoetigt einen UI-Klick im laufenden Desktop-Kampf.

## Phase 2 - Combat und Waffenrollen haerten

Ziel: Das kleine vorhandene Arsenal muss klare Entscheidungen erzeugen.

Vorgesehene Rollen:

- Rocket: Prediction, Splash und Raumkontrolle
- Railgun: praeziser Skillshot mit hohem Einzelwert
- Whip: kurze Reichweite, Druck und Nahkampfkontrolle

Aufgaben:

- [ ] Schaden, Cooldowns, Projektilgeschwindigkeit, Ammo und Pickup-Dichte als
      zusammenhaengendes System pruefen.
- [x] Kein Quick-Cast-Eingabepuffer: Eingaben waehrend eines Cooldowns werden
      verworfen und nicht spaeter automatisch ausgefuehrt.
- [ ] Jeder Waffe eindeutiges Audio-, Projektil- und Trefferfeedback geben.
- [ ] Lesbarkeit im 2v2-Kampf auf kleinen und grossen Viewports testen.
- [ ] Waffenwerte weiterhin datengetrieben halten.
- [ ] Bot-Waffennutzung mit denselben Regeln wie der Spieler absichern.

Abnahme:

- Jede Waffe hat eine erkennbare Einsatzsituation.
- Keine Waffe ist dauerhaft die richtige Antwort.
- Treffer und Fehlschuss sind ohne Debuganzeige erkennbar.
- Weitere Waffen koennen spaeter ueber vorhandene Konfigurationen und Ports
  hinzugefuegt werden, ohne Runtime oder Scene aufzublaehen.

## Phase 3 - Classic-CTF-Hero-Slice

Ziel: Ein vollstaendig spielbares und wiederholbares 2v2-CTF-Match.

Aufgaben:

- [x] Flow Circuit als Foundry Circuit fuer 2v2 und Desktop-Tempo ausbauen.
- [x] Spawnlagen, drei Laufwege sowie Waffen- und Ressourcenpickups abstimmen.
- [x] KI-Mitspieler mit klarer Angreifer-/Verteidiger-Gewichtung ausstatten.
- [x] 2v2-Verteidiger dynamisch in sichere Carrier-Ruecklaeufe und nahe
      fallengelassene Gegnerflaggen einsteigen lassen.
- [x] Leichte Teamkommandos fuer den KI-Mitspieler bereitstellen: `1 Defend`,
      `2 Follow`, `3 Attack`; erneute Auswahl kehrt zu `Auto` zurueck.
- [ ] Carrier-Verfolgung, Eskorte, Flaggenrueckgabe und Basisverteidigung in
      kompletten manuellen Matches sichtbar abnehmen.
- [ ] Matchdauer und Capture-Limit auf kurze Browser-Sessions abstimmen.
- [x] Ergebnisbildschirm mit Kills, Deaths, Flag-Pickups, Captures und Returns
      im Produktpfad bereitstellen.
- [ ] Restart und naechstes Match ohne unnötige Menues ermoeglichen.

Abnahme:

- Spieler versteht Ziel, eigene Flagge und gegnerische Flagge ohne Handbuch.
- Ein Match hat einen klaren Spannungsbogen und endet typischerweise in einem
  kurzen Browser-geeigneten Zeitfenster.
- Bots koennen den Modus gewinnen und verlieren, ohne offensichtliche
  Navigationsausfaelle.
- Mindestens zehn komplette Matches laufen ohne Softlock oder falschen
  Ergebniszustand.

## Phase 4 - Ingame-Onboarding

Ziel: Neue Spieler erreichen innerhalb weniger Sekunden sinnvolles Gameplay.

Aufgaben:

- [ ] Maximal ein Klick bis zum ersten steuerbaren Spielzustand.
- [ ] Kurze TDM- oder CTF-Trainingssequenz direkt im Gameplay.
- [ ] Bewegung, Aim, Spezialwaffen, Jump und Flag-Ziel schrittweise
      zeigen.
- [ ] Hinweise kontextbezogen ausblenden, sobald die Aktion verstanden wurde.
- [ ] Tutorial ueberspringbar machen.
- [ ] Ersten Matchstart mit vernuenftigen Defaults statt Setup-Formular
      anbieten.

Abnahme:

- Ein neuer Testspieler startet ohne externe Erklaerung ein Match.
- Keine verpflichtende Textwand.
- Ein-Minuten-Abbruch entsteht nicht durch unklare Steuerung oder Menuepfade.

## Phase 5 - Liga, Team und Rekrutierung

Ziel: Aus einzelnen Matches wird ein wiederkehrender Solo-Karriereloop.

Minimaler Loop:

1. Match spielen.
2. Ligapunkte und Ergebnis erhalten.
3. Teammitglied entwickeln oder einen Kandidaten rekrutieren.
4. Naechsten Gegner sehen.
5. Naechstes Match sofort starten.

Erster Scope:

- [x] eine Saison mit zehn Matches als Doppelrunde zwischen sechs Teams
- [x] eine gemeinsame, schnell lesbare Tabelle mit drei Punkten pro Sieg
- [x] Zwei-Personen-Kader mit Angreifer-, Verteidiger- und
      Allrounder-Tendenzen
- [x] Teamakten mit Kills, Deaths und Captures pro Charakter
- [x] ein einziges Rekrutierungsfenster nach Match fuenf
- [x] direkter Tausch des Wingmates; keine Gold- oder Transferwirtschaft
- [x] Fullscreen-Hauptmenue mit getrenntem League- und Quick-Play-Pfad
- [x] Gegneruebersicht und direkter Start des naechsten 2v2-CTF-Matches
- [x] versionierter LocalStorage-Spielstand mit sauberem Fallback bei
      unbekannter oder beschaedigter Version

Architektur:

- neuer frameworkunabhaengiger Bereich, zum Beispiel `src/meta/league/`
- Liga-State getrennt vom laufenden Match-State
- versioniertes Save-Schema
- Save-Port mit LocalStorage-Implementierung
- spaeterer CrazyGames-Cloud-Save-Adapter ohne Aenderung der Ligaregeln

Balancing-Regel:

Teammitglieder duerfen Taktik und Zuverlaessigkeit beeinflussen. Sie duerfen
den Spieler nicht durch extreme Stat-Vorteile vom eigenen Skill entkoppeln.

Abnahme:

- [x] Eine Saison kann begonnen, gespeichert, fortgesetzt und beendet werden.
- [x] Sauberer Fallback bei unbekannter oder beschaedigter Save-Version ist
      vorhanden.
- [x] Die Rekrutierung ist eine einzelne Auswahl oder die Entscheidung, den
      aktuellen Wingmate zu behalten.
- [x] Nach dem Ergebnis fuehrt `Continue League` direkt zur League HQ.
- Mindestens ein Testspieler will freiwillig ein weiteres Match beginnen.

Status 2026-07-13: Der technische und visuelle V1-Scope ist implementiert und
durch automatisierte Domain-, Routing-, Save-, Build- und HTTP-Smokes
abgesichert. Die echte visuelle und spielerische Browserabnahme bleibt offen,
weil in der Ausfuehrungsumgebung kein steuerbarer Browser verfuegbar ist.

## Phase 6 - Mobile als eigene Control-Variante

Ziel: Dieselben Matchregeln mit reduziertem Touch-Input spielbar machen.

Vorgesehenes Input-Budget:

- linker Stick fuer Movement
- rechter Stick fuer Aim und Fire
- ein zusaetzlicher Jump-/Dodge-Button
- automatische oder kontextuelle Waffenwahl
- Soft-Aim und moderate Zielhilfe
- keine drei permanenten Spezialwaffenbuttons

Aufgaben:

- [ ] Mobile-Input getrennt vom Desktop-Produktadapter halten.
- [ ] Aim-Assist als klar konfigurierbares System implementieren.
- [ ] Rocket-Leading nur moderat unterstuetzen; Positionierung und Timing
      bleiben relevant.
- [ ] Jump an Touch anpassen: groesserer Timing-Spielraum oder kontextuelle
      Hilfe an klaren Traversalstellen.
- [ ] Mobile zunaechst auf 2v2 begrenzen.
- [ ] Keine plattformuebergreifende PvP-Fairness behaupten; erster Scope ist
      ausschliesslich gegen KI.
- [ ] HUD und Lesbarkeit fuer `800x450`, kleine Landscape-Phones und Tablets
      pruefen.

Abnahme:

- Die Kernsteuerung benoetigt hoechstens zwei Sticks und einen Aktionsbutton.
- Movement, Zielwahl und Objective-Spiel sind parallel moeglich.
- Keine Taste verdeckt kritische Gegner oder Flaggeninformationen.
- Mehrere reale Android- und iOS-Geraete bestehen die Abnahme.
- Mobile darf sich leichter steuern, verwendet aber dieselben Matchregeln.

## Phase 7 - Produktpolitur und Inhaltsfreigabe

Ziel: Aus dem Hero-Slice wird ein kohärentes kleines Spiel.

Aufgaben:

- [ ] Menue, HUD, Ergebnis und Liga visuell vereinheitlichen.
- [ ] Audiopegel und Mix pruefen.
- [ ] Charaktere zunaechst als kosmetische Varianten behandeln.
- [ ] TDM als Quick Play beziehungsweise Training produktreif machen.
- [ ] One Flag erst nach CTF als zweiten Objective-Liga-Modus haerten.
- [ ] Weitere Maps nur einzeln und anhand klarer Spielziele freigeben.
- [ ] Asset-Provenienzliste fuer alle mit ChatGPT erzeugten Assets anlegen.
- [ ] Prompts, Erstellungsdatum, Nachbearbeitung und bekannte Quellenhinweise
      soweit vorhanden dokumentieren.

Content-Freigabe-Gate:

Erst jetzt duerfen neue Waffen und Charaktere geplant werden. Jede neue Waffe
braucht eine eigene taktische Rolle und darf keine bestehende Waffe lediglich
durch hoehere Werte ersetzen.

## Phase 8 - CrazyGames-Vorbereitung

Ziel: Ein kleiner, schneller und messbarer kommerzieller Web-Build.

Aufgaben:

- [ ] Kommerziellen Entry-Point von der eingefrorenen V1-Referenz trennen.
- [ ] Code-Splitting fuer Phaser, Liga, Menues und spaetere Inhalte pruefen.
- [ ] Unnoetige oder doppelte Assets aus dem Initialdownload entfernen.
- [ ] Initiales Ziel: unter 20 MB und unter 10 Sekunden bis Gameplay.
- [ ] CrazyGames-Game-Events ueber einen eigenen Adapter integrieren.
- [ ] Cloud Save ueber den bestehenden Save-Port anbinden.
- [ ] Audio-Pause/-Resume und Focus-Verlust korrekt behandeln.
- [ ] CrazyGames-Preview und QA-Tool durchlaufen.
- [ ] Covers, Beschreibung, Steuerungstexte und kurze Gameplay-Clips erstellen.

Monetarisierungsregel:

- Basic Launch zunaechst als Produkt- und KPI-Test behandeln.
- Keine Werbung waehrend eines laufenden Matches.
- Midgame-Ads spaeter nur an natuerlichen Match- oder Saisonuebergaengen.
- Rewarded Ads nur fuer optionale, faire Vorteile wie einen kosmetischen oder
  Scouting-bezogenen Refresh; kein Pay-to-win.

Zielmetriken fuer die Bewertung:

- hohe Ein-Minuten-Conversion, Orientierung `80 %` oder besser
- durchschnittliche Session in Richtung `10+ Minuten`
- Day-1-Retention in Richtung `10-15 %`
- Tutorial-Abschluss und erstes Match separat messen
- Anteil der Spieler messen, die nach Match 1 Match 2 starten

## Phase 9 - Kontrollierter Ausbau

Nur wenn die Grundmetriken und das Spielgefuehl stimmen:

- weitere Charaktere und kosmetische Teamidentitaet
- neue Waffen mit eigenstaendigen Rollen
- weitere Liga-Saisons und Gegnerteams
- One-Flag-Liga
- weitere handgebaute Maps
- tiefere Rekrutierung und Rivalitaeten
- spaeter optional echtes Online-Spiel

Kein Ausbau allein, um schwache Retention mit mehr Content zu ueberdecken.

## 5. Verbindliche Gates fuer jede Phase

Technisch:

- [ ] `npm.cmd test`
- [ ] `npm.cmd run build`
- [ ] relevante Bot-Diagnostik
- [ ] keine neuen TypeScript- oder Browser-Konsolenfehler
- [ ] Desktop-Smoke
- [ ] Mobile-Landscape-Smoke, sobald Mobile betroffen ist
- [ ] keine ungewollten Aenderungen an geschuetztem WIP

Architektur:

- [ ] Regeln bleiben im Core oder im passenden Meta-System.
- [ ] Scenes und UI werden nicht zur autoritativen Regelquelle.
- [ ] Desktop und Mobile erzeugen dieselben Core-Actions.
- [ ] Liga-State und Match-State bleiben getrennt.
- [ ] Kein neuer grosser Scene-Monolith.

Produkt:

- [ ] Ein neuer Spieler versteht den naechsten Schritt.
- [ ] Die Phase verbessert einen messbaren Core-Loop-Teil.
- [ ] Manuelles Spieltesten begleitet automatisierte Tests.
- [ ] Neue Inhalte werden nicht vor Stabilitaet und Retention priorisiert.

## 6. Empfohlene Arbeitsreihenfolge ab jetzt

1. Phase 0 komplett abschliessen.
2. Phase 1 separat planen, implementieren und manuell abnehmen.
3. Phase 2 und Phase 3 als Hero-Slice fertigstellen.
4. Vor Liga-Arbeit einen ehrlichen Spielgefuehl-Test machen.
5. Erst bei gutem Arena-Loop Phase 4 und Phase 5 bauen.
6. Mobile erst auf dem bewiesenen Desktop-Regelwerk entwickeln.
7. Danach Produktpolitur und CrazyGames Basic Launch vorbereiten.

## 7. Aktuelle konkrete Arbeitseinheit

Phase 0 ist technisch abgeschlossen. Der aktuelle Phase-1-Slice umfasst:

- [x] Maus-Aim von Bildschirmmitte auf Actor-zu-Cursor-Weltkoordinaten
      korrigieren
- [x] Max-Speed nach erstem Spieltest von `241.2` auf `228` reduzieren
- [x] Bot-Rail-Praezision auf sehr grosse Distanz fairer machen
- [x] Tests, Build und Bot-Diagnostik ausfuehren
- [x] Desktop- und Mobile-Waffenicons systematisch getrennt anordnen
- [x] radialen Cooldown-Wipe fuer Spezialwaffen implementieren
- [ ] korrigiertes Aim und neues Tempo manuell im Desktop-Browser abnehmen
- [x] Desktop-Waffenicons als reine Statusanzeigen von mobiler Tap-/Drag-Logik
      trennen
- [x] Basic Attack fuer Menschen und Bots im Produktmodus deaktivieren
- [x] untere BLUE-P1-/RED-BOT-Spielerfelder deaktivieren
- [x] Foundry Circuit als Standard-2v2-CTF-Arena mit drei Routen, optionalen
      Jump-Shortcuts und gebrochenen Sichtlinien ausbauen
- [x] Pickup-Respawn und Ammo-Mengen fuer reines Spezialwaffen-Gameplay tunen
- [x] 2v2-CTF-Verteidiger fuer dynamische Eskorte und Flag-Uebernahme erweitern
- [x] obere HUD-Kachel entschlacken und kleine Canvas-Schrift schaerfen
- [x] direkte Teamkommandos mit sichtbarer Bot-Bestaetigung implementieren
- [x] Hold-to-view-TAB-Scoreboard und kompaktes Waffen-/Botkommando-HUD
      implementieren
- [x] klickbare Bot-Taktiken, Impact-Scoreboard und ursachenbasierter Killfeed
      implementieren
- [x] hellen Match-Endscreen an dunkle Arena-/Scoreboard-Sprache angleichen
- [x] verzerrte League-Squad-Portraits auf quadratische Sprite-Zellen umstellen
- [x] Bewegungs-/Sprungrichtung fuer Null Courier, Volt Hound und Xeno Runner
      korrigieren; Xeno-Sheet mit streng kardinalen Ansichten revidieren
- [x] Sunken Court, Grand Archive und Flank Switch als profiliertes
      Drei-Map-Set mit echten Skill-Shortcuts und umkaempfter Rail-Kontrolle
      haerten
- [x] Founders Circuit auf vier Teams und drei entscheidende Matches verdichten
- [x] ersten Circuit als feste Lernkurve aus TDM, One Flag und Classic CTF
      mit drei passenden Arenen strukturieren
- [x] einmaliges Contract Briefing um sichtbare Match-, Modus-, Arena- und
      Rivalenvorschau erweitern
- [x] League-HQ-Raster fuer die kurze Vierer-Saison verdichten und den
      langfristigen Arena-Pfad ohne Scroll-Pflicht sichtbar machen
- [x] Arena-Pyramide mit sichtbarer Challenger- und Core-League-Perspektive
      ergaenzen, ohne eine falsche globale Rangzahl vorzutäuschen
- [x] reproduzierbare Rivalenergebnisse aus Rosterstaerke, Teamprofil, Form,
      Matchup und begrenzter Varianz berechnen
- [x] Post-Match-Moment fuer Resultat, Tabellenbewegung, Ligapunkte und
      Aufstieg vor die Rekrutierungsentscheidung schalten
- [x] 57 Tests, Produktions-Build und Bot-Diagnostik nach Map-Aenderungen
      erfolgreich ausfuehren

Die autoritativen Matchregeln blieben unveraendert; Arena-Daten und
Praesentation wurden ueber ihre bestehenden Grenzen erweitert. Die Liga liegt
als getrenntes Meta-System unter `src/meta/league/`. Der naechste Schritt ist
eine manuelle Drei-Match-Komplettsaison, um Tabellenfluss, Matchuebergang,
Aufstiegsmoment und Transferentscheidung spielerisch abzunehmen.
