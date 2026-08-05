# CTF-3.0 Audit — Zweitprüfung und Umsetzungsstatus

Stand: 2026-08-05

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
| Difficulty-Profile existieren, erreichen das Produkt aber nicht | Bestätigt und offen | `createArenaBotControllerGroup` besitzt weiterhin keinen Difficulty-Parameter; die Controller erhalten an den entsprechenden Positionen `undefined` und verwenden damit Normal. |
| Lange Positionsargumentlisten der Controller | Bestätigt und offen | Die Factory erzeugt TDM-, Classic-CTF- und One-Flag-Controller weiterhin über lange Argumentlisten. Benannte Optionsobjekte sind noch nicht umgesetzt. |
| Premium-Bot-Audit ist nützlich, aber kein menschlicher Qualitätstest | Bestätigt | Die Testinfrastruktur ist wertvoll. Plausibilität, Fairness und Lesbarkeit benötigen weiterhin einen echten Spieltest. |
| Historische 4v4-Warnungen in Temple/Foundry | Historischer Befund, neu zu messen | Der gespeicherte 270-Match-Bericht stammt vom 2026-07-19 und bezog sich auf Commit `72be4a9` in einem dirty Worktree. Nach Helix und den derzeit separat vorliegenden Runtime-Änderungen ist ein sauberer Vergleichslauf erforderlich. |
| Helix-Seitenverhältnis 2:1 vs. Master 1,725 | Bestätigt und dokumentiert | Das Masterbild bleibt unverzerrt und wird auf Welthöhe skaliert. Die seitlichen Weltstreifen sind absichtlich blockierter Außenraum; HUD-freie 16:9-Aufnahmen können zusätzlich letterboxen. |
| Helix mit 50 gestuften Solids | Überholt | Der alte Wert war korrekt. Die aktive v2.1 besitzt 32 Solids und wesentlich einfachere Innenformen. |
| Helix ist besonders registrierungsempfindlich | Für den alten Stand bestätigt | v2.1 reduziert dieses Risiko deutlich: einfache Planter, native Masterkoordinaten, Collision-/Clearance-Aufnahmen und feste Walkability-Tests für die DNA-Glasfläche. Der projektweite Vertrag bleibt offen. |
| Temple hat den saubersten Bild-/Welt-Fit | Weiterhin plausibel | In Phase 0 visuell erfasst; an Temple wurde in Phase 1 nichts geändert. |
| Foundry zuerst auf 4v4 und CPU untersuchen | Weiterhin sinnvoll | Nach Difficulty-Wiring und einem sauberen Audit-Lauf bleibt Foundry der erste Kandidat für gezielte Profilierung. |
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

## Einordnung meiner bisherigen Kommentare

Meine vorherige Einschätzung zum Fremdaudit lässt sich so zusammenfassen:

- Die Diagnose war überwiegend korrekt und ungewöhnlich konkret; sie hat vorhandene Systeme nicht mit fehlender Produktreife verwechselt.
- Die höchste technische Rendite liegt weiterhin beim Difficulty-Wiring, nicht bei einer neuen Bot-KI.
- Die roten Rechtecke in den Helix-Aufnahmen sind Debug-Kollision, keine beabsichtigten sichtbaren Spielelemente.
- Viele kleine Rechtecke können organische Silhouetten approximieren, erhöhen aber Authoring-, Test- und Lesbarkeitskosten. Für Helix war ein neues, kollisionsfreundliches Master deshalb sinnvoller als weiteres Nachschärfen des alten Bildes.
- Ein Screenshot allein definiert keine Laufwege. Verlässlichkeit entsteht erst aus Screenshot, expliziten Routen-/Clearance-Tests und anschließendem Spieltest.
- Das Helix-Redesign ist eine lokale, überprüfbare Verbesserung und kein Ersatz für einen gemeinsamen Produktionsvertrag aller Premium-Maps.

## Empfohlene nächste Schritte

### 1. Helix subjektiv abnehmen

Ein kurzer manueller Test sollte Classic CTF, One Flag und TDM jeweils in 2v2 sowie mindestens einen 4v4-Lauf abdecken. Bewertet werden nur:

- erkennt man die DNA ohne Erklärung sofort als begehbaren Boden;
- sind Nord-, Mittel- und Südroute im Kampf unterscheidbar;
- entsteht an Planterecken unerwartetes Hängenbleiben;
- stimmen sichtbare Basen, Pickups und tatsächliche Interaktionsorte;
- wirkt die Karte in 1024×768 und 1920×1080 weder leer noch überladen.

### 2. Difficulty bis ins Produkt verdrahten

Die Factory sollte auf ein benanntes Eingabeobjekt umgestellt werden, beispielsweise `ArenaBotControllerGroupOptions` mit `modeId`, `map`, `participants`, `humanActorIds` und `difficulty`. Die ausgewählte Difficulty muss anschließend explizit an jeden Controller und dessen Combat-/Target-Komponenten weitergereicht werden.

Akzeptanzkriterien:

- Factory-Tests beweisen Casual, Normal und Strong ohne Rückfall auf Defaultwerte.
- Quick Play besitzt eine sichtbare Auswahl; für die Liga wird eine bewusste feste oder fortschrittsabhängige Regel dokumentiert.
- Schaden, Bewegungsgeschwindigkeit, Teamwissen und Objective-Regeln bleiben identisch. Nur Wahrnehmung, Reaktion, Commit-Zeiten, Jitter und Vorhersage variieren.

### 3. Premium-Audit sauber neu baselinen

Nach dem Difficulty-Wiring und nach Trennung der derzeitigen unabhängigen Runtime-WIP-Änderungen wird der vollständige 270-Match-Audit auf einem dokumentierten, sauberen Commit ausgeführt. Der Bericht wird mit dem Lauf vom 2026-07-19 verglichen; besonders Temple/Foundry Classic CTF 4v4 und Foundry CPU-p95 werden isoliert betrachtet.

### 4. Gemeinsamen Registrierungsvertrag einführen

Vor einem großen Editor genügt eine kleine gemeinsame Schicht:

- ein wiederverwendbarer Masterbild-Transform statt map-spezifischer Skalierungsformeln;
- acht bis zwölf benannte Landmarken pro Premium-Map;
- pro Landmarke Masterpunkt, Weltpunkt, erwartete Begehbarkeit und Deckungsart;
- ein maschinenlesbares Registrierungsmanifest plus automatisch erzeugte Debugansicht;
- anschließend ein Graph-Gate für mindestens zwei unabhängige Wege von jeder Basis zum zentralen Objective.

Erst wenn diese kleine Lösung unzureichend ist, sollte SVG, LDtk oder Tiled als Authoringquelle bewertet werden.

### 5. Niedrig priorisierte Wartung

- Optional ausdrücken, dass Premium-Kosmetik und -Licht absichtlich partielle Konfigurationen sind, statt Vollständigkeit durch den Typ zu suggerieren.
- Das bekannte Vite-Bundle-Warning separat behandeln; es ist weder Ursache noch Blocker der Map- oder Botprobleme.

## Vorgesehener Commit-Umfang

Der Helix-/Audit-Commit soll ausschließlich Phase 0, Phase 1 und diese Audit-Dokumentation enthalten. Bereits vorher vorhandene, sachlich unabhängige Änderungen an Combat, Modi, Runtime, Charakteranimationen, Porträts und Audio bleiben ungestaged. Damit bleibt der veröffentlichte Commit überprüfbar und vermischt das Map-Redesign nicht mit anderen Gameplay-Fixes.
