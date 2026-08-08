# CTF-3.0 Audit — Zweitprüfung und Umsetzungsstatus

Stand: 2026-08-08

Bezugsdokument: [CTF-3.0_Audit.md](CTF-3.0_Audit.md)

Audit-Quelle: unveränderte Kopie der vom Nutzer bereitgestellten Datei; SHA-256 der Projektkopie entspricht der Quelldatei.

## Kurzurteil

Die Kernaussage des Audits bleibt richtig: CTF besitzt bereits eine starke technische Grundlage und sollte gezielt verbessert, nicht neu gebaut werden. Besonders zutreffend sind die Hinweise auf das tote Difficulty-Wiring, die schwer lesbaren Positionsargumente der Bot-Controller und die fehlende gemeinsame semantische Quelle für Bild und Kollision.

Zwei Punkte müssen inzwischen aktualisiert werden:

1. Helix wurde bewusst neu aufgebaut. Das war als begrenzter Zwischenschritt vertretbar, weil die neue Grafik von Anfang an einfache rechteckige Gameplay-Hindernisse verwendet und ihre Innenkollision direkt in Masterbild-Pixeln authored wird. Der allgemeine semantische Vertrag für alle Premium-Maps ist damit aber noch nicht gelöst.
2. Die im Audit genannten 50 Helix-Solids beschreiben den alten Stand. Helix Canopy v2.1 verwendet 32 Solids einschließlich des geschlossenen Außenrahmens und nur zehn einfache Innenplanter plus zwei Helix-Terminals.

## Status der Audit-Aussagen

| Thema | Bewertung | Stand 2026-08-05 |
| --- | --- | --- |
| Technische Basis statt Neubau | Bestätigt | Phaser/TypeScript, Map-Verträge, Bot-KI, Tests und Diagnostik sind substanziell. Ein Rewrite wäre weiterhin nicht gerechtfertigt. |
| Drei Premium-Maps | Bestätigt | Helix Canopy, Temple of the Drowned Sun und Foundry Circuit bleiben die drei Premium-Maps. Es wurde keine vierte Map hinzugefügt. |
| Zwei Wahrheiten: Masterbild und Kollision | Bestätigt, teilweise entschärft | Das Grundproblem besteht projektweit. Helix v2.1 verwendet für die Innenhindernisse nun Masterbild-Pixel plus dieselbe Skalierung/Offset-Transformation wie der Renderer. Temple und Foundry besitzen weiterhin eigene Projektionen. |
| Mathematisches Qualitätsgate beweist keine visuelle Lesbarkeit | Bestätigt, teilweise ergänzt | Phase 0 und Phase 1 ergänzen Screenshot-, Collision- und Clearance-Evidenz. Eine automatisierte semantische Pixelprüfung existiert noch nicht. |
| Difficulty-Profile existieren, erreichen das Produkt aber nicht | Bestätigt und umgesetzt | Quick Play übergibt nun getrennte Team-Schwierigkeiten bis an Combat und Target Selection jedes Bots. Zusätzlich unterstützt die Factory einzelne Actor-Overrides. |
| Lange Positionsargumentlisten der Controller | Bestätigt, teilweise umgesetzt | Die öffentliche Factory verwendet jetzt `ArenaBotControllerGroupOptions`. Die langen Controller-Konstruktoren bleiben intern gekapselt; deren eigene Umstellung ist nur noch Wartungsarbeit, kein Produkt-Wiring-Risiko. |
| Premium-Bot-Audit ist nützlich, aber kein menschlicher Qualitätstest | Bestätigt | Die Testinfrastruktur ist wertvoll. Plausibilität, Fairness und Lesbarkeit benötigen weiterhin einen echten Spieltest. |
| Historische 4v4-Warnungen in Temple/Foundry | Historischer Befund, neu zu messen | Der gespeicherte 270-Match-Bericht stammt vom 2026-07-19 und bezog sich auf Commit `72be4a9` in einem dirty Worktree. Nach Helix und den derzeit separat vorliegenden Runtime-Änderungen ist ein sauberer Vergleichslauf erforderlich. |
| Helix-Seitenverhältnis 2:1 vs. Master 1,725 | Bestätigt und dokumentiert | Das Masterbild bleibt unverzerrt und wird auf Welthöhe skaliert. Die seitlichen Weltstreifen sind absichtlich blockierter Außenraum; HUD-freie 16:9-Aufnahmen können zusätzlich letterboxen. |
| Helix mit 50 gestuften Solids | Überholt | Der alte Wert war korrekt. Die aktive v2.1 besitzt 32 Solids und wesentlich einfachere Innenformen. |
| Helix ist besonders registrierungsempfindlich | Für den alten Stand bestätigt | v2.1 reduziert dieses Risiko deutlich: einfache Planter, native Masterkoordinaten, Collision-/Clearance-Aufnahmen und feste Walkability-Tests für die DNA-Glasfläche. Der projektweite Vertrag bleibt offen. |
| Temple hat den saubersten Bild-/Welt-Fit | Weiterhin plausibel | In Phase 0 visuell erfasst; an Temple wurde in Phase 1 nichts geändert. |
| Foundry zuerst auf 4v4 und CPU untersuchen | Weiterhin sinnvoll | Nach einem sauberen Audit-Lauf bleibt Foundry der erste Kandidat für gezielte Profilierung. |
| Allgemeiner Graphvertrag für alternative Wege fehlt | Bestätigt und offen | Es existieren Routen- und Stichprobentests, aber noch kein generisches Disjoint-Path-/Chokepoint-Gate für jede Premium-Map. |
| Kosmetik-/Lichttypen sind vollständiger als ihre Konfiguration | Bestätigt, geringe Priorität | Helix ist in den zulässigen Typen enthalten, besitzt aber bewusst keine aktive Premium-Kosmetik oder Beleuchtung. Das ist aktuell kein Gameplay-Problem. |
| Keine neue KI, kein ML, kein 3D-Navmesh, kein großer Editor | Bestätigt | Diese Maßnahmen wären weiterhin unverhältnismäßig. |

## Bereits umgesetzt

### Phase 0 — reproduzierbare Ausgangslage

- Alle drei Premium-Maps wurden in denselben Viewports und Spielzuständen aufgenommen.
- Pro Map existieren saubere Übersicht, Gameplay-Aufnahmen sowie Collision- und Clearance-Diagnostik.
- Manifest, URLs, Hashes, Browserdiagnostik und der damalige Worktree-Stand wurden gespeichert.
- Ablage: [Phase-0-QA](../qa/phase-0-2026-08-05/README.md).
- Reproduktion: `scripts/capture-phase-0-baseline.mjs`.

### Phase 1 — Helix Canopy v2.1

- Die alte Helix-Grafik wurde **nicht gelöscht**: `public/assets/helix-canopy/arena-master.png` bleibt als Rückfalloption erhalten.
- Das Spiel lädt ausschließlich `public/assets/helix-canopy/arena-master-v2.png`.
- In Quick Play wird ausschließlich die passende neue Vorschau `public/assets/map-previews/helix-canopy-v2-1-overview.png` gezeigt.
- Die Map-ID bleibt `helix-canopy-v2`; es gibt keinen zweiten oder versteckten Legacy-Eintrag in der normalen Mapauswahl.
- Zehn rechteckige Innenplanter ersetzen die schwer registrierbaren organischen Hindernisgruppen.
- Die DNA ist ein klarer, begehbarer Unterglas-Bodenstreifen. Nur die sichtbar erhöhten Endterminals blockieren.
- Basen, Spawns, Flaggenringe, Diagnose-Spawn und Bot-Routen wurden an die gezeichneten Teamplattformen ausgerichtet.
- Innenkollision wird in nativen Masterbild-Pixeln definiert und über dieselbe Höhen-Skalierung und denselben horizontalen Offset wie die Grafik in Weltkoordinaten transformiert.
- `mapPreview=1` kann nun zusätzlich Collision- oder Clearance-Diagnostik ohne Gameplay-HUD rendern.
- 200/200 Tests, Typecheck, Production-Build und 3/3 Premium-Arena-E2E-Tests bestanden. Acht finale Phase-1-Aufnahmen enthalten keine Browserfehler oder fehlgeschlagenen Requests.
- Design, Bildgeneration, verworfene Variante, Kollisionsvertrag und Restbeobachtungen: [Phase-1-QA](../qa/phase-1-helix-v2-1/README.md).
- Reproduktion: `scripts/capture-phase-1-helix.mjs`.

### Phase 2 — Bot-Schwierigkeit und freie Teamgrößen

- Quick Play bietet für das eigene und das gegnerische Team getrennte Bot-Anzahlen und die Stufen Easy, Normal und Hard an.
- Asymmetrische Aufstellungen sind möglich, beispielsweise Spieler plus zwei Hard-Bots gegen drei Easy-Bots.
- Routen speichern `blueBots`, `redBots`, `blueBotDifficulty` und `redBotDifficulty`; bestehende `teamSize`-Links bleiben abwärtskompatibel.
- Roster und World-State unterstützen getrennte Teamgrößen von 1 bis 4.
- `ArenaBotControllerGroupOptions` ersetzt die fehleranfällige öffentliche Positionsargumentliste und reicht die gewählten Profile an TDM, Classic CTF und One Flag weiter.
- Team-Vorgaben können intern pro Bot über `difficultyByActorId` überschrieben werden. Die Quick-Play-Oberfläche bleibt bewusst bei einer Stufe pro Team, damit die Konfiguration schnell lesbar bleibt.
- Liga-Partien verwenden vorerst bewusst das unveränderte Normal-Profil, solange keine Progressionsregel beschlossen wurde.
- Schaden, Bewegungsgeschwindigkeit und Objective-Regeln bleiben unverändert.
  Phase 2 verband zunächst Wahrnehmung, Reaktion, Zielwechsel, Jitter und
  Vorhersage; Phase 6 ergänzt darauf aufbauend die strategischen Unterschiede.
- 205/205 Tests, Test-Typecheck, Production-Build und 4/4 Browser-E2E-Tests bestanden; Desktop- und Kompaktansicht wurden zusätzlich visuell geprüft.

### Phase 3 — synchroner Match-Start, Mobile-HUD und Runtime

- Der beobachtete Start-Freeze ist durch einen echten zweisekündigen Match-Countdown ersetzt: Spieler, Bots, Weltzeit, Matchzeit und Spawn-Schutz stehen gemeinsam still und starten danach im selben Simulationsframe.
- Mobile Waffen-Buttons folgen nun dem Waffenroster der ausgewählten Map. Auf Helix erscheinen Arc Lash, Rail, Pulse und Shard statt der vorher fest verdrahteten Rocket-/Rail-Auswahl.
- Der Mobile-Aktionsbereich wurde ausschließlich für Touch-Steuerung neu geordnet: kleinerer Jump-Button am unteren rechten Rand, kompakter Waffenbogen mit getrennten vergrößerten Touchflächen und kein Fullscreen-Schalter im Kampfbereich.
- Mobile Utility-Leiste und Match-HUD sitzen kompakt am oberen Rand. Das Xeno-Runner-Statusfeld ist mobil ausgeblendet.
- Das Mobile-Combat-Log wurde auf zwei Zeilen mit jeweils 168 × 19 Pixel reduziert und unter die rechte Utility-Leiste verschoben. Desktop bleibt unverändert.
- Die Mobile-Kamera verwendet nun eine nähere 1120-×-640-Sichtfläche und eine zeitbasierte, direktere Folgereaktion. Spawn, Respawn und Teleports rasten ohne langsame Kamerafahrt ein; die Desktop-Sichtfläche bleibt unverändert.
- Die bisherige Hochformat-Sperre der Menüs ist entfernt. Hauptmenü, Quick Play und League verwenden im Hochformat denselben äußeren vertikalen Scroller mit Safe-Area-Abständen und kollisionsfreier Kopfzeile.
- Wiederholtes Vector-Redrawing für Actor-Status, Spawn-Schutz, Pickup-Status und Waffen-HUD wurde zustandsbasiert gedrosselt; Spawn-Pad-Partikel verwenden einen Sprite-Pool.
- Im reproduzierbaren SwiftShader-4v4-Vergleich sank die Main-Thread TaskDuration um rund 15 % und ScriptDuration um rund 19,8 %. Software-WebGL bleibt trotzdem ein realistischer Ruckel-Risikofall; als nächste Stufe ist Geräteprofiling vorgesehen.
- 220/220 Tests, Test-Typecheck, Production-Build und 8/8 Browser-E2E-Tests bestanden. Helix lud in TDM, Classic CTF und One Flag mobil ausschließlich das neue Masterbild; Hauptmenü und Quick Play wurden zusätzlich auf 390 × 844 geprüft.
- Evidenz und Reproduktion: [Phase-3-QA](../qa/phase-3-mobile-runtime/README.md).

### Phase 4 — Pickup-Ökonomie und Waffenlesbarkeit

- Health-Pickups heilen nun feste 75 Punkte.
- Jede Premium-Map besitzt als gemeinsame Ausgangsbasis vier Health-, zwei
  Armor- und fünf Waffen-Pickups. Beide Basisseiten erhalten Health, Armor und
  mindestens zwei erreichbare Waffenoptionen; die Mitte bleibt umkämpft.
- Grenade und Shardcaster verwenden eigene Pickup-/HUD-Grafiken. Das sichtbare
  Shard-Projektil ist etwas größer und seine Zielsuche geringfügig stärker,
  ohne Schaden oder Kollisionsradius zu erhöhen.
- Mobile Waffenbuttons übernehmen weiterhin direkt das Waffenroster der Map.
  Die automatische Touch-Erkennung steuert nun zusätzlich dieselbe kompakte
  HTML-Utility-Leiste wie die Phaser-Steuerung.
- Die technische Verteilung ist umgesetzt. Die aktuellen Positionen wurden als
  belastbare Ausgangsbasis angenommen und als Pickup-Landmarken registriert.
- 210/210 Tests, Test-Typecheck und Production-Build bestehen. Der bestehende
  Mobile-E2E-Vertrag verwendet nun `Auto detect` auf einem Touch-Kontext, damit
  Phaser-Steuerung und HTML-Utility-Leiste nicht wieder auseinanderlaufen.

### Phase 5 — Gemeinsamer Registrierungsvertrag

- Helix, Temple und Foundry verwenden denselben zentrierten Masterbild-Transform
  für Renderer und Landmarken. Map-spezifische Skalierungsformeln entfallen.
- Jede Premium-Map besitzt zwölf benannte Landmarken: zwei Basen, ein zentrales
  Objective, wichtige Routen-/Deckungspunkte und sieben feste Pickup-Anker.
- Das automatische Qualitätsgate prüft Anzahl, eindeutige IDs, Projektion,
  Begehbarkeit, Deckungsart und die Verbindung zum tatsächlichen Pickup.
- `mapPreview=1&landmarkDebug=1` zeigt die Registrierung ohne Kosten im normalen
  Match. Die Bots konsumieren diese Semantik noch nicht; dadurch ändert Phase 5
  allein weder Schwierigkeit noch Laufverhalten.

### Phase 6 — spürbare Bot-Stufen und Landmark-Strategie

- Easy, Normal und Hard unterscheiden sich nun nicht nur bei Reaktion und Aim,
  sondern auch nachvollziehbar bei Teamkoordination, Ressourcenplanung,
  Landmark-Routing und Jump-Link-Nutzung.
- Easy spielt Ziele unabhängiger, sucht nur in Notlagen Health und verwendet
  grundsätzlich keine Jump-Links.
- Normal koordiniert Rollen und Gegner, nimmt moderate Ressourcenumwege und
  verwendet Sprünge nur, wenn sie trotz Sicherheitsaufschlag der bessere Weg
  sind.
- Hard verteilt Bots über Nord-, Mittel- und Südlandmarken, reserviert aktive
  Pickups innerhalb des Teams und bevorzugt sichere Sprungabkürzungen.
- Kritische Flaggenaufgaben wie Capture, Recovery, Escort und Interception
  werden nie durch einen Pickup- oder Landmark-Umweg verdrängt.
- Schaden, Bewegung, Health, Armor und Waffenwerte bleiben auf allen Stufen
  identisch; die Unterschiede entstehen ausschließlich durch Entscheidungen.
- Der Premium-Audit erzeugt seine Navigatoren nun mit denselben Normal-Regeln
  wie das Spiel und misst dadurch keine veraltete Standardkonfiguration mehr.
- 216/216 Tests, Test-Typecheck und Production-Build bestehen. Eine kurze
  4v4-Matrix über alle Premium-Maps und Modi meldete keine kritischen Befunde
  und keine Warnungen; die gemessenen Decision-CPU-p95-Werte lagen zwischen
  1,56 und 3,01 ms pro Simulationsframe.

## Einordnung meiner bisherigen Kommentare

Meine vorherige Einschätzung zum Fremdaudit lässt sich so zusammenfassen:

- Die Diagnose war überwiegend korrekt und ungewöhnlich konkret; sie hat vorhandene Systeme nicht mit fehlender Produktreife verwechselt.
- Die höchste technische Rendite lag beim Difficulty-Wiring, nicht bei einer neuen Bot-KI; dieses Wiring ist in Phase 2 umgesetzt.
- Die roten Rechtecke in den Helix-Aufnahmen sind Debug-Kollision, keine beabsichtigten sichtbaren Spielelemente.
- Viele kleine Rechtecke können organische Silhouetten approximieren, erhöhen aber Authoring-, Test- und Lesbarkeitskosten. Für Helix war ein neues, kollisionsfreundliches Master deshalb sinnvoller als weiteres Nachschärfen des alten Bildes.
- Ein Screenshot allein definiert keine Laufwege. Verlässlichkeit entsteht erst aus Screenshot, expliziten Routen-/Clearance-Tests und anschließendem Spieltest.
- Das Helix-Redesign ist eine lokale, überprüfbare Verbesserung und kein Ersatz für einen gemeinsamen Produktionsvertrag aller Premium-Maps.

## Empfohlene nächste Schritte

### 1. Difficulty und Landmark-Routing subjektiv abnehmen

Die technische Anbindung ist abgeschlossen und deterministisch abgesichert.
Als Nächstes sollten dieselben kurzen TDM-, Classic-CTF- und One-Flag-Matches
jeweils mit Easy, Normal und Hard gespielt werden. Bewertet werden vor allem:

- Easy springt nie und bleibt sichtbar reaktionsträger;
- Normal springt gelegentlich bei einem klaren Wegvorteil;
- Hard nutzt Sprungabkürzungen und verteilt sich erkennbar besser;
- Hard sammelt Ressourcen cleverer, ohne Objectives oder den Menschen zu
  benachteiligen;
- keine Stufe bleibt an einer Landmarke oder einem Pickup hängen.

### 2. Helix subjektiv abnehmen

Ein kurzer manueller Test sollte Classic CTF, One Flag und TDM jeweils in 2v2 sowie mindestens einen 4v4-Lauf abdecken. Bewertet werden nur:

- erkennt man die DNA ohne Erklärung sofort als begehbaren Boden;
- sind Nord-, Mittel- und Südroute im Kampf unterscheidbar;
- entsteht an Planterecken unerwartetes Hängenbleiben;
- stimmen sichtbare Basen, Pickups und tatsächliche Interaktionsorte;
- wirkt die Karte in 1024×768 und 1920×1080 weder leer noch überladen.

### 3. Difficulty nach dem Spieltest fein kalibrieren

Nach der subjektiven Abnahme werden nur die Profilwerte angepasst, nicht die
Grundregeln neu gebaut. Besonders relevant sind Pickup-Reichweite,
Health-/Armor-Schwellen und der Sprungkostenfaktor. Erst danach sollte
entschieden werden, ob die Liga dauerhaft Normal verwendet oder die Stufe an
die Progression koppelt.

### 4. Premium-Audit sauber neu baselinen

Difficulty-Wiring sowie Runtime-/Mobile-Arbeit sind inzwischen in getrennten Commits dokumentiert. Nach dem Merge des Feature-Branches wird der vollständige 270-Match-Audit auf dem dokumentierten Merge-Commit ausgeführt. Der Bericht wird mit dem Lauf vom 2026-07-19 verglichen; besonders Temple/Foundry Classic CTF 4v4 und Foundry CPU-p95 werden isoliert betrachtet.

### 5. Registrierungsvertrag zum Routengraph erweitern

Die kleine gemeinsame Schicht ist umgesetzt:

- [x] ein wiederverwendbarer Masterbild-Transform statt map-spezifischer Skalierungsformeln;
- [x] zwölf benannte Landmarken pro Premium-Map;
- [x] pro Landmarke Masterpunkt, Weltpunkt, erwartete Begehbarkeit und Deckungsart;
- [x] ein maschinenlesbares Registrierungsmanifest plus Debugansicht;
- [ ] ein Graph-Gate für mindestens zwei unabhängige Wege von jeder Basis zum zentralen Objective.

Erst wenn diese kleine Lösung unzureichend ist, sollte SVG, LDtk oder Tiled als Authoringquelle bewertet werden.

### 6. Niedrig priorisierte Wartung

- Optional ausdrücken, dass Premium-Kosmetik und -Licht absichtlich partielle Konfigurationen sind, statt Vollständigkeit durch den Typ zu suggerieren.
- Das bekannte Vite-Bundle-Warning separat behandeln; es ist weder Ursache noch Blocker der Map- oder Botprobleme.

## Commit-Trennung

Phase 0, Phase 1, die Combat-/Fairness-Korrekturen, Phase 2 und Phase 3 bleiben in getrennten Commits nachvollziehbar. Bereits vorher vorhandene, sachlich unabhängige Änderungen an Charakteranimationen, Porträts und Audio bleiben weiterhin ungestaged.
