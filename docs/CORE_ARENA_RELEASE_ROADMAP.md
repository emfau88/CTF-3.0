# Core Arena – Release Roadmap

## Dokumentstatus

- **Status:** ACTIVE – CANONICAL ROADMAP
- **Letzte Aktualisierung:** 2026-08-28
- **Aktive Phase:** Phase 0 – Release-Baseline (`IN PROGRESS`)
- **Kanonischer Ausgangsstand:** `main` @ `4ce36f5`
- **Veröffentlichter Stand:** GitHub Pages, erfolgreicher Deploy vom 2026-08-24
- **Aktiver Arbeitsbranch:** `codex/release-baseline`

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
- Menschliche First-Run- und Karriere-Spieltests fehlen noch. Automatische
  Stabilität ist daher nicht mit Produktvalidierung gleichzusetzen.

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
- Contender und Apex werden erst nach dem Phase-5-Datengate gebaut.
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
| 0 – Release-Baseline | Sauberer, reproduzierbarer Ausgangspunkt | `IN PROGRESS` | `main` @ `4ce36f5` bestätigt |
| 1 – Produkt-/Plattformfundament | `ReleaseProfile`, `PlatformServices`, lokale Events | `PLANNED` | Phase 0 `COMPLETE` |
| 2 – Qualifier und Onboarding | Ein-Klick-First-Run bis `QUALIFIED` | `PLANNED` | Phase 1 `COMPLETE` |
| 3 – League- und Karrierefluss | Kompakte Teamgründung und geschlossener Proving-Flow | `PLANNED` | Phase 2 `COMPLETE` |
| 4 – Relevantes Recruitment | Wahrnehmbare KI-Archetypen ohne Statvorteile | `PLANNED` | Phase 3 `COMPLETE` |
| 5 – Produktvalidierung | Getesteter kompletter Release-Slice | `PLANNED` | Phase 4 `COMPLETE` |
| 6 – Karriereentscheidung | Kleine V1 oder validierter Ausbau | `PLANNED` | Phase-5-Datengate |
| 7 – Portal-/Build-Vorbereitung | Schlanker Standalone-/CrazyGames-Build | `PLANNED` | Karrierescope festgelegt |
| 8 – Release-Candidate-QA | Technisch und inhaltlich abgenommener Kandidat | `PLANNED` | Phase 7 `COMPLETE` |
| 9 – Audio und finaler Polish | Rechteklarer Gesamtmix und finaler RC | `PLANNED` | Phase 8 `COMPLETE` |

## Phase 0 – Release-Baseline

**Status:** `IN PROGRESS`

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
- [ ] Produktions-Dependency-Audit ist dokumentiert; angewandte Patches ändern
      kein Spielverhalten.
- [x] `npm test` ist grün (223/223 am 2026-08-28).
- [x] `npm run test:typecheck` ist grün (2026-08-28).
- [x] `npm run build` ist grün (2026-08-28).
- [ ] `npm run test:e2e` ist grün.
- [ ] Eine komplette League-Saison ist manuell ohne Softlock spielbar.
- [ ] Keine neuen blockierenden Browser-Konsolenfehler.
- [x] Bisherige Evidenz ist im Phase-0-Plan eingetragen.
- [ ] Der Baseline-Tag wird erst nach Merge und finaler Abnahme gesetzt.

## Phase 1 – Produkt- und Plattformfundament

**Status:** `PLANNED`

### Ziel und Scope

- `ReleaseProfile`: freigegebene Geräte, Startflow, Qualifier, Sprache,
  Standalone/Portal und Featureflags.
- `PlatformServices`: Analytics, Save, SDK, Fokus/Pause sowie spätere Ads und
  Accounts hinter stabilen Ports.
- Zunächst nur ein Standalone-Adapter.
- Lokale, testbare Produkt-Events für Öffnen, Qualifier, Tutorialaktionen,
  League, Match, Recruitment, Wingman-Auswahl und Abbruchpunkte.

### Abnahmekriterien

- Quick Start, Custom Match und League verhalten sich unverändert.
- Kein SDK-Code liegt direkt in Menüs oder Gameplay-Core.
- Events sind lokal prüfbar und senden noch keine externen Daten.
- Gameplay-Core bleibt plattformunabhängig.

## Phase 2 – Qualifier und First-Run-Onboarding

**Status:** `PLANNED`

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

- Keine Softlocks bei Abbruch, Reload oder geschlossenem Browser.
- Das ungewöhnliche Aim-/Waffentasten-Prinzip ist ohne Vorwissen verständlich.
- Alle Hinweise sind DE/EN-fähig.
- Relevante Desktop-Viewports sind browsergetestet.
- Bestehende Spielmodi bleiben unverändert.

## Phase 3 – League-Einstieg und Karrierefluss

**Status:** `PLANNED`

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

- Kein unnötiger Rückweg vom Qualifier bis League-Match 1.
- Bestehende Saves sind ladbar oder nachvollziehbar migriert.
- Der gesamte Proving Circuit ist ohne URL-Eingriff spielbar.
- Matchreihenfolge und Dauer sind durch einen kurzen Spieltest bestätigt.

## Phase 4 – Recruitment spielerisch relevant machen

**Status:** `PLANNED`

### Ziel und Scope

- Wenige lesbare KI-Archetypen: offensiv, defensiv,
  objective-orientiert und Allrounder.
- Unterschiede nur bei Position, Risiko, Objective-Priorität,
  Ressourcenverhalten und Reaktion auf Teamkommandos.
- Nach dem ersten relevanten Rivalensieg: Kandidaten verstehen, einen Rivalen
  wählen oder aktuellen Wingman behalten; spätere Änderung im Teammanager.
- Recruitment ist eine Spielerfreischaltung, keine Transfersimulation.

### Abnahmekriterien

- Archetypen sind in manuellen Matches wahrnehmbar.
- Keine versteckten Stat- oder Waffenboni.
- Save-, Roster- und Teamregeln bleiben stabil.
- Jeder Archetyp kann in allen Release-Modi sinnvoll handeln.

## Phase 5 – Proving Circuit validieren

**Status:** `PLANNED`

### Testaufbau

- ungefähr 10–15 neue Spieler, Desktop, ohne Erklärung durch Beobachter;
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

Testfragen, Stichprobe und Erfolgsschwellen werden vor dem ersten externen Test
versioniert festgelegt, damit das Gate nicht nachträglich passend gemacht wird.

## Phase 6 – Karriereumfang entscheiden

**Status:** `PLANNED`

### Variante A – Kleine erste Veröffentlichung

- Qualifier, drei Proving-Matches, ein Recruitment-Moment;
- Quick Start und Custom Match;
- geschlossener, hochwertiger kleiner Release statt künstlicher Länge.

### Variante B – Vollständige V1-Karriere

Nur nach positivem Phase-5-Gate:

- Contender und Apex mit jeweils drei bis vier Matches;
- insgesamt ungefähr neun bis zwölf Karriere-Matches;
- stärkere Gegner durch bessere Entscheidungen, nicht Statboni;
- weitere Rivalen und Recruitment-Entscheidungen;
- vorhandene Maps und Modi wiederverwenden.

Coming-soon-Circuits werden erst als spielbar bezeichnet, wenn sie vollständig
implementiert und abgenommen sind.

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
| Drei Matches wirken zu kurz | Kleine V1 gegen Karriereausbau anhand Daten entscheiden | Phase 6 |
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
| 2026-08-28 | Diese Datei wird kanonische Roadmap. | Eine fortgeschriebene Quelle verhindert widersprüchliche To-do-Listen. |
| 2026-08-28 | Desktop-first, Mobile experimentell erhalten. | Präzisionssteuerung ist releasefähig; Touch bleibt eine Option ohne aktuelles Versprechen. |
| 2026-08-28 | Qualifier vor Karriereausbau. | Verständnis und Combat müssen vor zusätzlicher Länge bewiesen werden. |
| 2026-08-28 | Contender/Apex nur nach Phase-5-Gate. | Content ersetzt keine Produktvalidierung. |
| 2026-08-28 | Audio ausschließlich in Phase 9. | Fokus halten und Rechte-/Mixarbeit einmal systematisch abschließen. |

## Änderungsverlauf

| Datum | Änderung |
| --- | --- |
| 2026-08-28 | Kanonische Roadmap angelegt; Phase 0 aktiviert; Phasen 1–9, Gates und Audioausschluss festgelegt. |
