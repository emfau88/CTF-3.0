# Phase 6 – Karriereausbau, Variante B

## Status und Auftrag

- Stand: 2026-09-04.
- Status: `PLANNED` – ausführbarer Plan erstellt, Umsetzung noch nicht begonnen.
- Übergeordnete Quelle: [kanonische Release-Roadmap](../CORE_ARENA_RELEASE_ROADMAP.md).
- Gewählte Richtung: erst Contender und sechs zusammenhängende Matches,
  danach Apex und Abschluss nur nach bestandenem Zwischen-Gate.
- Aktiver Auftrag: Planung und Dokumentation; keine Spiellogikänderung,
  Veröffentlichung oder vorweggenommene Abnahme.
- Startpunkt bei späterer Umsetzungsfreigabe: **Bulk 0**.

Dieser Plan konkretisiert Phase 6. Er ersetzt weder die Release-Roadmap noch
deren Phase-5-, RC-, Rechte- oder Audio-Gates. Ein Bulk ist ein abgegrenztes
Arbeitspaket mit prüfbarem Ergebnis, kein Versprechen eines ungeprüften
Durchlaufs bis zum Release.

## 1. Verbindlicher Umfang und Planannahmen

Vom Nutzer gewählte Richtung ist Variante B in Etappen. Die folgenden
Detailregeln sind konkrete Planfestlegungen, nicht bereits vorhandenes
Spielverhalten. Insbesondere Vier-Team-Circuits, Wiederholungsregeln und die
Bot-Abstufung werden vor Implementierungsbeginn in Bulk 0 sichtbar bestätigt.

### Zielbild

- Proving bleibt als bestehender Drei-Match-Einstieg erhalten.
- Contender ergänzt drei Matches und einen weiteren Recruitment-Moment.
- Erst nach der Sechs-Match-Abnahme ergänzt Apex drei Matches und einen
  echten Karriereabschluss.
- Damit hat der erfolgreiche Weg **neun gewertete Matches: 3 + 3 + 3**.
  Qualifier und notwendige Wiederholungsversuche zählen nicht zu diesen neun.
- Jeder Circuit umfasst das Spielerteam und drei Rivalenteams, jeder spielt
  einmal gegen jeden. Pro Runde gibt es ein Spielermatch und ein simuliertes
  Parallelmatch. Sechs Teilnehmer würden fünf Spielermatches bedeuten und
  gehören ausdrücklich nicht zu diesem Plan.
- Bestehende drei Premium-Arenen, drei Modi, sechs Teams, Figuren,
  Embleme und vier KI-Archetypen werden wiederverwendet.
- Quick Start, Custom Match, Qualifier und Hybridsteuerung bleiben erhalten.

### Bewusst nicht enthalten

Keine neuen Waffen, Arenen, Modi, Figuren-Assets, Statboni, Charakterlevel,
Wirtschaft, Transfersimulation, Multiplayer, Accounts oder Cloud Saves.
Kein zusätzlicher Knockout-Cup, keine endlose Karriere, keine große
Storykampagne, kein allgemeiner Menü-/CSS-Rewrite. Keine Audioarbeit;
auch vorhandener Audio-WIP bleibt bis Phase 9 unberührt.

## 2. Feste Spiel- und Fortschrittsregeln

### Aufstieg, Scheitern und Abschluss

1. Proving und Contender: die ersten zwei Plätze der abgeschlossenen Tabelle
   qualifizieren für den nächsten Circuit. Nur drei Matches gespielt zu haben
   reicht nicht. Die vorhandene Punkte- und Tie-Break-Reihenfolge bleibt
   erhalten, einschließlich der normierten Wertung verschiedener Modi.
2. Nach dem letzten Match zuerst Resultat und eventuell offene
   Recruitment-Entscheidung abschließen. Danach zeigt das HQ die Endtabelle
   und einen eindeutigen Button für den nächsten Schritt.
3. Bei Qualifikation startet erst der bewusste Klick den nächsten Circuit.
   Er beginnt mit neuer Tabelle, neuen Circuit-Statistiken und eindeutigem
   Versuchsschlüssel; Teamidentität, Wingman und Freischaltungen bleiben.
4. Bei Platz 3 oder 4 kann nur der aktuelle Circuit erneut gespielt werden.
   Vorher erreichte Stufen und Freischaltungen gehen nicht verloren. Der neue
   Versuch erhält einen neuen Seed; Reload eines Versuchs würfelt nichts neu.
5. Apex: Platz 1 nach dem dritten Apex-Match gewinnt den Titel. Plätze 2–4
   erhalten eine ehrliche Abschlusswertung und können Apex erneut versuchen.
   Das Finale ist das letzte reguläre Apex-Match, kein zehntes Zusatzmatch.
   Der Titel folgt der Gesamttabelle, nicht allein dem Sieg im letzten Match.
6. Nach dem Titel bleiben Abschluss und Zusammenfassung lesbar. Eine neue
   Karriere startet nur nach Bestätigung wieder in Proving; Profil und
   freigeschaltete Wingmen bleiben erhalten. Es entsteht kein Endlosmodus.
7. Solange Apex noch nicht freigegeben ist, bleibt ein bestandener Contender
   gespeichert: „Für Apex qualifiziert – noch nicht verfügbar“. Nach dessen
   Freigabe ist kein erneuter Contender-Durchlauf erforderlich.

### Recruitment und Teamkontinuität

- Jeder Sieg über ein Rivalenteam schaltet weiterhin dessen beide Figuren
  als Spielerkopien frei. Der originale Rivalenkader bleibt unverändert.
- Beim ersten Sieg je Circuit gibt es höchstens einen hervorgehobenen
  Auswahlmoment: bisherigen Wingman behalten oder einen der zwei Rivalen
  wählen. Eine bereits getroffene Circuit-Entscheidung wird bei Wiederholung
  desselben Circuits nicht erneut erzwungen.
- Der zweite Moment in Contender ist an einen Sieg gebunden, kein Geschenk
  für Niederlagen. Ohne Sieg keine neue Rekrutierung. Bereits freigeschaltete
  Kandidaten werden als verfügbar, nicht als neu freigeschaltet bezeichnet.
- Der Teammanager zeigt auch Contender-/Apex-Kandidaten samt verständlicher
  Freischaltbedingung. Ein Wechsel ist zwischen Matches weiterhin möglich.
- Rollenbeschreibungen und kurze Gegnerhinweise erklären, warum beispielsweise
  ein Objective-Wingman in einem Flaggenmatch interessant ist. Keine
  vorgetäuschte optimale Wahl und keine exklusiven Statvorteile.

### Matchplan als überprüfbarer Ausgangspunkt

Die neuen Kombinationen sind Planwerte. Ihre Spielbarkeit und Bot-Navigation
müssen geprüft werden; die Tabelle ist kein Balance-Nachweis.

| Match | Circuit | Gegner | Arena | Modus | Gegnerprofil |
| --- | --- | --- | --- | --- | --- |
| 1 | Proving | Grave Circuit | Helix Canopy | TDM | `normal` |
| 2 | Proving | Neon Phantoms | Temple of the Drowned Sun | One Flag | `normal` |
| 3 | Proving | Crimson Jackals | Foundry Circuit | Classic CTF | `normal` |
| 4 | Contender | Solar Wardens | Helix Canopy | One Flag | `normal` |
| 5 | Contender | Grave Circuit | Foundry Circuit | TDM | `normal` |
| 6 | Contender | Void Runners | Temple of the Drowned Sun | Classic CTF | `strong` |
| 7 | Apex | Neon Phantoms | Foundry Circuit | One Flag | `strong` |
| 8 | Apex | Solar Wardens | Temple of the Drowned Sun | TDM | `strong` |
| 9 | Apex | Void Runners | Helix Canopy | Classic CTF | `strong` |

- Alle Matches bleiben 2v2. Eigener Wingman bleibt auf `normal` mit seinem
  gewählten Archetyp. TDM-Ziel 10, Flaggenziel 3; bestehende Zeitregeln bleiben.
- Schwierigkeit nutzt ausschließlich vorhandene Profile: Entscheidungen,
  Reaktion, Zielverhalten und Zusammenarbeit; kein Lebenspunkte-, Schadens-
  oder Geschwindigkeitsbonus. Kein neues Zwischenprofil oder verstecktes
  dynamisches Hochskalieren. Schwierigkeit im Briefing anzeigen.
- Contender führt zwei bisher nur angekündigte Teams ein; der Rückkampf
  gegen Grave Circuit und Void Runners als wiederkehrender Schlussgegner
  schaffen Zusammenhang ohne neue Storymechanik.
- Der aktuelle Spielplangenerator liefert für `[Spieler, A, B, C]` die
  Gegnerreihenfolge `C, B, A`. Die Implementierung muss die Tabelle explizit
  testen, statt eine Reihenfolge aus der Teamliste anzunehmen.
- Bei einem unfairen Schwierigkeitssprung zuerst innerhalb der bestehenden
  Profile nachjustieren und erneut testen; kein Ausbau an einem roten Gate vorbei.

## 3. Technischer Befund und Zielstruktur

Geprüfter Repository-Stand am 2026-08-31:

| Bereich | Heute | Notwendige Änderung |
| --- | --- | --- |
| Circuit-Katalog | Contender/Apex sind Präsentation; Contender nennt sechs Teams | Datengetriebene Vier-Team-Circuits; Verfügbarkeit von Spielerqualifikation trennen |
| Saison | Ein Proving-Versuch, `promoted` nur Ergebnisinformation | Karrierehülle mit aktuellem Circuit, Versuchen und echten Aufstiegsregeln |
| Disziplinen | `foundersCircuitDiscipline` begrenzt Indizes auf die drei Proving-Matches | Ein circuitabhängiger Resolver für Route, Simulation, Tabelle, Statistiken und UI |
| Save | Version 2, genau vier Teams und drei Runden | Versionierte Migration, ohne alte Daten oder offene Entscheidungen zu verlieren |
| Profil | Separater V1-Save mit Identität, Auswahl und Freischaltungen | Freischaltungen über alle Circuits erhalten; konsistente Wingman-Auswahl |
| HQ/Teammanager | Proving fest verdrahtet; gesperrte Figuren nur aus Proving | Aktueller Circuit, echte nächste Aktion und vollständiger Kandidatenkatalog |
| Ergebnisroute | Saison-, Match-, Runden- und Gegner-ID | Zugehörigkeit zum gespeicherten Circuit-Versuch und dessen Match prüfen |
| Browser-E2E | Echte Matchstarts, aber synthetisch ausgelöste Endergebnisse | Weiterhin Flow-Nachweis; zusätzlich reale Match-/Bot-Prüfung und Owner-Abnahme |

### Kleine, klare Verantwortlichkeiten

- `leagueCatalog.ts`: Circuit-ID, Teams, drei Disziplinen, Gegnerprofile,
  Aufstiegs-/Titelregel; keine DOM-Abhängigkeit.
- `leagueSeason.ts`: einzelne Circuit-Tabelle, Matches, Simulation und
  Statistik; bestehende Proving-Regeln und deterministische Ergebnisse sichern.
- Neues kleines `leagueCareer.ts`: Start, Resultatannahme, Bestätigung,
  Recruitment, Wiederholung, Aufstieg und Abschluss als testbare Operationen.
- `leagueStorage.ts`: V3-Validierung, Migration und sichere Persistenz.
- `leagueRoute.ts`: Route aus dem gespeicherten nächsten Match ableiten;
  keine Freischaltung durch Query-Parameter.
- `leagueMenu.ts`: Darstellung und Aktionen auf Basis desselben Zustands.
  Ein kleiner abgeleiteter HQ-Zustand ersetzt verstreute Proving-Sonderfälle;
  kein pauschales Zerlegen oder Neuschreiben des gesamten Menüs.
- `ReleaseProfile`: freigegebene Circuit-IDs statt eines globalen „current“.
  Proving zuerst, Contender erst nach seinem technischen Gate, Apex erst nach
  Bulk 4 und seiner eigenen Implementierungsabnahme aktivieren.

Die Karrierehülle hält einen aktiven Circuit-Versuch, je Circuit die
Versuchsnummer, Qualifikation/Ergebnis und bereits getroffene
Recruitment-Entscheidung sowie erhaltene Freischaltungen. Abgeschlossene
qualifizierende Circuits bleiben als Ergebnis-Snapshots erhalten. Für
Fehlversuche genügen Zähler und letzte Zusammenfassung; kein unbegrenztes Archiv.
Match-IDs sind nur zusammen mit eindeutigem Circuit-Versuch gültig.

## 4. Save- und Rückrollkonzept

### Migration und Fehlerverhalten

- Neuer Karriere-Save unter `core-arena.league.v3`. Der bisherige
  `core-arena.league.v2` bleibt als unveränderter Migrationsausgangspunkt
  erhalten; kein laufendes Dual-Write alter und neuer Karriereformate.
- Vor der ersten Migration zusätzlich das vorhandene Profil unter
  `core-arena.career-profile.v1.pre-league-v3` einmalig sichern. Ist eine
  erforderliche Sicherung oder der neue Save nicht schreibbar: Migration
  abbrechen, Ursprungsdaten erhalten und verständlichen Fehler zeigen.
- Bestehende aktive Proving-Saison bleibt derselbe Versuch: Seed, Ergebnisse,
  nächste Runde, Kader, Statistiken und offenes Resultat/Recruitment erhalten.
  Abgeschlossene Top-2-Saison wird als qualifiziert übernommen; Platz 3/4
  bietet Wiederholung. Kein automatischer Aufstieg während der Migration.
- Migration muss wiederholbar ohne Doppeleffekte sein. Ein gültiger V3-Save
  gewinnt beim Laden vor V2. Ein beschädigter oder unbekannt neuer V3-Save
  darf nicht still auf V2 oder eine frische Karriere zurückfallen.
- Fehler anzeigen und Daten erhalten; Neustart/Wiederherstellung nur bewusst
  nach Sicherung und Bestätigung. Kein unaufgefordertes Löschen von localStorage.
- Validierung prüft IDs, Teilnehmer, Spielplan, Ergebnis-/Rundenkonsistenz,
  endliche zulässige Zahlen, Qualifikation, Auswahlen und offene Entscheidungen.
  Unbekannte Circuit-/Match-IDs oder widersprüchliche Ergebnisse sind kein
  Anlass, Fortschritt zu erfinden.

### Ein Ergebnis darf nur einmal zählen

- Eine Karriereoperation erzeugt erst einen vollständigen nächsten Zustand.
  Danach wird dieser in einem V3-Save geschrieben; erst nach Erfolg gilt die
  Aktion in UI/Navigation als abgeschlossen. Keine Teilmutation des noch
  nicht erfolgreich gespeicherten Zustands.
- V3 ist führend für Karrierefortschritt, aktuellen Wingman und verdiente
  Freischaltungen. Bestehende Profil-Freischaltungen werden übernommen.
  Identität/Kosmetik bleiben im Profil; dessen Auswahl-/Unlock-Spiegel wird
  nach erfolgreichem V3-Write aktualisiert und beim Laden abgeglichen.
- Ein gescheiterter Profil-Spiegel darf weder das bereits gespeicherte Match
  doppelt zählen noch Freischaltungen verlieren. Synchronisierung erneut
  versuchen und Fehler kenntlich machen. Teammanager-Auswahlen nutzen
  denselben gespeicherten Karrierepfad, nicht zwei unabhängige Schreibwege.
- Vor dem Speichern aktuellen Versuch und nächste Begegnung erneut prüfen.
  Doppelklick, doppelte Resultate, Browser-Zurück und ein alter Match-Tab
  dürfen weder einen Aufstieg duplizieren noch einen neueren Save überschreiben.
  Konkurrierende Schreibzugriffe im Browser serialisieren und die gespeicherte
  Revision innerhalb dieses Schutzes prüfen; bloßes vorheriges Lesen genügt
  nicht. Ist das nicht zuverlässig möglich, nur einen schreibenden Karriere-Tab
  zulassen. Ein veralteter Schreibversuch wird abgewiesen.

### Was ein Rückgängig-Machen leisten kann

- Code: kleine geprüfte Commits ermöglichen später einen gezielten
  `git revert`; ein Push allein veröffentlicht diesen Branch noch nicht.
  Eine öffentliche Rücknahme benötigt ebenfalls Merge/Deploy.
- Browserdaten: ein Code-Revert setzt localStorage nicht zurück. Alter Code
  versteht V3 nicht. Vor einem Downgrade den aktuellen V3- und Profilstand
  separat sichern; V2 plus Profil-Backup stellen nur den Stand vor der
  Migration wieder her. Später erspielter Fortschritt wird nicht automatisch
  in das alte Format zurückübersetzt.
- Lokaler Testserver und GitHub Pages haben getrennte Browser-Spielstände;
  auch `localhost` und `127.0.0.1` sind unterschiedliche Origins. Tests finden
  in isolierten Testprofilen statt, nicht durch Löschen des echten Saves.
- Wiederherstellung wird mit Testdaten geprobt und dokumentiert. Keine große
  Cloud-/Importplattform im Rahmen dieser Phase.

## 5. Abarbeitung in Bulks

Alle Pakete stehen zunächst auf `PLANNED`. Reihenfolge strikt einhalten;
ein rotes Gate wird korrigiert, nicht durch mehr Content übergangen.
„Commitpunkt“ bezeichnet einen geprüften, sinnvoll einzeln versionierbaren
Stand. Commit, Push, PR, Merge und Deploy erfordern den entsprechenden
Umsetzungs-/Veröffentlichungsauftrag; dieser Plan löst sie nicht aus.

### Bulk 0 – Startbasis und Proving-Gate

**Voraussetzung:** Umsetzungsfreigabe für diesen Plan.

- Aktiven Ordner, Branch, Diff, Nutzer-WIP und aktuellen Remote-/Main-Stand
  prüfen. Integrationsbasis ist nach grüner PR-#6-CI der Merge-Commit
  `3f6d88b`; `codex/phase-6-career-expansion` wurde direkt davon angelegt.
  Vor Bulk 1 Remote und Branch trotzdem erneut prüfen. Keine Arbeit auf dem
  weiterhin veralteten lokalen `main`.
- Isolierte Save-Fixtures/Tests vorbereiten. Bestehende Suite, Typecheck,
  Build und E2E als frische Baseline ausführen.
- Phase-5-Solo-Abnahme protokollieren: zwei vollständige echte
  Proving-Durchläufe, davon einer frisch und einer mit Unterbrechung/Resume;
  Steuerung, Ergebnisfluss, Recruitment und Weiterspielwunsch prüfen.
  Bereits belegte gleichwertige Durchläufe müssen nicht wiederholt werden.
- Owner bestätigt den tragfähigen Grundloop und die Detailregeln aus diesem
  Plan. Externe Spieler sind kein Beschaffungshindernis für die Entwicklung;
  fehlende unabhängige First-Run-Evidenz bleibt aber offen und wird nicht
  durch Bot- oder E2E-Tests als erledigt markiert.

**Fertig wenn:** technische Baseline grün, keine Save-/Flow-Blocker,
Owner-Go für Contender dokumentiert. Phase-5-Entwicklungsfreigabe und noch
offene externe Releasevalidierung ausdrücklich unterscheiden.

**Commitpunkt:** dokumentierte Startbasis; danach bei Freigabe
`codex/phase-6-career-expansion` vom geprüften integrierten Stand.

### Bulk 1 – Circuit-Modell ohne Spielverhaltensänderung

**Voraussetzung:** Bulk 0 bestanden.

- Circuit-Definitionen, Typen, Versuchsschlüssel und gemeinsamen
  Disziplinresolver einführen; alle bisherigen Verbraucher umstellen.
- Proving unverändert über dieses Modell betreiben. Contender-/Apex-Struktur
  in Tests vorbereiten, noch keine neuen Circuits in der Spieloberfläche öffnen.
- Spielplangenerator, vier eindeutige Teilnehmer, drei Gegner pro Spieler,
  sechs Gesamtbegegnungen pro Circuit und normierte Tie-Breaks testen.
- Bestehende Proving-Seeds, Roster- und Statistikzuordnung gegen Regression
  absichern; Indizes außerhalb des Circuits nicht still auf die letzte Runde klemmen.

**Dateien:** `src/meta/league/{leagueTypes,leagueCatalog,leagueSeason,leagueRoute,index}.ts`,
`src/leagueMenu.ts`, bestehende League-/Roster-/Orientierungstests.

**Fertig wenn:** alte Karriere gleich funktioniert; alle Modelltests,
Typecheck, Build und Proving-E2E grün. Keine Vorschau behauptet Spielbarkeit.

**Commitpunkt:** datengetriebenes Circuit-Fundament.

### Bulk 2 – Karriereoperationen und sichere V3-Saves

**Voraussetzung:** Bulk 1 bestanden.

- Karrierehülle und Regeln aus Abschnitten 2/4 implementieren: Resultat,
  Recruitment, Bestätigung, Aufstieg, Wiederholung und Abschluss.
- V2→V3-Migration samt Profil-Backup und Fehlerzuständen implementieren;
  bestehenden Proving-Flow auf den getesteten Speicherpfad umstellen.
- Resultatannahme in `src/main.ts` sowie Teammanager mit genau diesem Pfad
  verbinden. Alte/ungültige Matchrouten verständlich ins HQ zurückführen,
  ohne Ergebnis zu buchen oder Fortschritt zu löschen.
- Tests für Migration aktiv/abgeschlossen, Top 2/Nichtqualifikation,
  pending Recruitment, nur Niederlagen, offene letzte Ergebnisansicht,
  ungültiges JSON, unbekannte Version, Schreibfehler, doppelte Aktionen und
  konkurrierenden alten Tab ergänzen.
- Gegen Testspeicher eine Wiederherstellung des alten Standes proben.

**Dateien:** `src/meta/league/leagueCareer.ts` (neu), League-Typen/-Storage/-Route,
`src/careerProfile.ts`, `src/main.ts`, `src/leagueMenu.ts`, neue
`tests/league-career.test.ts` und `tests/league-storage-migration.test.ts`.

**Fertig wenn:** Proving weiterhin vollständig spielbar; Migration verliert
keine Daten; Fehler erzeugen keinen leeren Ersatzsave oder doppelten Fortschritt.
Neue Circuits bleiben für Spieler noch gesperrt.

**Commitpunkt:** getestete Karriere- und Save-Grundlage.

### Bulk 3 – Contender als vollständiger spielbarer Abschnitt

**Voraussetzung:** Bulk 2 bestanden.

- Matches 4–6 nach Tabelle konfigurieren; Route und Runtime laden dieselben
  Modi, Arenen, Ziele, Teams, Archetypen und Schwierigkeitsprofile.
- Proving→Contender mit Endtabelle, Aufstiegsbutton und gespeicherten
  Freischaltungen durchgängig verbinden. Zweiten Recruitment-Moment ergänzen.
- HQ, Fortschrittsanzeige, Tabelle, Teammanager und DE/EN-Texte aus dem aktiven
  Circuit ableiten. Alte Sechs-Team-/`+4`-Ankündigung entfernen.
- Alle Zustände unterscheiden: nicht implementiert, noch nicht qualifiziert,
  startbereit, aktiv, qualifiziert, nicht qualifiziert und abgeschlossen.
  In diesem Slice bleibt Apex ehrlich nicht verfügbar.
- Bestehende lokale Produkt-Events um Circuit/Versuch sowie eindeutige
  Aufstiegs-/Abschlussnachweise ergänzen; keine externe Analytics-Anbindung.
- Contender erst nach technischen Prüfungen im Entwicklungsbuild freigeben.

**Dateien:** League-Katalog/-Career/-Route, `src/leagueMenu.ts`,
`src/uiLocale.ts`, `src/platform/{releaseProfile,productEvents}.ts`, bei Bedarf
gezielte Änderungen an `index.html`, Styles und Gameplay-Adapter;
`tests/e2e/career-flow.spec.ts` erweitern.

**Fertig wenn:** Matches 1–6 ohne URL-Eingriff erreichbar, Aufstieg und
Nichtqualifikation korrekt, Recruitment/Resume intakt, Apex nicht vorzeitig
startbar. Vollständige automatische Gates grün; echte Canvas-Starts und
Bot-Läufe für die drei neuen Arena-/Modus-Kombinationen geprüft.

**Commitpunkt:** technisch abgenommener Sechs-Match-Slice; noch kein Apex-Go.

### Bulk 4 – Sechs-Match-Prüfpunkt, Pflichtstopp vor Apex

**Voraussetzung:** Bulk 3 bestanden.

- Neue Karriere und migrierte Karriere bis Contender-Ende prüfen,
  einschließlich Niederlage, Unentschieden, Nichtqualifikation/Wiederholung,
  Wingman behalten/wechseln und Reload vor/nach Aufstieg.
- Automatisierten Sechs-Match-Flow und reproduzierbare Bot-/Modus-Checks
  ergänzen. Synthetische Resultate bleiben als solche gekennzeichnet.
- Owner spielt einen vollständigen realen Sechs-Match-Weg; zusätzlich den
  Contender-Abschnitt nach Unterbrechung erneut aufnehmen. Fehlversuche sind
  Ergebnisse, kein Grund, nur einen erfolgreichen Test zu protokollieren.
- Vorab feste Produktfragen: Ist der nächste Schritt ohne URL/Erklärung
  klar? Fühlen sich Matches 4–6 ausreichend anders und fair an? Ist die
  Wingman-Wahl verständlich und nützlich? Besteht Lust auf die letzten drei?

**Gate bestanden nur wenn:** keine offenen Save-/Softlock-/Progressionsfehler,
keine blockierenden Konsolenfehler, technische Suite grün und ausdrückliches
Owner-Go nach dem realen Durchlauf. Kein geforderter Mindest-Winrate-Wert aus
einer Ein-Personen-Stichprobe; Produkturteil und Testgrenzen offen dokumentieren.

**Bei Rot:** nur gefundene Probleme in Steuerung, Flow, Bots oder Darstellung
bearbeiten, dann erneut prüfen. Bei fehlendem Owner-Test auf `VALIDATION`
bleiben und Bericht übergeben. **Apex nicht automatisch anschließen.**

**Commitpunkt:** Sechs-Match-Abnahmebericht bzw. klar dokumentierter offener
Prüfpunkt; Roadmap und dieses Dokument konsistent aktualisieren.

### Bulk 5 – Apex und echter Karriereabschluss

**Voraussetzung:** Bulk 4 bestanden und Apex-Fortsetzung freigegeben.

- Matches 7–9 ergänzen, vorhandene Aufstiegs-/Recruitment-Pfade wiederverwenden.
  Bereits gespeicherte Contender-Qualifikation berechtigt zum Einstieg.
- Schwierigkeit und die drei verbleibenden Arena-/Modus-Kombinationen prüfen.
- Apex-Endtabelle, Titel/Nichttitel, lesbare Zusammenfassung aller drei
  Circuits sowie Wiederholung/Neustart mit Bestätigung implementieren.
- Keine Behauptung eines Titelgewinns allein wegen „Match 9 beendet“.
  Keine Endlosschleife zurück in den bereits verbuchten Abschluss.
- Apex erst nach technischen Gates als spielbar freigeben; Coming-soon-Texte
  nur dort entfernen, wo tatsächlich implementierter Inhalt vorhanden ist.

**Dateien:** dieselben gezielten Career-/Katalog-/UI-/Locale-/Profilpfade;
Neun-Match-E2E und Abschluss-/Reload-/Titeltests.

**Fertig wenn:** neun Matches, Titel und Nichttitel jeweils nachvollziehbar;
Saves bleiben bei Abschluss, Wiederholung und neuer Karriere konsistent;
automatische Gates und echte Starts/Bot-Läufe grün.

**Commitpunkt:** technisch vollständige Neun-Match-Karriere.

### Bulk 6 – Gesamtabnahme und Integrationsübergabe

**Voraussetzung:** Bulk 5 bestanden.

- Vollständige Testmatrix unten ausführen; mindestens einen vollständigen
  echten Neun-Match-Weg durch den Owner abnehmen lassen. Fehlschläge und
  Wiederholungen berücksichtigen; keine behauptete Abnahme durch Testevents.
- Migrierten V2-Save bis Apex-Abschluss führen, V3-Reloads, Rückrollprobe und
  begrenzte Historie prüfen. Chrome/Edge, DE/EN, kleine/große Desktopansicht,
  Fokusverlust und Hybridsteuerung regressionsprüfen.
- Geänderte Dateien selektiv prüfen; Nutzer-WIP einschließlich Audio bleibt
  außerhalb. Roadmap, Evidenz, offene Risiken und Integrationsstatus eintragen.
- Bei autorisiertem Commit/Push/PR: CI abwarten, Branch/Commit nennen und
  „im Branch“, „in main“ und „auf Pages veröffentlicht“ getrennt nachweisen.
  Merge/Deploy nicht aus einem bloßen Plan- oder Testauftrag ableiten.

**Fertig wenn:** Phase-6-Kriterien tatsächlich belegt und Owner-Abnahme
vorhanden. Sonst `VALIDATION`, nicht `COMPLETE`. Phase 7 ist danach der nächste
Roadmap-Schritt; Phase 8/9 und externe Releasevalidierung sind nicht erledigt.

**Commitpunkt:** abgenommene Phase 6 mit fortgeschriebenen Dokumenten.

## 6. Teststandard und Evidenz

Pro Implementierungsbulk gezielte neue Tests plus bestehende Regressionen;
vor jedem technischen Bulk-Abschluss:

```powershell
npm.cmd test
npm.cmd run test:typecheck
npm.cmd run build
npm.cmd run test:e2e
```

Zusätzlich ab Bulk 3 reale Canvas-/Browserprüfungen und deterministische
Bot-Läufe der neuen Kombinationen. Vorhandene Auditwerkzeuge unter
`scripts/run-premium-bot-audit.ts` und `tests/premium-bot-audit.ts` nutzen;
Parameter vor Aufruf prüfen. Der vollständige 270-Match-RC-Audit bleibt
Phase 8 und wird durch kleinere Entwicklungschecks nicht ersetzt.

| Prüfebene | Mindestabdeckung |
| --- | --- |
| Regeln | Vier-Team-Spielplan; alle drei Modi; normierte Tie-Breaks; Top 2; Apex-Platz 1; Wiederholung ohne Verlust voriger Stufen |
| Recruitment | Erster Sieg pro Circuit; behalten/wechseln; keine Pflichtwiederholung nach Retry; kein Sieg; bereits freigeschaltet; Rivalenkopie und teambezogene Stats |
| Saves | V2 aktiv/abgeschlossen/Recruitment offen; Profilübernahme; V3 laden; korrupte/unbekannte Daten; Write-Fehler; kein stiller Reset; Backup und Wiederherstellung |
| Konsistenz | Doppelklick/Resultat; Reload an Übergängen; alte URLs/Tabs; Weitergabe falscher Circuit-, Match- oder Gegnerdaten; kein doppelter Aufstieg |
| Browser-Flow | Frische/migrierte sechs und später neun Matches; Nichtqualifikation/Retry; Qualifikation bei noch gesperrtem Apex; Titel/Nichttitel; echter HQ-Einstieg |
| Gameplay | Alle neun Arena-/Modus-Kombinationen; korrekte Ziele, Archetypen und Teamprofile; echte Lauf-/Objective-Funktion statt nur ausgelöstem Endevent |
| Produkt | Owner-Durchläufe, sichtbare nächste Aktion, sinnvolle Rollenwahl, faire Steigerung, Motivation; externe First-Run-Evidenz weiterhin separat |
| Regression | Qualifier, Quick Start, Custom Match, Hybridsteuerung, DE/EN, Desktop-Layout, Fokus/Pause; keine Audioänderung |

Testbericht nennt immer Datum, Commit/Arbeitsstand, Befehl, Ergebnis und Art
des Nachweises: automatisiert, synthetischer Flow, echter Browsercheck oder
Owner-Spieltest. Historische 238 Checks/13 E2E vom 2026-08-30 sind nur die
damalige Baseline, kein neuer Lauf für diesen Plan.

## 7. Fortschritt und Wiederaufnahme

| Bulk | Status | Ergebnis / noch offen |
| --- | --- | --- |
| 0 – Startbasis/Proving-Gate | `IN PROGRESS` | PR #6 als `3f6d88b` integriert und auf Pages veröffentlicht; 238 Tests, Typecheck, Build und 13 E2E lokal/PR grün; ein Pages-E2E-Flake bestand beim Retry; Stabilitätsprüfung und Owner-Freigabe offen |
| 1 – Circuit-Modell | `PLANNED` | Noch keine Implementierung |
| 2 – Karriere/Saves | `PLANNED` | Noch keine Implementierung |
| 3 – Contender | `PLANNED` | Noch keine Implementierung |
| 4 – Sechs-Match-Gate | `PLANNED` | Pflichtprüfung vor Apex |
| 5 – Apex/Abschluss | `PLANNED` | Nur nach Bulk 4 und Freigabe |
| 6 – Gesamtabnahme | `PLANNED` | Danach Phase 7, kein automatischer Release |

Am Ende jedes Bulks hier eintragen: bearbeitete Dateien/Commit, grüne und
offene Tests, Save-Auswirkungen, Owner-Abnahme, nächste konkrete Aktion.
Bei Unterbrechung zusätzlich uncommitted Arbeit und letzten tatsächlich
bestandenen Test nennen. Beim Wiederaufnehmen zuerst Status/Diff prüfen;
nichts aus einer bloßen früheren Absicht als erledigt übernehmen.

Aktueller Wiederaufnahmepunkt: **Bulk 0; Integration und Pages-Deploy
abgeschlossen. Vor Bulk 1 den einmaligen Karriere-E2E-Flake prüfen und danach
Owner-/Produktabnahme bestätigen.**

Planprüfung am 2026-08-31: lokale Dokumentlinks und Codeblock-Paare geprüft,
sieben Bulk-Abschnitte mit sieben `PLANNED`-Einträgen sowie neun eindeutige
Arena-/Modus-Kombinationen bestätigt; Diff-/Whitespace-Check ohne Fehler.
Keine Spieltests neu ausgeführt, da ausschließlich Markdown geändert wurde.

## Änderungsprotokoll

| Datum | Änderung |
| --- | --- |
| 2026-09-04 | Öffentlichen Stand nach Deploy #53 direkt geprüft: Hauptmenü lädt und die deutsche Hilfe beschreibt Mausrad, Linksklick und Direktfeuer-Kürzel korrekt. Rubrik 1 ist damit technisch integriert/veröffentlicht; Bulk 0 bleibt wegen Flake-Prüfung und Owner-Produktgate `IN PROGRESS`. |
| 2026-09-04 | Pages-Deploy #53 für `3f6d88b` erfolgreich in 3:58 Minuten. Build und Deploy bestanden; Karriere-E2E einmal flaky und beim Retry bestanden (`12 passed`, `1 flaky`). Öffentliche Veröffentlichung bestätigt, Flake vor Bulk 1 beobachten. |
| 2026-09-04 | PR #6 bestand die GitHub-CI, wurde als `3f6d88b` in `main` integriert und GitHub-seitig als `Merged` bestätigt. Phase-6-Branch direkt darauf angelegt; Pages-Deploy und Owner-Go bleiben als getrennte Gates offen. |
| 2026-09-04 | Bulk 0 begonnen: `origin/main` und Featurebranch geprüft; Nutzer-WIP abgegrenzt; 238/238 Tests, Typecheck, isoliert wiederholter Build und 13/13 Browser-E2E bestanden. Hybridsteuerung `37e197f` ist noch nicht in `main`, Owner-Go noch offen. |
| 2026-08-31 | Variante B in sieben prüfbare Bulks gegliedert; 3+3+3-Match-Scope, Aufstieg/Retry/Titel, Recruitment, V3-Migration und Sechs-Match-Gate festgelegt. Nur Dokumentation geändert. |
