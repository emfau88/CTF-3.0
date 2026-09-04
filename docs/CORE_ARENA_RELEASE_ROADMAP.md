# Core Arena – Release Roadmap

## Dokumentstatus

- **Status:** ACTIVE – CANONICAL ROADMAP
- **Letzte Aktualisierung:** 2026-09-04
- **Aktive Phase:** Phase 5 – Produktvalidierung (`IN PROGRESS`)
- **Nächstes Gate:** wiederholte Solo-Produktabnahme; externe Tests nach
  Verfügbarkeit
- **Kanonischer Integrationsstand:** `main` @ `3f6d88b` (PR #6, 2026-09-04)
- **Veröffentlichter Stand:** GitHub Pages @ `3f6d88b`; Deploy #53 am
  2026-09-04 erfolgreich abgeschlossen
- **Aktiver Arbeitsbranch:** `codex/phase-6-career-expansion`, direkt von
  `main` @ `3f6d88b`
- **Nächste geplante Umsetzung:** Phase 6, Variante B in Etappen;
  [Bulk-Plan](release/PHASE_6_CAREER_EXPANSION_PLAN.md) erstellt, Code noch nicht begonnen

> Diese Datei ist die verbindliche Produkt- und Release-Roadmap für Core Arena.
> Frühere Produkt-, Audit- und Umsetzungspläne bleiben als historische oder
> technische Nachweise erhalten, bestimmen aber nicht mehr die Reihenfolge der
> Release-Arbeit. Statusänderungen, Scope-Entscheidungen und bestandene oder
> gescheiterte Gates werden hier fortgeschrieben.

Statuswerte: `PLANNED`, `IN PROGRESS`, `BLOCKED`, `VALIDATION`, `COMPLETE`.
Eine Phase gilt erst dann als `COMPLETE`, wenn ihre Abnahmekriterien belegt
sind; vorhandener Code allein reicht dafür nicht.

## Bestätigter Ausgangsstand

- Das aktive Repository liegt unter `C:\Users\madde\Documents\CTF-3.0`.
- Pull Request 4 ist in `main` integriert. Der Merge-Commit `4ce36f5` enthält
  denselben Dateibaum wie der vorherige Feature-Head `9811b51`.
- Der aktuelle öffentliche Build enthält Quick Start, Custom Match, drei Modi,
  sieben Arenen, drei Premium-Arenen, Bots mit drei Schwierigkeitsprofilen und
  den spielbaren Drei-Match-Proving-Circuit der League.
- Die vorhandene Core-/Adapter-Trennung ist eine tragfähige Basis. Es gibt
  keinen sachlichen Grund für einen Rewrite oder einen Enginewechsel.
- Als zuletzt belegte automatische Baseline bestehen 223
  Unit-/Integrations-/Simulationschecks, der Test-Typecheck und zehn
  Browser-E2E-Tests. Phase 0 wiederholt diese Gates auf dem Release-Branch.
- Im Workspace liegt untracked WIP. Es gehört nicht automatisch zum
  Release-Scope und wird weder gelöscht noch verschoben noch versehentlich
  gestaged.
- Im Ausgangsstand fehlten menschliche First-Run- und Karriere-Spieltests.
  Der Phase-2-First-Run ist inzwischen manuell abgenommen; die vollständige
  Karriere- und Produktvalidierung bleibt Aufgabe der Phasen 3 bis 5.

## Produktziel

Die erste ernsthafte Releaseversion ist ein Desktop-first Browser-Arena-Spiel
gegen Bots mit:

- höchstens einem Klick bis zum ersten Match;
- einem kurzen Qualifier, der Steuerung und Combat im Spiel vermittelt;
- präzisem, lesbarem Combat und klaren Objectives;
- Rivalenteams und einer kurzen, geschlossenen League-Karriere;
- Recruitment, das Bot-Entscheidungen statt Charakterwerte verändert;
- einer gemeinsamen Codebasis mit klaren Release- und Plattformgrenzen;
- einem technisch und rechtlich abgenommenen Portal-Build.

Desktop mit Maus und Tastatur ist der offizielle Qualitäts- und Releasepfad.
Die vorhandene Touch-Unterstützung bleibt technisch erhalten, wird aber bis zu
einer späteren, datenbasierten Entscheidung als experimentell behandelt.

## Verbindliche Produktentscheidungen

- Bestehendes Repository, Phaser und Gameplay-Core bleiben erhalten.
- Kein Rewrite und keine portalabhängigen Forks der Spiellogik.
- `ReleaseProfile` steuert Produktvarianten und freigegebene Features.
- `PlatformServices` kapselt Save, Analytics, SDK und Browser-Lifecycle.
- Qualifier und First-Run-Flow haben vor weiterem Karriere-Content Priorität.
- Recruitment verändert Verhalten und Rollenpräferenz, nicht Lebenspunkte,
  Geschwindigkeit, Schaden oder Waffenwerte.
- Vor der Proving-Validierung entstehen keine neuen Waffen oder Arenen.
- Variante B ist die gewählte Planungsrichtung: drei Proving-, drei
  Contender- und drei Apex-Matches; keine Sechs-Team-Ligen in diesem Ausbau.
- Contender erst nach dokumentiertem positivem Phase-5-Solo-Entwicklungsgate;
  Apex zusätzlich erst nach bestandener Sechs-Match-Abnahme und Freigabe.
- Fehlende externe First-Run-Tests blockieren nicht allein die Entwicklung,
  bleiben aber als offene Releasevalidierung sichtbar; Solo-/Bot-Tests sind
  kein Ersatz für unabhängige Spielerbeobachtung.
- CrazyGames ist der erste strukturierte Portaltest; Kongregate und Y8 folgen
  bei positivem Ergebnis. Poki/GamePix setzen eine neue Mobile-Entscheidung
  voraus.
- Audio wird vor Phase 9 weder bewertet noch bearbeitet noch integriert.
- Ein kommerzieller Release ist ohne abschließende Rechteprüfung aller Bild-,
  UI- und Audioassets ausgeschlossen.

## Ausdrücklich nicht Teil der ersten Releasearbeit

- Online-Multiplayer, Accounts oder Cloud Saves;
- lokale PvP-Unterstützung als Release-Gate;
- Stat-Grind, Ausrüstung, Wirtschaft oder Charakter-Level;
- ein flächiger Mobile-Umbau;
- viele neue Maps, Waffen oder Modi;
- großflächige Godfile- oder CSS-Neuschreibungen ohne konkreten Featurebedarf;
- Monetarisierung vor einem tragfähigen und gemessenen Produktloop;
- Audioarbeit außerhalb der abschließenden Polish-Phase.

## Release-Definition

Ein Release Candidate liegt erst vor, wenn:

1. Phase 0 bis Phase 8 abgeschlossen sind;
2. Qualifier, Teamgründung, Proving Circuit und Recruitment als geschlossener
   First-Run-Loop funktionieren;
3. neue Spieler den Loop ohne Erklärung bedienen und bewerten konnten;
4. der gewählte Karriereumfang vollständig und ehrlich dargestellt ist;
5. automatisierte, manuelle, Browser-, Save- und Performance-Gates bestehen;
6. der Zielportal-Build dessen technische Anforderungen erfüllt;
7. Phase 9 inklusive Audio- und Rechte-Gate abgeschlossen ist;
8. keine bekannten releaseblockierenden Fehler offen sind.

## Phasenübersicht

| Phase | Ergebnis | Status | Start-Gate |
| --- | --- | --- | --- |
| 0 – Release-Baseline | Sauberer, reproduzierbarer Ausgangspunkt | `AUTOMATED COMPLETE · MANUAL OPEN` | `main` @ `4ce36f5` bestätigt |
| 1 – Produkt-/Plattformfundament | `ReleaseProfile`, `PlatformServices`, lokale Events | `COMPLETE` | durch Nutzer nach grüner automatischer Baseline freigegeben |
| 2 – Qualifier und Onboarding | Ein-Klick-First-Run bis `QUALIFIED` | `COMPLETE` | Phase 1 `COMPLETE` |
| 3 – League- und Karrierefluss | Kompakte Teamgründung und geschlossener Proving-Flow | `COMPLETE` | Phase 2 `COMPLETE` |
| 4 – Relevantes Recruitment | Wahrnehmbare KI-Archetypen ohne Statvorteile | `COMPLETE` | Phase 3 `COMPLETE` |
| 5 – Produktvalidierung | Getesteter kompletter Release-Slice | `IN PROGRESS` | Phase 4 `COMPLETE` |
| 6 – Karriereausbau, Variante B | Erst sechs, nach Abnahme neun Karriere-Matches | `PLANNED` | Positives Phase-5-Solo-Entwicklungsgate; Bulk-Plan liegt vor |
| 7 – Portal-/Build-Vorbereitung | Schlanker Standalone-/CrazyGames-Build | `PLANNED` | Phase 6 `COMPLETE`, Karrierescope abgenommen |
| 8 – Release-Candidate-QA | Technisch und inhaltlich abgenommener Kandidat | `PLANNED` | Phase 7 `COMPLETE` |
| 9 – Audio und finaler Polish | Rechteklarer Gesamtmix und finaler RC | `PLANNED` | Phase 8 `COMPLETE` |

## Phase 0 – Release-Baseline

**Status:** `AUTOMATED COMPLETE · MANUAL OPEN`

**Ausführungsplan:** [PHASE_0_RELEASE_BASELINE.md](release/PHASE_0_RELEASE_BASELINE.md)

### Ziel

Einen sauberen, jederzeit wiederherstellbaren Release-Ausgangspunkt herstellen,
bevor Produktverhalten verändert wird.

### In Scope

- lokalen Remote-Stand aktualisieren und `main` @ `4ce36f5` bestätigen;
- untracked WIP inventarisieren und vom Release-Scope abgrenzen;
- eigener Branch `codex/release-baseline`;
- Pull-Request-CI vor dem Deploy lauffähig machen;
- unnötigen Smoke-Test-Export aus dem Produktions-Barrel entfernen;
- sichere Dependency-Patches nach Audit und mit vollständigem Regressionstest;
- Unit-/Integrationstests, Test-Typecheck, Build und Browser-E2E;
- vollständiger manueller Durchlauf des Drei-Match-Proving-Circuit;
- Baseline-Evidenz und anschließend ein wiederherstellbarer Git-Tag.

### Nicht in Scope

- Änderungen an Combat, Balance, Menüs, League-Regeln oder Assets;
- Aufräumen oder Integrieren des untracked WIP;
- neue Features oder Content;
- jegliche Audioarbeit.

### Abnahmekriterien

- [x] Release-Branch basiert nachweislich auf `main` @ `4ce36f5`.
- [x] Nutzer-WIP ist dokumentiert und unberührt.
- [ ] Pull Requests führen Tests, Test-Typecheck, Build und Browser-E2E aus,
      ohne eine Pages-Veröffentlichung auszulösen.
- [x] Smoke-Test-Code ist nicht mehr Teil des Produktions-Barrels.
- [x] Produktions-Dependency-Audit ist dokumentiert; angewandte Patches ändern
      kein Spielverhalten.
- [x] `npm test` ist grün (223/223 am 2026-08-28).
- [x] `npm run test:typecheck` ist grün (2026-08-28).
- [x] `npm run build` ist grün (2026-08-28).
- [x] `npm run test:e2e` ist grün (10/10 am 2026-08-28).
- [ ] Eine komplette League-Saison ist manuell ohne Softlock spielbar.
- [ ] Keine neuen blockierenden Browser-Konsolenfehler.
- [x] Bisherige Evidenz ist im Phase-0-Plan eingetragen.
- [ ] Der Baseline-Tag wird erst nach Merge und finaler Abnahme gesetzt.

## Phase 1 – Produkt- und Plattformfundament

**Status:** `COMPLETE`

**Evidenz:** [PHASE_1_PLATFORM_FOUNDATION.md](release/PHASE_1_PLATFORM_FOUNDATION.md)

### Ziel und Scope

- `ReleaseProfile`: freigegebene Geräte, Startflow, Qualifier, Sprache,
  Standalone/Portal und Featureflags.
- `PlatformServices`: Analytics, Save, SDK, Fokus/Pause sowie spätere Ads und
  Accounts hinter stabilen Ports.
- Zunächst nur ein Standalone-Adapter.
- Lokale, testbare Produkt-Events für Öffnen, Qualifier, Tutorialaktionen,
  League, Match, Recruitment, Wingman-Auswahl und Abbruchpunkte.

### Abnahmekriterien

- [x] Quick Start, Custom Match und League verhalten sich unverändert.
- [x] Kein SDK-Code liegt direkt in Menüs oder Gameplay-Core.
- [x] Events sind lokal prüfbar und senden noch keine externen Daten.
- [x] Gameplay-Core bleibt plattformunabhängig.

## Phase 2 – Qualifier und First-Run-Onboarding

**Status:** `COMPLETE`

### Ziel und Scope

```text
Spiel öffnen → KARRIERE STARTEN → Qualifier → QUALIFIED
              → kompakte Teamgründung → League HQ
```

- höchstens ein Klick bis Gameplay;
- Desktop, 2v2 TDM, Helix Canopy, ungefähr 90 Sekunden;
- Arc Lash plus höchstens eine Pickup-Waffe;
- keine League-Punkte und Qualifikation unabhängig vom Ergebnis;
- kontextuelle, aktionsbestätigte Hinweise für Bewegung, Aim, Arc Lash,
  Waffenpickup und Sprung;
- erneut über Training/Hilfe startbar;
- sicherer First-Run-, Abbruch-, Reload- und Save-Zustand.

### Abnahmekriterien

- [x] Keine Softlocks bei Abbruch, Reload oder geschlossenem Browser.
- [x] Aim und Waffensteuerung werden ohne Vorwissen durch bestätigte Aktionen
      vermittelt.
- [x] Alle Hinweise sind DE/EN-fähig.
- [x] Relevante Desktop-Viewports sind browsergetestet.
- [x] Bestehende Spielmodi bleiben unverändert.

### Abschlussnachweis vom 2026-08-28

- Frische Karriere startet mit einem Klick den festen 2v2-TDM-Qualifier auf
  Helix Canopy; bestehende Karrieren bleiben als `Weiterspielen` erhalten.
- Bewegung, Aim, Arc Lash, Pickup-Waffe und Sprung werden erst nach echten
  Spieleraktionen bestätigt.
- Abbruch führt sicher ins Hauptmenü zurück; Training ist über Hilfe erneut
  startbar. Sieg, Niederlage und Unentschieden führen zu `QUALIFIED`, ohne
  League-Punkte zu schreiben, und anschließend direkt zur Teamgründung.
- Save-Zustand, Reload, Abbruch und qualifiziertes Training sind automatisiert
  abgedeckt. Die bestehende Karriere wurde bei der manuellen Prüfung nicht
  gelöscht; ein separater frischer Browser-Origin diente dem First-Run-Test.
- `npm test`: 231/231 bestanden.
- `npm run test:typecheck`: bestanden.
- `npm run build`: bestanden.
- `npm run test:e2e`: 12/12 bestanden, einschließlich vollständiger
  Qualifier- und bestehender Menü-/Arena-Flows.
- Manueller lokaler First-Run-Test und Übergang zur Teamgründung: vom Nutzer
  am 2026-08-28 abgenommen.

## Phase 3 – League-Einstieg und Karrierefluss

**Status:** `COMPLETE`

### Ziel und Scope

- Teamgründung auf möglichst einer Oberfläche: Callsign, Teamname,
  Captain-Skin, Starter-Wingman, Zufallsvorschläge, klarer Abschluss.
- Direkter Übergang ins League HQ.
- Drei unterschiedliche Proving-Matches auf den Premium-Arenen; TDM,
  One Flag und Classic CTF in ansteigender taktischer Komplexität.
- Ein zusammenhängender Ergebnisfluss aus Resultat, Tabellenbewegung,
  Freischaltung und nächstem Match.
- Save-Migration für bestehende League-Spielstände.

### Abnahmekriterien

- [x] Kein unnötiger Rückweg vom Qualifier bis League-Match 1.
- [x] Bestehende Saves bleiben ladbar und Profile werden beim Einstieg
      nachvollziehbar ergänzt.
- [x] Der gesamte Proving Circuit ist ohne URL-Eingriff spielbar.
- [x] Matchreihenfolge und drei unterschiedliche Premium-Arenen sind im
      vollständigen Browser-Flow bestätigt.

### Abschlussnachweis vom 2026-08-28

- Teamgründung bündelt Callsign, Teamname, Emblem, Captain-Skin und
  Starter-Wingman auf einer Oberfläche mit Zufallsvorschlägen und Review.
- Der Proving Circuit führt in steigender taktischer Komplexität durch
  Helix Canopy/TDM, Temple of the Drowned Sun/One Flag und Foundry
  Circuit/Classic CTF.
- Ergebnis, Tabellenbewegung, nächste Begegnung und Saisonabschluss bilden
  einen durchgängigen Flow; bestehende lokale Karriere- und League-Saves
  bleiben erhalten.
- Ein neuer Browser-End-to-End-Test durchläuft Qualifier-Status,
  Teamgründung, alle drei Matchstarts, Ergebnisrückkehr und Saisonabschluss.
- `npm test`: 231/231 bestanden.
- `npm run test:typecheck`: bestanden.
- `npm run build`: bestanden.
- `npm run test:e2e`: 13/13 bestanden.

## Phase 4 – Recruitment spielerisch relevant machen

**Status:** `COMPLETE`

### Ziel und Scope

- Wenige lesbare KI-Archetypen: offensiv, defensiv,
  objective-orientiert und Allrounder.
- Unterschiede nur bei Position, Risiko, Objective-Priorität,
  Ressourcenverhalten und Reaktion auf Teamkommandos.
- Nach dem ersten relevanten Rivalensieg: Kandidaten verstehen, einen Rivalen
  wählen oder aktuellen Wingman behalten; spätere Änderung im Teammanager.
- Recruitment ist eine Spielerfreischaltung, keine Transfersimulation.

### Abnahmekriterien

- [x] Archetypen sind in League HQ, Teammanager und Matchaufstellung klar
      bezeichnet; der lokale Browsercheck bestätigt ihre Übernahme in reale
      League-Matches.
- [x] Keine versteckten Stat- oder Waffenboni.
- [x] Save-, Roster- und Teamregeln bleiben stabil.
- [x] Jeder Archetyp wird von den gemeinsamen TDM-, One-Flag- und
      Classic-CTF-Controllern verarbeitet.

### Abschlussnachweis vom 2026-08-28

- Vier explizite, wertneutrale Entscheidungsarchetypen – offensiv, defensiv,
  objective-orientiert und Allrounder – verändern nur Risiko,
  Objective-/Zielpriorität, Ressourcenverhalten, Teamwork und Positionierung.
- Nach dem ersten Rivalensieg zeigt der Ergebnisfluss den bisherigen Wingman
  und beide Rivalenkandidaten. Die Rückkehr ins HQ bleibt bis zur Entscheidung
  gesperrt; Behalten und Rekrutieren sind beide möglich.
- Ein rekrutierter Kandidat wird als Spielerkopie freigeschaltet. Der
  kanonische Rivalenkader bleibt unverändert und der Kandidat kann später im
  Teammanager erneut ausgewählt werden.
- Save-Normalisierung erhält gültige offene Recruitment-Entscheidungen und
  neutralisiert ungültige Altzustände ohne bestehende Rivalenkader zu ändern.
- Deterministische Coordinator-Tests belegen unterschiedliche CTF- und
  One-Flag-Rollenpräferenzen sowie ausschließlich verhaltensbezogene Gewichte.
- Der lokale Browsercheck zeigt die Archetypkennzeichnung im League HQ und
  bestätigt, dass die Archetyp-IDs mit dem echten Helix-League-Match geladen
  werden.
- Der Karriere-E2E-Test durchläuft Recruitment, Auswahl, Folge-Matches,
  Persistenz und den unveränderten Rivalenkader im vollständigen
  Drei-Arenen-Circuit.
- `npm test`: 233/233 bestanden.
- `npm run test:typecheck`: bestanden.
- `npm run build`: bestanden.
- `npm run test:e2e`: 13/13 bestanden.
- Audio und vorhandener Audio-WIP blieben vollständig unangetastet.

## Phase 5 – Proving Circuit validieren

**Status:** `IN PROGRESS`

### Steuerungskorrektur vor dem nächsten Spieltest

Die erste Eigenabnahme zeigte trotz funktionierender Direkttasten unnötige
Steuerungsverwirrung. Deshalb wird der primäre Desktop-Pfad vor weiterem
Karriere-Content an übliche Shooter-Konventionen angenähert:

- Mausrad wechselt nur zwischen Arc Lash und tatsächlich aufgenommenen
  Waffen mit Munition;
- Linksklick feuert die gewählte Waffe; Pulse Repeater und Shardcaster bleiben
  automatisch, alle anderen Waffen feuern einmal pro Klick;
- die bestehenden HUD-Tasten bleiben parallele Direktfeuer-Kürzel und wählen
  ihre Waffe zugleich für den nächsten Linksklick aus;
- pro Frame entsteht höchstens eine Spieler-Waffenaktion; Munition, Cooldowns
  und Schadensregeln sind für beide Eingabewege identisch;
- Pickups erzwingen keinen Waffenwechsel. Nach der letzten Patrone fällt eine
  nicht mehr nutzbare Auswahl sicher auf Arc Lash zurück;
- der aktive Slot ist im HUD eindeutig hervorgehoben, Hilfe und Qualifier
  lehren Mausrad plus Linksklick als Standard und die Tasten nur als Kürzel;
- Touch-Steuerung, Bots, Saves, Balance und Audio bleiben unverändert.

Technisches Gate:

- [x] Auswahl- und Feuerregeln sind als testbare, Phaser-unabhängige Logik
      gekapselt.
- [x] Mausrad-Filter, Wrap-around, Pickup-/Leerzustand, Auto-/Einzelfeuer und
      der Vorrang der Direkttasten sind automatisiert abgedeckt.
- [x] Vollständige Tests, Typecheck, Build und Browser-E2E sind grün.
- [x] Lokaler Desktop-Spieltest bestätigt HUD-Auswahl, Mausrad, Linksklick,
      Direkttasten und Munitions-Fallback im echten Match.

### Zwischennachweis vom 2026-08-30

- `npm test`: 238/238 bestanden, einschließlich fünf neuer isolierter
  Kontrolllogik-Checks.
- `npm run test:typecheck`: bestanden.
- `npm run build`: bestanden.
- `npm run test:e2e`: 13/13 bestanden; der Qualifier nutzt nun Linksklick für
  den automatisierten Arc-Lash-Nachweis.
- Der lokale Canvas-Durchlauf bestätigte nacheinander: Arc Lash bleibt nach
  dem Pulse-Pickup gewählt, Mausrad wählt Pulse, Linksklick verbraucht dessen
  Munition, F/R feuern und übernehmen die Auswahl, und bei Munition 0 wird Arc
  Lash wieder aktiv. Das HUD zeigte jeden Wechsel eindeutig; es gab keine
  Browser-Konsolenfehler und keinen Seiten-Scroll durch das Mausrad.
- Phase 5 bleibt bis zu den eigentlichen Produkt-Spieltests `IN PROGRESS`;
  dieser technische Steuerungs-Slice ist abgenommen.

### Integrationsprüfung vom 2026-09-04

- Remote-Stand neu abgerufen: `origin/main` steht unverändert auf `9fcb7c9`;
  Hybridsteuerung `37e197f` liegt auf `codex/phase-5-hybrid-controls` und ist
  noch nicht in `main` integriert.
- `npm.cmd test`: 238/238 bestanden.
- `npm.cmd run test:typecheck`: bestanden.
- `npm.cmd run build`: bestanden; nur der bekannte Hinweis zum großen
  Phaser-Bundle, kein Buildfehler.
- `npm.cmd run test:e2e`: 13/13 bestanden.
- Der Branch ist damit technisch integrationsbereit. Phase 5 bleibt wegen der
  offenen Owner-/Produktabnahme `IN PROGRESS`; Merge ist keine Produktabnahme.
- Nutzer-WIP einschließlich `package-lock.json`, Konzeptbildern, neuen Assets,
  `characterSpecialIdle.ts`, Audio und `tmp/` bleibt außerhalb des Commits.
- PR #6 bestand die GitHub-CI am 2026-09-04 in 7:55 Minuten und wurde danach
  als Merge-Commit `3f6d88b` in `main` integriert. GitHub bestätigt den PR als
  `Merged`; der anschließende Pages-Deploy #53 wird getrennt nachgewiesen.
- Der neue Arbeitsbranch `codex/phase-6-career-expansion` basiert direkt auf
  diesem Merge. Die Integration schließt nicht automatisch das weiterhin
  offene Phase-5-Produktgate.
- Pages-Lauf #53 bestand Build und Deployment in 3:58 Minuten. Sein
  Karriere-E2E war einmal flaky und bestand beim automatischen Retry
  (`12 passed`, `1 flaky`). Da derselbe E2E lokal und im PR-Lauf bestand, ist
  die Veröffentlichung nicht blockiert; die Flake-Ursache bleibt vor Bulk 1
  als Stabilitätsbeobachtung offen.
- Live-Smoke auf `https://emfau88.github.io/CTF-3.0/` bestätigt Hauptmenü und
  die veröffentlichte deutsche Hilfe mit Mausrad-Waffenwechsel, Linksklick als
  Primärfeuer und fortbestehenden Direktfeuer-Kürzeln.

### Testaufbau

- zunächst wiederholte Solo-Abnahme durch den Entwickler/Owner; externe
  Desktop-Spieler anschließend nach Verfügbarkeit, langfristig ungefähr
  10–15 neue Spieler ohne Erklärung durch Beobachter;
- Qualifier, League-Einstieg und möglichst alle drei Proving-Matches;
- Messung von Zeit bis Gameplay, Steuerungsverwirrung,
  Qualifier-Abschluss, Match-1→2-Übergang, Circuit-Abschluss,
  Recruitment-Nutzung, Combat-Gefühl und freiwilligem Weiterspielwunsch.

### Entscheidungsgate

- Steuerungsverwirrung → Phase 2 korrigieren.
- Schwacher Match-1→2-Übergang → Phase 3 korrigieren.
- Irrelevantes Recruitment → Phase 4 korrigieren.
- Schwaches Combat-Gefühl → Werte und Feedback gezielt kalibrieren.
- Mehr Karriere-Content erst bei einem tragfähigen Gesamtloop.

Für den stufenweisen Ausbau ist eine dokumentierte Solo-Entwicklungsfreigabe
möglich: technische Baseline grün, vollständige echte Proving-Durchläufe ohne
Save-/Flow-Blocker und positives Owner-Urteil zu Steuerung, Recruitment und
Weiterspielwunsch. Der konkrete Prüfablauf steht in Bulk 0 des
[Phase-6-Plans](release/PHASE_6_CAREER_EXPANSION_PLAN.md). Diese Freigabe ist
noch nicht erteilt; die Planung allein schließt Phase 5 nicht ab.

Unabhängige First-Run-Evidenz bleibt bis zu externen Tests offen. Für diese
Entwicklungsfreigabe müssen nicht erst 10–15 Mitspieler gefunden werden;
ein Release-Nachweis aus einer Ein-Personen-Stichprobe wird daraus nicht.

Testfragen, Stichprobe und Erfolgsschwellen werden vor dem ersten externen Test
versioniert festgelegt, damit das Gate nicht nachträglich passend gemacht wird.

## Phase 6 – Karriereausbau, Variante B

**Status:** `IN PROGRESS` – Bulk 1 vorbereitet/implementiert, ohne neue
spielbare Circuits oder Abschluss der Phase-5-Produktabnahme.

**Ausführungsplan:** [PHASE_6_CAREER_EXPANSION_PLAN.md](release/PHASE_6_CAREER_EXPANSION_PLAN.md)

### Entscheidung und Umfang vom 2026-08-31

Variante B ist als stufenweiser Umsetzungsplan gewählt. Bulk 1 hat das
datengetriebene Circuit-Fundament umgesetzt; Contender und Apex sind weiterhin
sichtbare Vorschauen, nicht spielbar. Detailregeln, Tests, Save-Migration und
Wiederaufnahmepunkte stehen im Ausführungsplan.

- Zuerst Contender: drei zusätzliche Matches, zwei bereits vorhandene neue
  Rivalenteams im spielbaren Kader und ein weiterer sieggebundener
  Recruitment-Moment.
- Danach verpflichtende Abnahme des vollständigen Sechs-Match-Wegs.
- Erst bei positivem Gate und Freigabe Apex: drei weitere Matches und ein
  echter Karriereabschluss; insgesamt neun gewertete Matches auf dem
  erfolgreichen Weg, ohne Qualifier und Wiederholungsversuche.
- Je vier Teams und drei Spielermatches pro Circuit; die bisherige
  Sechs-Team-Ankündigung für Contender wird bei dessen Umsetzung korrigiert.
- Top 2 in Proving/Contender qualifizieren; bei Nichtqualifikation nur den
  aktuellen Circuit wiederholen. Apex-Platz 1 gewinnt den Titel.
- Teamidentität, Wingman und Freischaltungen bleiben beim Aufstieg erhalten.
- Vorhandene Arenen, Modi, Figuren und Botprofile wiederverwenden;
  Schwierigkeit durch KI-Verhalten, Reaktion und Zielverhalten, nicht Statboni.
- V2-Saves sicher übernehmen; Rückrollbarkeit von Code und Browserdaten
  getrennt behandeln. Keine Audioarbeit vor Phase 9.

### Arbeitspakete und Abnahme

1. Bulk 0: integrierte Startbasis und Phase-5-Solo-Gate prüfen.
2. Bulk 1: circuitabhängiges Modell, Proving unverändert erhalten.
3. Bulk 2: echte Karriereoperationen und sichere V3-Saves.
4. Bulk 3: Contender durchgängig spielbar machen.
5. Bulk 4: Sechs-Match-Abnahme; Pflichtstopp vor Apex.
6. Bulk 5: Apex und Titel-/Nichttitel-Abschluss.
7. Bulk 6: Gesamt-QA, Owner-Abnahme und Integrationsübergabe.

- [ ] Phase-5-Solo-Entwicklungsfreigabe dokumentiert.
- [ ] Migration, Aufstieg, Nichtqualifikation und Recruitment abgesichert.
- [ ] Sechs-Match-Weg technisch und durch den Owner abgenommen.
- [ ] Apex-Fortsetzung ausdrücklich freigegeben.
- [ ] Neun-Match-Weg einschließlich Abschluss und Wiederholung abgenommen.
- [ ] Roadmap, Tests, Save-Rückrollprobe und tatsächlicher Integrationsstand belegt.

Coming-soon-Circuits werden erst als spielbar bezeichnet, wenn sie vollständig
implementiert und technisch abgenommen sind. Phase 6 wird erst nach der
zusätzlichen Produktabnahme `COMPLETE`; ein grüner automatisierter Flow allein
genügt nicht.

### Variante A – Bewusste Rückfalloption, nicht parallel in Umsetzung

- Qualifier, drei Proving-Matches, ein Recruitment-Moment;
- Quick Start und Custom Match;
- bleibt nur eine mögliche neue Scope-Entscheidung, falls die Validierung
  gegen den Ausbau spricht; kein stiller Wechsel weg von Variante B.

## Phase 7 – Portal- und Build-Vorbereitung

**Status:** `PLANNED`

### Ziel und Scope

- nicht verwendete Master-, Pilot- und Archivassets aus dem veröffentlichten
  `public`-Build auslagern, ohne Quellen zu verlieren;
- Initialdownload und Zeit bis Gameplay messen;
- nur aktive Map-, Fighter- und Waffenassets vorladen;
- Code-Splitting datenbasiert prüfen;
- Standalone- und CrazyGames-Build aus derselben Codebasis;
- CrazyGames-SDK ausschließlich über `PlatformServices`;
- `Gameplay start/stop`, Locale, Fokus, Pause, Fullscreen und Lifecycle;
- GitHub-Actions-Warnungen zur erzwungenen Node-24-Ausführung der noch auf
  Node 20 zielenden offiziellen Actions auflösen und den Deploy erneut prüfen;
- lokaler Save als sicherer Fallback; zunächst keine Werbung.

### Abnahmekriterien

- Initialdownload deutlich unter 50 MB, Zielwert unter 20 MB bis Gameplay.
- Höchstens ein Klick bis Gameplay.
- Keine fehlgeschlagenen Requests oder absoluten externen Assetpfade.
- Standalone-Build bleibt vollständig nutzbar.
- Reihenfolge: CrazyGames Preview/Basic, danach Kongregate, dann Y8.

## Phase 8 – Release-Candidate-QA

**Status:** `PLANNED`

### Scope und Abnahmekriterien

- sauberer vollständiger 270-Match-Premium-Audit;
- manuelle Easy-/Normal-/Hard-Abnahme;
- Graph-Gate für zwei unabhängige Basis-zu-Objective-Wege;
- vollständige Karriere mehrfach durchgespielt;
- Save-Migration und beschädigte Saves;
- Chrome und Edge, kleine und große Desktop-Viewports;
- schwächere Hardware beziehungsweise CPU-Throttling;
- DE/EN vollständig;
- Tastatur, Fokusverlust, Pause und Fullscreen;
- keine blockierenden Konsolenfehler;
- finaler Rechtecheck für Bild- und UI-Assets.

Mobile ist kein Releaseblocker, solange das Releaseprofil Desktop eindeutig als
unterstützte Plattform ausweist.

## Phase 9 – Audio und finaler Polish

**Status:** `PLANNED`

**Harte Regel:** Vor Abschluss von Phase 8 findet keine Audioarbeit statt.

### Ziel und Scope

- jeden vorhandenen Sound prüfen und Herkunft/Nutzungsrecht dokumentieren;
- unklare Sounds ersetzen;
- fehlende Kampf-, Treffer-, Pickup- und UI-Sounds ergänzen;
- Lautstärken, Dynamik, Dauer und Dateigrößen vereinheitlichen;
- Pause, Fokusverlust und Resume testen;
- Gesamtmix im echten Match abnehmen;
- nur noch gezielter Text-, Übergangs-, Lade- und visueller Polish;
- Portalbilder, Beschreibung und endgültiges Release-Paket;
- keine neuen Großfeatures.

### Abnahmekriterien

- Für jedes veröffentlichte Audioasset liegt eine klare Provenienz vor.
- Mix und Lifecycle sind in vollständigen Matches abgenommen.
- Alle Phase-8-Gates bleiben grün.
- Der tatsächliche Release Candidate ist versioniert und reproduzierbar.

## Produktmetriken

Diese Ereignisse werden zunächst lokal definiert und erst nach einer bewussten
Datenschutz-/Plattformentscheidung extern versendet:

- Spiel geöffnet;
- Karriere beziehungsweise Qualifier gestartet;
- jede Tutorialaktion verstanden;
- Qualifier abgeschlossen oder abgebrochen;
- Teamgründung und League HQ erreicht;
- Match gestartet, beendet oder verlassen;
- Übergang Match 1 → Match 2;
- Proving Circuit abgeschlossen;
- Recruitment geöffnet und Wingman gewählt/behalten;
- Rückkehr und freiwilliges Weiterspielen.

## Übergreifende Release-Gates

- **Stabilität:** Tests, Typecheck, Build, E2E und Konsole.
- **Produkt:** First-Run-Verständlichkeit und geschlossener Karriereflow.
- **Gameplay:** wahrnehmbar faire Botprofile und relevante Entscheidungen.
- **Save:** Migration, Reload, Abbruch und beschädigte Daten.
- **Performance:** Ladevolumen, Zeit bis Gameplay und schwächere Hardware.
- **Plattform:** SDK-/Lifecycle-Verhalten ohne Core-Kopplung.
- **Recht:** eindeutige Assetprovenienz; Audio explizit erst in Phase 9.

## Risiken und offene Entscheidungen

| Risiko/Entscheidung | Behandlung | Entscheidungszeitpunkt |
| --- | --- | --- |
| Combat ist stabil, aber für neue Spieler nicht attraktiv genug | Beobachtete First-Run-Tests statt weiterer Content-Annahmen | Phase 5 |
| Recruitment bleibt kosmetisch | Archetypen und verständliche Darstellung validieren | Phase 4–5 |
| Mehr Matches verlängern nur denselben Loop | Variante B etappenweise; Sechs-Match-Gate vor Apex, Variante A nur nach neuer Scope-Entscheidung | Phase 5–6 |
| Circuit-Wechsel beschädigt bestehende Saves | V3-Migration mit erhaltenem V2-Stand, Profil-Backup, idempotenten Übergängen und Rückrollprobe | Phase 6, Bulk 2/4/6 |
| Nur Solo-Tests verfügbar | Entwicklung nach dokumentiertem Solo-Gate; unabhängige First-Run-Evidenz bis zu externen Tests offen halten | Phase 5 bis Release |
| GitHub Actions erzwingt Node 24 für auf Node 20 zielende Action-Versionen | Offizielle Action-Versionen in eigenem Build-Infrastruktur-Slice aktualisieren und vollständige CI/Pages-Pipeline prüfen | Phase 7 |
| Mobile ist umfangreich, aber nicht abgenommen | Code erhalten, nicht als Releaseversprechen behandeln | nach erstem Portaltest |
| Build ist für Portale zu groß | aktive Assets, Preload und Messung optimieren | Phase 7 |
| Audioherkunft ist teilweise unklar | keine frühe Audiointegration; kompletter Rechte-Gate | Phase 9 |
| Untracked WIP vermischt sich mit Releasearbeit | Schutzliste und selektives Staging | Phase 0 |

## Arbeits- und Aktualisierungsregeln

- Jede größere Phase erhält einen kurzen `codex/...`-Branch.
- Nach Implementierung folgen Tests, Browserprüfung, manuelle Abnahme, Pull
  Request und Integration in `main`.
- Die Roadmap wird im selben Commit/PR aktualisiert, wenn eine Phase beginnt,
  ein Gate besteht oder scheitert, der Scope sich ändert oder eine relevante
  Produktentscheidung fällt.
- Evidenz wird verlinkt; Behauptungen ohne Beleg setzen eine Phase höchstens auf
  `VALIDATION`, nicht auf `COMPLETE`.
- Unrelated oder untracked Nutzerdateien werden nie pauschal gestaged.
- Audioänderungen vor Phase 9 sind nicht zulässig, auch wenn entsprechende
  Dateien im Workspace vorhanden sind.

## Entscheidungsprotokoll

| Datum | Entscheidung | Begründung |
| --- | --- | --- |
| 2026-09-04 | Den technisch grünen Hybridsteuerungs-Branch vor Phase-6-Code sauber integrieren. | Circuit-/Save-Arbeit soll auf dem tatsächlich getesteten Desktop-Steuerungsstand aufbauen; die offene Produktabnahme bleibt davon getrennt. |
| 2026-08-31 | Variante B als 3+3+3-Match-Ausbau planen; zuerst Contender, danach Sechs-Match-Gate, erst dann Apex. | Der Nutzer bevorzugt die längere Karriere; kleine prüfbare Etappen begrenzen Risiko und verhindern ungeprüfte Zusatzlänge. |
| 2026-08-31 | Solo-Entwicklungsfreigabe und externe Releasevalidierung getrennt dokumentieren. | Der Owner hat keine feste Testergruppe; Entwicklung kann nach echter Solo-Abnahme fortgesetzt werden, ohne unabhängige Testevidenz zu behaupten. |
| 2026-08-30 | Desktop erhält eine Hybridsteuerung aus Mausrad/Linksklick und bestehenden Direkttasten. | Der vertraute Shooter-Pfad senkt die Einstiegshürde, während die präzisen Kürzel erhalten bleiben; beide Wege teilen Munition und Cooldowns. |
| 2026-08-28 | Diese Datei wird kanonische Roadmap. | Eine fortgeschriebene Quelle verhindert widersprüchliche To-do-Listen. |
| 2026-08-28 | Phase 2 ist vollständig abgenommen. | 231 automatische Checks, Typecheck, Build, 12 Browser-E2E-Tests und der manuelle First-Run bis zur Teamgründung sind grün. |
| 2026-08-28 | Phase 3 ist vollständig umgesetzt. | Der komplette Drei-Match-Proving-Flow über alle drei Premium-Arenen besteht 231 Checks und 13 Browser-E2E-Tests. |
| 2026-08-28 | Phase 4 ist vollständig umgesetzt. | Vier statneutrale KI-Archetypen, First-Win-Recruitment und stabile Spieler-/Rivalenroster bestehen 233 Checks, Build, Typecheck, 13 Browser-E2E-Tests und den lokalen Browsercheck. |
| 2026-08-28 | Desktop-first, Mobile experimentell erhalten. | Präzisionssteuerung ist releasefähig; Touch bleibt eine Option ohne aktuelles Versprechen. |
| 2026-08-28 | Qualifier vor Karriereausbau. | Verständnis und Combat müssen vor zusätzlicher Länge bewiesen werden. |
| 2026-08-28 | Contender/Apex nur nach Phase-5-Gate. | Content ersetzt keine Produktvalidierung. |
| 2026-08-28 | Audio ausschließlich in Phase 9. | Fokus halten und Rechte-/Mixarbeit einmal systematisch abschließen. |
| 2026-08-28 | Phase 1 nach vollständiger automatischer Baseline gestartet. | Der Nutzer hat den Start trotz noch offener manueller Phase-0-Produktabnahme ausdrücklich freigegeben; die offenen manuellen Gates bleiben sichtbar. |

## Änderungsverlauf

| Datum | Änderung |
| --- | --- |
| 2026-09-04 | Öffentlichen Pages-Stand nach Deploy #53 direkt geprüft: Menü lädt und die neue deutsche Hybridsteuerung ist in der Hilfe sichtbar; CI-Flake und Action-Runtime-Warnungen bleiben transparent dokumentiert. |
| 2026-09-04 | PR #6 nach grüner CI als `3f6d88b` in `main` integriert, Pages-Deploy #53 erfolgreich und `codex/phase-6-career-expansion` direkt davon angelegt; ein beim Retry bestandener Karriere-E2E-Flake bleibt vermerkt, Produktgate weiterhin offen. |
| 2026-09-04 | Bulk 1 abgeschlossen: Kanonischer Circuit-Katalog für Proving, Contender und Apex, gemeinsamer strikter Disziplinresolver und V2-kompatibler Circuit-Marker. Proving bleibt die einzige spielbare Saison; 240 Unit-Tests, Typecheck, Build und ein isolierter 13/13-Playwright-Lauf auf Port 4198 grün. Audio unberührt. |
| 2026-09-04 | Den einmaligen Karriere-E2E-Flake mit fünf fokussierten direkten Wiederholungen geprüft: 5/5 bestanden. Das Owner-/Produktgate bleibt ausdrücklich offen. |
| 2026-09-04 | Rubrik 1/Bulk 0 gestartet: Remote- und WIP-Schutz geprüft; 238 Tests, Typecheck, Build und 13 E2E-Tests erneut grün. Hybridsteuerung noch nicht als in `main` behauptet. |
| 2026-08-31 | Phase-6-Bulk-Plan erstellt und Variante B konkretisiert: Vier-Team-Circuits, 3+3+3 Matches, Save-/Aufstiegsregeln und Pflicht-Gate nach sechs Matches. Keine Spiellogik geändert; Phase 5 bleibt offen und Phase 6 `PLANNED`. |
| 2026-08-30 | Phase 5 gestartet und die aus der Eigenabnahme abgeleitete Hybridsteuerung als erste Steuerungskorrektur umgesetzt. |
| 2026-08-28 | Phase 4 mit verhaltensbasierten KI-Archetypen und einer verbindlichen First-Win-Recruitment-Entscheidung abgeschlossen. |
| 2026-08-28 | Phase 1 mit Standalone-Releaseprofil, Plattformports und lokalen Produkt-Events abgeschlossen. |
| 2026-08-28 | Kanonische Roadmap angelegt; Phase 0 aktiviert; Phasen 1–9, Gates und Audioausschluss festgelegt. |
